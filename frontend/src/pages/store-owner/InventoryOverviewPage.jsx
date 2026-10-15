import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, Layers, Calendar, ExternalLink, Truck, AlertTriangle } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { inventoryApi } from "../../api/client";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { StatusBadge } from "../../components/StatusBadge";
import { EmptyState } from "../../components/EmptyState";

export const InventoryOverviewPage = () => {
  const { assignedStoreId } = useAuth();
  const storeId = assignedStoreId || "STORE001";

  const [products, setProducts] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("ALL");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [invRes, predRes] = await Promise.all([
          inventoryApi.get(`/api/inventory/${storeId}`),
          inventoryApi.get(`/api/inventory/${storeId}/predictions`),
        ]);
        setProducts(invRes.data);
        setPredictions(predRes.data);
      } catch (err) {
        console.error("Failed to fetch inventory overview:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [storeId]);

  if (loading) return <LoadingSpinner message="Loading store inventory records..." />;

  const predMap = {};
  predictions.forEach((p) => {
    predMap[p.productId] = p;
  });

  const categories = ["ALL", ...new Set(products.map((p) => p.category))];

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.productName.toLowerCase().includes(search.toLowerCase()) ||
      p.productId.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCat === "ALL" || p.category === selectedCat;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Inventory Overview — {storeId}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time stock quantities, batch allocation tracking, and ML coverage classifications.
          </p>
        </div>

        <Link
          to="/owner/replenishment"
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          <Truck className="w-4 h-4" />
          <span>Replenishment Portal</span>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by product name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 shadow-sm"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCat === cat
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      {filtered.length === 0 ? (
        <EmptyState title="No inventory items found" />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Product Info</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Price</th>
                  <th className="py-3 px-4 text-center">Available Stock</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Batches</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const pred = predMap[p.productId];
                  const hasStock = p.totalStock > 0;
                  return (
                    <tr key={p.productId} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{p.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{p.productId}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{p.category}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ${p.price.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-extrabold text-sm ${
                            p.totalStock < 15
                              ? "text-rose-600"
                              : p.totalStock > 100
                              ? "text-blue-600"
                              : "text-slate-800"
                          }`}
                        >
                          {p.totalStock}
                        </span>
                        <span className="text-[10px] text-slate-400 block">units</span>
                      </td>
                      <td className="py-3 px-4">
                        {pred ? (
                          <StatusBadge status={pred.classification} />
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        <div className="font-semibold text-slate-700">{p.batches?.length || 1} batch(es)</div>
                        <div className="text-[10px] text-emerald-600 font-medium">Tracked stock</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/owner/inventory/${p.productId}`}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-semibold transition-colors"
                        >
                          <span>Inspect</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
