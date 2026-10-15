import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Layers,
  AlertTriangle,
  CalendarClock,
  Sparkles,
  TrendingUp,
  Truck,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Search,
  Check,
  Send,
  HelpCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { useAuth } from "../../auth/AuthContext";
import { inventoryApi, warehouseApi } from "../../api/client";
import { MetricCard } from "../../components/MetricCard";
import { StatusBadge } from "../../components/StatusBadge";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { Modal } from "../../components/Modal";

export const StoreDashboardPage = () => {
  const { assignedStoreId } = useAuth();
  const storeId = assignedStoreId || "STORE001";

  const [loading, setLoading] = useState(true);
  const [runningModel, setRunningModel] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [warehouseRequests, setWarehouseRequests] = useState([]);
  const [error, setError] = useState(null);

  // Product Status Table Filter & Search
  const [productSearch, setProductSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Replenishment Modal State
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedProductForRequest, setSelectedProductForRequest] = useState(null);
  const [requestedStockCount, setRequestedStockCount] = useState(50);
  const [suggestedStockCount, setSuggestedStockCount] = useState(50);
  const [requestReason, setRequestReason] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestSuccessNotice, setRequestSuccessNotice] = useState(null);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [invRes, predRes, alertRes, reqRes] = await Promise.all([
        inventoryApi.get(`/api/inventory/${storeId}`),
        inventoryApi.get(`/api/inventory/${storeId}/predictions`),
        inventoryApi.get(`/api/inventory/${storeId}/alerts`),
        warehouseApi.get(`/api/warehouse/requests?store_id=${storeId}`),
      ]);

      setInventory(invRes.data);
      setPredictions(predRes.data);
      setAlerts(alertRes.data);
      setWarehouseRequests(reqRes.data);
    } catch (err) {
      console.error("Dashboard data load error:", err);
      setError(err.response?.data?.detail || "Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [storeId]);

  const handleRunPredictions = async () => {
    setRunningModel(true);
    try {
      const res = await inventoryApi.post(`/api/inventory/${storeId}/predictions/run`);
      setPredictions(res.data);
      const alertRes = await inventoryApi.get(`/api/inventory/${storeId}/alerts`);
      setAlerts(alertRes.data);
    } catch (err) {
      console.error("Prediction run error:", err);
      alert(err.response?.data?.detail || "Failed to trigger prediction job.");
    } finally {
      setRunningModel(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId) => {
    try {
      await inventoryApi.post(`/api/inventory/${storeId}/alerts/${alertId}/acknowledge`);
      setAlerts((prev) =>
        prev.map((a) => (a.alertId === alertId ? { ...a, acknowledged: true } : a))
      );
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
    }
  };

  const openReplenishmentModal = (product) => {
    // Determine current stock and predicted demand
    const currentStock = product.currentStock ?? product.totalStock ?? 0;
    const predDemand = product.predictedDemand7d ?? product.predictedDemand ?? 50;
    
    // AI stock suggestion formula: (Predicted 7d Demand * 1.2 safety factor) - Current Stock
    const suggested = Math.max(15, Math.ceil(predDemand * 1.2 - currentStock));

    setSelectedProductForRequest({
      productId: product.productId,
      productName: product.productName,
      currentStock: currentStock,
      predictedDemand: Math.round(predDemand),
    });
    setSuggestedStockCount(suggested);
    setRequestedStockCount(suggested);
    setRequestReason(`Replenishment to cover 7-day predicted demand (${Math.round(predDemand)} units) with safety buffer.`);
    setRequestModalOpen(true);
  };

  const handleSendReplenishmentRequest = async (e) => {
    e.preventDefault();
    if (!selectedProductForRequest || requestedStockCount <= 0) return;

    setSubmittingRequest(true);
    try {
      await warehouseApi.post("/api/warehouse/requests", {
        storeId: storeId,
        productId: selectedProductForRequest.productId,
        requestedQuantity: Number(requestedStockCount),
        reason: requestReason || "Replenishment requested from Store Owner Dashboard.",
      });

      setRequestModalOpen(false);
      setRequestSuccessNotice(`Replenishment request for ${requestedStockCount} units of ${selectedProductForRequest.productName} submitted successfully!`);
      setTimeout(() => setRequestSuccessNotice(null), 4000);

      // Refresh requests list
      const reqRes = await warehouseApi.get(`/api/warehouse/requests?store_id=${storeId}`);
      setWarehouseRequests(reqRes.data);
    } catch (err) {
      console.error("Replenishment request failed:", err);
      alert(err.response?.data?.detail || "Failed to send replenishment request.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  if (loading) return <LoadingSpinner message="Calculating store metrics and forecast data..." />;

  // Compute metrics
  const totalProducts = inventory.length;
  const totalUnits = inventory.reduce((acc, p) => acc + (p.totalStock || 0), 0);

  const lowStockCount = predictions.filter((p) => p.classification === "LOW").length;
  const excessStockCount = predictions.filter((p) => p.classification === "EXCESS").length;
  const totalPredictedDemand7d = Math.round(
    predictions.reduce((acc, p) => acc + (p.predictedDemand7d || 0), 0)
  );

  const pendingRequestsCount = warehouseRequests.filter((r) => r.status === "PENDING").length;

  // Aggregate Category Chart Data
  const catMap = {};
  predictions.forEach((p) => {
    if (!catMap[p.category]) {
      catMap[p.category] = { category: p.category, currentStock: 0, predictedDemand: 0 };
    }
    catMap[p.category].currentStock += p.currentStock;
    catMap[p.category].predictedDemand += Math.round(p.predictedDemand7d);
  });
  const chartData = Object.values(catMap);

  // Map predictions to inventory items for unified Product Status table
  const predMap = {};
  predictions.forEach((pred) => {
    predMap[pred.productId] = pred;
  });

  const combinedProductList = inventory.map((item) => {
    const pred = predMap[item.productId];
    const classification = pred ? pred.classification : (item.totalStock < 30 ? "LOW" : "NORMAL");
    const predDemand = pred ? pred.predictedDemand7d : Math.round(item.totalStock * 0.8);

    return {
      ...item,
      classification,
      predictedDemand7d: predDemand,
    };
  });

  const filteredProducts = combinedProductList.filter((p) => {
    const matchesSearch =
      p.productName.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.productId.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.classification === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Top Banner and Run Model Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
              {storeId}
            </span>
            <span className="text-xs text-slate-400">• Store Operations & Demand Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Store Owner Dashboard
          </h1>
        </div>

        <button
          disabled={runningModel}
          onClick={handleRunPredictions}
          className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition-all ${
            runningModel
              ? "bg-slate-400 cursor-wait shadow-none"
              : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/25"
          }`}
        >
          <RotateCcw className={`w-4 h-4 ${runningModel ? "animate-spin" : ""}`} />
          <span>{runningModel ? "Running ML Forecasts..." : "Recalculate 7-Day Demand"}</span>
        </button>
      </div>

      {requestSuccessNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs sm:text-sm font-semibold flex items-center space-x-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{requestSuccessNotice}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* 6 Store Operation KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <MetricCard
          title="Total Products"
          value={totalProducts}
          subtitle="Catalog breadth"
          icon={Package}
        />
        <MetricCard
          title="Total Available Stock"
          value={totalUnits}
          subtitle="Total store inventory units"
          icon={Layers}
        />
        <MetricCard
          title="Low-Stock Products"
          value={lowStockCount}
          subtitle="Below safety threshold"
          icon={AlertTriangle}
          badgeText={lowStockCount > 0 ? "Action Required" : "Optimal"}
          badgeColor={lowStockCount > 0 ? "rose" : "emerald"}
        />
        <MetricCard
          title="7-Day Predicted Demand"
          value={totalPredictedDemand7d}
          subtitle="Expected total store sales"
          icon={TrendingUp}
        />
        <MetricCard
          title="Excess Stock Products"
          value={excessStockCount}
          subtitle="Exceeds 21-day coverage"
          icon={Sparkles}
          badgeText={excessStockCount > 0 ? "Overstocked" : "Balanced"}
          badgeColor={excessStockCount > 0 ? "amber" : "slate"}
        />
        <MetricCard
          title="Pending Warehouse Orders"
          value={pendingRequestsCount}
          subtitle="Awaiting warehouse fulfillment"
          icon={Truck}
        />
      </div>

      {/* Demand vs Inventory Chart */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Current Stock vs. 7-Day Forecast by Category
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparison of on-hand inventory units against ML demand forecasts.
            </p>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="category" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              <Bar dataKey="currentStock" name="Available Stock" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="predictedDemand" name="7-Day Predicted Demand" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PRODUCT STATUS TABLE ON DASHBOARD */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Package className="w-5 h-5 text-emerald-600" />
              <span>Product Inventory & Stock Status</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live product stock levels, 7-day ML forecasts, and one-click replenishment requests.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search products..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 focus:bg-white transition-all w-44"
              />
            </div>

            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              {["ALL", "LOW", "NORMAL", "EXCESS"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    statusFilter === st
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Product Name / ID</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Available Stock</th>
                <th className="py-3 px-4 text-center">7-Day Demand</th>
                <th className="py-3 px-4">Stock Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const isLow = p.classification === "LOW";
                return (
                  <tr key={p.productId} className={`hover:bg-slate-50/60 ${isLow ? "bg-rose-50/20" : ""}`}>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{p.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.productId} • ${p.price?.toFixed(2)}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{p.category}</td>
                    <td className="py-3 px-4 text-center font-extrabold text-slate-800 text-sm">
                      {p.totalStock} units
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-indigo-600 text-xs">
                      ~{Math.round(p.predictedDemand7d)} units
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={p.classification} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openReplenishmentModal(p)}
                        className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all shadow-2xs ${
                          isLow
                            ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Request Stock</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Alerts Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <span>Active Inventory & Stock Alerts</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Persistent alerts stored in DynamoDB and synchronized with Amazon SNS.
            </p>
          </div>
          <Link
            to="/owner/alerts"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
          >
            Manage All Alerts →
          </Link>
        </div>

        {alerts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No active alerts. All product inventory levels are optimal.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Product / Alert</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alerts.slice(0, 5).map((a) => (
                  <tr key={a.alertId} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <StatusBadge status={a.severity} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{a.productName || a.productId}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{a.alertType}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{a.description}</td>
                    <td className="py-3 px-4 font-bold text-slate-700">{a.currentStock} units</td>
                    <td className="py-3 px-4">
                      {a.acknowledged ? (
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Acknowledged
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          Unacknowledged
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => openReplenishmentModal(a)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] rounded-lg transition-colors inline-flex items-center space-x-1 shadow-2xs"
                      >
                        <Truck className="w-3 h-3" />
                        <span>Request Stock</span>
                      </button>
                      {!a.acknowledged ? (
                        <button
                          onClick={() => handleAcknowledgeAlert(a.alertId)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition-colors"
                        >
                          Acknowledge
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">✓ Done</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REPLENISHMENT MODAL WITH AI SUGGESTION */}
      {selectedProductForRequest && (
        <Modal
          isOpen={requestModalOpen}
          onClose={() => setRequestModalOpen(false)}
          title={`Request Stock Replenishment — ${storeId}`}
        >
          <form onSubmit={handleSendReplenishmentRequest} className="space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Product:</span>
                <span className="font-bold text-slate-900">{selectedProductForRequest.productName} ({selectedProductForRequest.productId})</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Current Stock on Shelf:</span>
                <span className="font-extrabold text-slate-800">{selectedProductForRequest.currentStock} units</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">7-Day Predicted Demand:</span>
                <span className="font-extrabold text-indigo-600">{selectedProductForRequest.predictedDemand} units</span>
              </div>
            </div>

            {/* AI Stock Suggestion Callout */}
            <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-emerald-900">
                <span className="flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>AI Recommended Stock:</span>
                </span>
                <span className="text-sm font-extrabold text-emerald-700 bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
                  {suggestedStockCount} units
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed mt-1">
                Calculated to cover the 7-day expected sales (~{selectedProductForRequest.predictedDemand} units) plus a 20% safety stock buffer minus current shelf inventory.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Enter Desired Stock Count:
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={requestedStockCount}
                  onChange={(e) => setRequestedStockCount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setRequestedStockCount(suggestedStockCount)}
                  className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold shrink-0 transition-colors"
                >
                  Use Suggested ({suggestedStockCount})
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason / Urgency Note:
              </label>
              <input
                type="text"
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="e.g. Critical low-stock surge or promotion restocking"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setRequestModalOpen(false)}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingRequest}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submittingRequest ? "Sending Request..." : "Send Request to Warehouse"}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
