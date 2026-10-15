import React, { useState, useEffect } from "react";
import { History, Package, DollarSign, Calendar, ShoppingBag } from "lucide-react";
import { retailApi } from "../../api/client";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { EmptyState } from "../../components/EmptyState";

export const PurchaseHistoryPage = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await retailApi.get("/api/billing/my-bills");
        setBills(res.data);
      } catch (err) {
        console.error("Error fetching purchase history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) return <LoadingSpinner message="Aggregating purchase history..." />;

  // Aggregate items across all customer bills
  const itemMap = {};
  let totalSpent = 0;
  let totalUnits = 0;

  bills.forEach((b) => {
    totalSpent += b.totalAmount;
    b.items.forEach((item) => {
      totalUnits += item.quantity;
      if (!itemMap[item.productId]) {
        itemMap[item.productId] = {
          productId: item.productId,
          productName: item.productName,
          totalQty: 0,
          totalSubtotal: 0,
          lastBought: b.saleTimestamp,
          storeId: b.storeId,
        };
      }
      itemMap[item.productId].totalQty += item.quantity;
      itemMap[item.productId].totalSubtotal += item.subtotal;
    });
  });

  const purchasedProducts = Object.values(itemMap).sort((a, b) => b.totalQty - a.totalQty);

  return (
    <div className="py-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Purchase History & Analytics
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Summary of your lifetime grocery purchases and frequently bought products.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Spent</p>
            <h3 className="text-2xl font-extrabold text-slate-900">${totalSpent.toFixed(2)}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Units Purchased</p>
            <h3 className="text-2xl font-extrabold text-slate-900">{totalUnits} units</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <History className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Orders Placed</p>
            <h3 className="text-2xl font-extrabold text-slate-900">{bills.length}</h3>
          </div>
        </div>
      </div>

      {/* Aggregated Items Table */}
      {purchasedProducts.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No purchase logs found"
          description="Purchase products to start tracking your purchase trends."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-900">
            Frequently Purchased Products
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Product ID</th>
                <th className="py-3 px-4 text-center">Total Units Bought</th>
                <th className="py-3 px-4 text-right">Total Spent</th>
                <th className="py-3 px-4 text-right">Last Purchased</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchasedProducts.map((p) => (
                <tr key={p.productId} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-800">{p.productName}</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{p.productId}</td>
                  <td className="py-3 px-4 text-center font-extrabold text-slate-800">{p.totalQty}</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-700">
                    ${p.totalSubtotal.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-500">{p.lastBought}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
