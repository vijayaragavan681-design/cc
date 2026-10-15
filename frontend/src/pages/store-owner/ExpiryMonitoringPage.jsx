import React, { useState, useEffect } from "react";
import { CalendarClock, AlertOctagon, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { inventoryApi } from "../../api/client";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { EmptyState } from "../../components/EmptyState";

export const ExpiryMonitoringPage = () => {
  const { assignedStoreId } = useAuth();
  const storeId = assignedStoreId || "STORE001";

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBatches = async () => {
      setLoading(true);
      try {
        const res = await inventoryApi.get(`/api/inventory/${storeId}`);
        setProducts(res.data);
      } catch (err) {
        console.error("Failed to load inventory for expiry monitoring:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBatches();
  }, [storeId]);

  if (loading) return <LoadingSpinner message="Auditing product batch expiry dates..." />;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Extract and categorize all batches
  const allBatches = [];
  products.forEach((p) => {
    (p.batches || []).forEach((b) => {
      const expDate = new Date(b.expiryDate);
      expDate.setHours(0, 0, 0, 0);
      const diffTime = expDate - today;
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      allBatches.push({
        productId: p.productId,
        productName: p.productName,
        category: p.category,
        batchId: b.batchId,
        expiryDate: b.expiryDate,
        quantity: b.quantity,
        daysLeft,
        isExpired: daysLeft < 0,
        isWarning: daysLeft >= 0 && daysLeft <= 7,
      });
    });
  });

  // Sort batches by expiry ascending
  allBatches.sort((a, b) => a.daysLeft - b.daysLeft);

  const expiredList = allBatches.filter((b) => b.isExpired && b.quantity > 0);
  const urgentList = allBatches.filter((b) => b.isWarning && b.quantity > 0);
  const freshList = allBatches.filter((b) => !b.isExpired && !b.isWarning && b.quantity > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Batch Expiry Monitoring — {storeId}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Proactive shelf-life tracking. Enforces FEFO fulfillment and alerts on batches approaching expiry.
        </p>
      </div>

      {/* Summary Alert Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-rose-700">Expired Batches</span>
            <h3 className="text-2xl font-extrabold text-rose-900">{expiredList.length}</h3>
            <span className="text-[10px] text-rose-600 font-bold">Unsellable — Dispose</span>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-amber-700">Expiring in &le; 7 Days</span>
            <h3 className="text-2xl font-extrabold text-amber-900">{urgentList.length}</h3>
            <span className="text-[10px] text-amber-600 font-bold">Priority Markdown</span>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-emerald-700">Fresh Batches</span>
            <h3 className="text-2xl font-extrabold text-emerald-900">{freshList.length}</h3>
            <span className="text-[10px] text-emerald-600 font-bold">&gt; 7 Days Shelf Life</span>
          </div>
        </div>
      </div>

      {/* Expired & Urgent Batches List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
          <CalendarClock className="w-5 h-5 text-amber-600" />
          <span>Priority Batch Timeline (Nearest Expiry First)</span>
        </h2>

        {allBatches.length === 0 ? (
          <EmptyState title="No batches recorded" />
        ) : (
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Batch ID</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4 text-center">Countdown</th>
                  <th className="py-3 px-4 text-center">Batch Quantity</th>
                  <th className="py-3 px-4">Action / Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allBatches.map((b) => (
                  <tr
                    key={`${b.productId}-${b.batchId}`}
                    className={`hover:bg-slate-50/50 ${b.isExpired ? "bg-rose-50/30" : ""}`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{b.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{b.productId}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">{b.batchId}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{b.expiryDate}</td>
                    <td className="py-3 px-4 text-center">
                      {b.isExpired ? (
                        <span className="font-extrabold text-rose-600">Expired</span>
                      ) : b.daysLeft === 0 ? (
                        <span className="font-extrabold text-rose-600">Today</span>
                      ) : (
                        <span
                          className={`font-extrabold ${
                            b.daysLeft <= 7 ? "text-amber-600" : "text-emerald-700"
                          }`}
                        >
                          {b.daysLeft} days
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      {b.quantity} units
                    </td>
                    <td className="py-3 px-4">
                      {b.isExpired ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          Remove & Audit
                        </span>
                      ) : b.daysLeft <= 3 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Urgent: Markdown
                        </span>
                      ) : b.daysLeft <= 7 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Warning Window
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Optimal
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
