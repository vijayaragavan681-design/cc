import React, { useState, useEffect } from "react";
import {
  Bell,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  CalendarClock,
  Radio,
  Truck,
  Sparkles,
  Send,
  Check,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { inventoryApi, warehouseApi } from "../../api/client";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { StatusBadge } from "../../components/StatusBadge";
import { EmptyState } from "../../components/EmptyState";
import { Modal } from "../../components/Modal";

export const InventoryAlertsPage = () => {
  const { assignedStoreId } = useAuth();
  const storeId = assignedStoreId || "STORE001";

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState("ALL");

  // Replenishment Modal State
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedAlertForRequest, setSelectedAlertForRequest] = useState(null);
  const [requestedStockCount, setRequestedStockCount] = useState(50);
  const [suggestedStockCount, setSuggestedStockCount] = useState(50);
  const [requestReason, setRequestReason] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [successNotice, setSuccessNotice] = useState(null);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.get(`/api/inventory/${storeId}/alerts`);
      setAlerts(res.data);
    } catch (err) {
      console.error("Failed to load inventory alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [storeId]);

  const handleAcknowledge = async (alertId) => {
    try {
      await inventoryApi.post(`/api/inventory/${storeId}/alerts/${alertId}/acknowledge`);
      setAlerts((prev) =>
        prev.map((a) => (a.alertId === alertId ? { ...a, acknowledged: true } : a))
      );
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
      alert(err.response?.data?.detail || "Acknowledgment failed.");
    }
  };

  const openStockRequestModal = (alertItem) => {
    const currentStock = alertItem.currentStock || 0;
    const predDemand = alertItem.predictedDemand || 50;

    // AI recommendation: (7-Day Demand * 1.2 buffer) - Current Stock
    const suggested = Math.max(20, Math.ceil(predDemand * 1.2 - currentStock));

    setSelectedAlertForRequest(alertItem);
    setSuggestedStockCount(suggested);
    setRequestedStockCount(suggested);
    setRequestReason(`Restocking for ${alertItem.alertType} alert (${alertItem.description})`);
    setRequestModalOpen(true);
  };

  const handleSendReplenishmentRequest = async (e) => {
    e.preventDefault();
    if (!selectedAlertForRequest || requestedStockCount <= 0) return;

    setSubmittingRequest(true);
    try {
      await warehouseApi.post("/api/warehouse/requests", {
        storeId: storeId,
        productId: selectedAlertForRequest.productId,
        requestedQuantity: Number(requestedStockCount),
        reason: requestReason || "Replenishment for active inventory alert.",
      });

      setRequestModalOpen(false);
      setSuccessNotice(`Warehouse replenishment requested: ${requestedStockCount} units for ${selectedAlertForRequest.productName || selectedAlertForRequest.productId}!`);
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err) {
      console.error("Replenishment request failed:", err);
      alert(err.response?.data?.detail || "Failed to submit warehouse request.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  if (loading) return <LoadingSpinner message="Querying persistent alerts..." />;

  const filtered = alerts.filter(
    (a) => filterSeverity === "ALL" || a.severity === filterSeverity
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Inventory & Stock Alerts — {storeId}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Persisted alert records with automated AI stock replenishment suggestions.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold">
          <span className="text-slate-400">Severity:</span>
          {["ALL", "CRITICAL", "WARNING"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterSeverity(s)}
              className={`px-3 py-1 rounded-xl transition-all ${
                filterSeverity === s
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {successNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs sm:text-sm font-semibold flex items-center space-x-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No alerts matching criteria"
          description="Your store inventory is currently healthy with no outstanding alerts."
        />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Product / Alert ID</th>
                <th className="py-3 px-4">Alert Type</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-center">Available Stock</th>
                <th className="py-3 px-4">SNS Notification</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((a) => (
                <tr key={a.alertId} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4">
                    <StatusBadge status={a.severity} />
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{a.productName || a.productId}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{a.alertId}</div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-700">{a.alertType}</td>
                  <td className="py-3 px-4 text-slate-600 max-w-sm">{a.description}</td>
                  <td className="py-3 px-4 text-center font-bold text-slate-800">
                    {a.currentStock} units
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-slate-600">
                      <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                      <span>{a.notificationStatus || "SENT"}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => openStockRequestModal(a)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg shadow-xs transition-all inline-flex items-center space-x-1"
                    >
                      <Truck className="w-3 h-3" />
                      <span>Request Stock</span>
                    </button>

                    {a.acknowledged ? (
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        Acknowledged
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAcknowledge(a.alertId)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition-all"
                      >
                        Acknowledge
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* REPLENISHMENT MODAL WITH AI SUGGESTION */}
      {selectedAlertForRequest && (
        <Modal
          isOpen={requestModalOpen}
          onClose={() => setRequestModalOpen(false)}
          title={`Stock Replenishment Request — ${storeId}`}
        >
          <form onSubmit={handleSendReplenishmentRequest} className="space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Alert Product:</span>
                <span className="font-bold text-slate-900">
                  {selectedAlertForRequest.productName || selectedAlertForRequest.productId}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Current Stock on Shelf:</span>
                <span className="font-extrabold text-slate-800">{selectedAlertForRequest.currentStock} units</span>
              </div>
              {selectedAlertForRequest.predictedDemand && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">7-Day Predicted Demand:</span>
                  <span className="font-extrabold text-indigo-600">
                    {Math.round(selectedAlertForRequest.predictedDemand)} units
                  </span>
                </div>
              )}
            </div>

            {/* AI Recommendation Banner */}
            <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-emerald-900">
                <span className="flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>AI Recommended Stock Quantity:</span>
                </span>
                <span className="text-sm font-extrabold text-emerald-700 bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
                  {suggestedStockCount} units
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed mt-1">
                Suggested replenishment to clear this alert, replenish safety buffer, and satisfy upcoming 7-day sales demand.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Enter Stock Quantity to Order:
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
                  Use AI ({suggestedStockCount})
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason / Note for Warehouse:
              </label>
              <input
                type="text"
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="e.g. Critical low stock replenishment"
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
                <span>{submittingRequest ? "Submitting..." : "Send Request to Warehouse"}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
