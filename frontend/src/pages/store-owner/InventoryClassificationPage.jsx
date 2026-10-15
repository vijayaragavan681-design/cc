import React, { useState, useEffect } from "react";
import { SlidersHorizontal, Info, ShieldAlert, CheckCircle2, TrendingUp } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { inventoryApi } from "../../api/client";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { StatusBadge } from "../../components/StatusBadge";

export const InventoryClassificationPage = () => {
  const { assignedStoreId } = useAuth();
  const storeId = assignedStoreId || "STORE001";

  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL");

  useEffect(() => {
    const fetchPredictions = async () => {
      setLoading(true);
      try {
        const res = await inventoryApi.get(`/api/inventory/${storeId}/predictions`);
        setPredictions(res.data);
      } catch (err) {
        console.error("Failed to load inventory classification:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPredictions();
  }, [storeId]);

  if (loading) return <LoadingSpinner message="Calculating classification thresholds..." />;

  const filtered = predictions.filter(
    (p) => activeTab === "ALL" || p.classification === activeTab
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Inventory Classification Policy
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Mathematical rules governing stock tiering (LOW, NORMAL, EXCESS) based on forecast demand and coverage.
        </p>
      </div>

      {/* Mathematical Policy Explanations Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-rose-50/70 border border-rose-200 rounded-3xl p-6 space-y-2">
          <div className="flex items-center space-x-2 text-rose-700 font-bold text-sm">
            <ShieldAlert className="w-5 h-5" />
            <span>LOW Stock Policy</span>
          </div>
          <p className="text-xs text-rose-900/80 leading-relaxed">
            Triggered when <code>Stock &lt; 7d_Demand × 1.2</code>. Available units fail to satisfy forecast demand plus 20% safety margin. Immediate replenishment required.
          </p>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-6 space-y-2">
          <div className="flex items-center space-x-2 text-emerald-700 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            <span>NORMAL Stock Policy</span>
          </div>
          <p className="text-xs text-emerald-900/80 leading-relaxed">
            Stock satisfies forecast demand plus safety buffer, while remaining below 21 days of supply. Working capital and freshness are optimized.
          </p>
        </div>

        <div className="bg-blue-50/70 border border-blue-200 rounded-3xl p-6 space-y-2">
          <div className="flex items-center space-x-2 text-blue-700 font-bold text-sm">
            <TrendingUp className="w-5 h-5" />
            <span>EXCESS Stock Policy</span>
          </div>
          <p className="text-xs text-blue-900/80 leading-relaxed">
            Triggered when <code>Coverage &gt; 21 days</code>. Stock exceeds 3 weeks of estimated sales, risking capital blockage, depreciation, and holding overhead.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        {["ALL", "LOW", "NORMAL", "EXCESS"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab} ({predictions.filter((p) => tab === "ALL" || p.classification === tab).length})
          </button>
        ))}
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Product Name</th>
              <th className="py-3 px-4 text-center">Available Units</th>
              <th className="py-3 px-4 text-center">7-Day Forecast</th>
              <th className="py-3 px-4 text-center">Safety Target</th>
              <th className="py-3 px-4 text-center">Coverage (Days)</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Mathematical Explanation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((p) => (
              <tr key={p.productId} className="hover:bg-slate-50/50">
                <td className="py-3 px-4">
                  <div className="font-bold text-slate-800">{p.productName}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{p.productId}</div>
                </td>
                <td className="py-3 px-4 text-center font-extrabold text-slate-800">
                  {p.currentStock}
                </td>
                <td className="py-3 px-4 text-center font-bold text-slate-700">
                  {p.predictedDemand7d.toFixed(1)}
                </td>
                <td className="py-3 px-4 text-center text-slate-600 font-semibold">
                  {p.safetyStock}
                </td>
                <td className="py-3 px-4 text-center font-bold text-slate-800">
                  {p.coverageDays}d
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={p.classification} />
                </td>
                <td className="py-3 px-4 text-slate-500 max-w-sm leading-relaxed text-[11px]">
                  {p.explanation}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
