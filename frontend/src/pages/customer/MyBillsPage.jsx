import React, { useState, useEffect } from "react";
import { Receipt, ChevronDown, ChevronUp, Calendar, Store, Layers } from "lucide-react";
import { retailApi } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { EmptyState } from "../../components/EmptyState";

export const MyBillsPage = () => {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedBillId, setExpandedBillId] = useState(null);

  useEffect(() => {
    const fetchBills = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await retailApi.get("/api/billing/my-bills");
        setBills(res.data);
      } catch (err) {
        console.error("Failed to load customer bills:", err);
        setError(err.response?.data?.detail || "Failed to load bills.");
      } finally {
        setLoading(false);
      }
    };
    fetchBills();
  }, []);

  const toggleExpand = (saleId) => {
    setExpandedBillId(expandedBillId === saleId ? null : saleId);
  };

  return (
    <div className="py-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          My Bills & Purchase History
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review all your completed purchases, invoices, and batch deduction records.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner message="Retrieving your invoices..." />
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs text-center">
          {error}
        </div>
      ) : bills.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No purchase history"
          description="You have not placed any orders yet. Visit our product catalog to get started."
          actionText="Shop Now"
          onAction={() => (window.location.href = "/products")}
        />
      ) : (
        <div className="space-y-4">
          {bills.map((bill) => {
            const isExpanded = expandedBillId === bill.saleId;
            return (
              <div
                key={bill.saleId}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all"
              >
                {/* Bill Summary Header */}
                <div
                  onClick={() => toggleExpand(bill.saleId)}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-mono font-bold text-slate-900 text-sm">
                        {bill.saleId}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5">
                        <span className="flex items-center space-x-1">
                          <Store className="w-3 h-3 text-slate-400" />
                          <span>{bill.storeId}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{bill.saleTimestamp}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:space-x-6">
                    <div className="text-right">
                      <span className="text-base font-extrabold text-emerald-700 block">
                        ${bill.totalAmount.toFixed(2)}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {bill.items?.length || 0} item(s)
                      </span>
                    </div>

                    <div className="p-1 text-slate-400 hover:text-slate-600">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Item Breakdown */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/40 space-y-3">
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                          <tr>
                            <th className="py-2.5 px-3">Product</th>
                            <th className="py-2.5 px-3 text-center">Qty</th>
                            <th className="py-2.5 px-3 text-right">Unit Price</th>
                            <th className="py-2.5 px-3 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {bill.items.map((it, idx) => (
                            <tr key={idx}>
                              <td className="py-2 px-3">
                                <span className="font-semibold text-slate-800">{it.productName}</span>
                                <span className="text-[10px] text-slate-400 ml-2 font-mono">
                                  ({it.productId})
                                </span>
                                {it.batchDeductions && it.batchDeductions.length > 0 && (
                                  <div className="text-[10px] text-slate-500 mt-0.5">
                                    Batches:{" "}
                                    {it.batchDeductions
                                      .map((b) => `${b.batchId} (${b.quantity}u)`)
                                      .join(", ")}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center font-bold text-slate-700">
                                {it.quantity}
                              </td>
                              <td className="py-2 px-3 text-right text-slate-500">
                                ${it.unitPrice.toFixed(2)}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900">
                                ${it.subtotal.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-500 px-1">
                      <span>Subtotal: ${bill.subtotal.toFixed(2)} | Tax: ${bill.tax.toFixed(2)}</span>
                      <span className="font-bold text-slate-800">
                        Total Amount Paid: ${bill.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
