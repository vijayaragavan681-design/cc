import React, { useState, useEffect } from "react";
import {
  Truck,
  Plus,
  CheckCircle2,
  Clock,
  Store,
  Send,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { warehouseApi, inventoryApi } from "../../api/client";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { StatusBadge } from "../../components/StatusBadge";
import { Modal } from "../../components/Modal";
import { EmptyState } from "../../components/EmptyState";

export const ReplenishmentRequestsPage = () => {
  const { assignedStoreId } = useAuth();
  const storeId = assignedStoreId || "STORE001";

  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState("");
  const [requestedQty, setRequestedQty] = useState(50);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqRes, invRes] = await Promise.all([
        warehouseApi.get(`/api/warehouse/requests?store_id=${storeId}`),
        inventoryApi.get(`/api/inventory/${storeId}`),
      ]);
      setRequests(reqRes.data);
      setProducts(invRes.data);
      if (invRes.data.length > 0 && !selectedProductId) {
        setSelectedProductId(invRes.data[0].productId);
      }
    } catch (err) {
      console.error("Error loading warehouse requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [storeId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProductId || requestedQty <= 0) return;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await warehouseApi.post("/api/warehouse/requests", {
        storeId: storeId,
        productId: selectedProductId,
        requestedQuantity: Number(requestedQty),
        reason: reason || "Replenishment for inventory buffer.",
      });

      setModalOpen(false);
      setReason("");
      setActionNotice(`New replenishment request created for ${storeId}!`);
      setTimeout(() => setActionNotice(null), 3500);
      loadData();
    } catch (err) {
      console.error("Replenishment submission failed:", err);
      setErrorMsg(err.response?.data?.detail || "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner message="Fetching store replenishment orders..." />;

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED" || r.status === "ACKNOWLEDGED").length;
  const rejectedCount = requests.filter((r) => r.status === "REJECTED").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
              {storeId}
            </span>
            <span className="text-xs text-slate-400">• Store Replenishment Orders</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2 mt-1">
            <Truck className="w-6 h-6 text-emerald-600" />
            <span>Store Replenishment Requests</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            View your store stock orders and live fulfillment status from the central warehouse.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Replenishment Request</span>
        </button>
      </div>

      {actionNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs sm:text-sm font-semibold flex items-center space-x-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Pending Review</span>
            <span className="text-xl font-extrabold text-amber-600 block mt-0.5">{pendingCount}</span>
          </div>
          <Clock className="w-6 h-6 text-amber-500 opacity-60" />
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Approved / Dispatched</span>
            <span className="text-xl font-extrabold text-emerald-600 block mt-0.5">{approvedCount}</span>
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-500 opacity-60" />
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Rejected</span>
            <span className="text-xl font-extrabold text-rose-600 block mt-0.5">{rejectedCount}</span>
          </div>
          <AlertCircle className="w-6 h-6 text-rose-500 opacity-60" />
        </div>
      </div>

      {/* Requests History Table */}
      {requests.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No replenishment requests found"
          description={`There are currently no active replenishment requests submitted for store ${storeId}.`}
          actionText="Create Request"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Your Store Replenishment Order History</h2>
            <span className="text-xs text-slate-400 font-mono">{requests.length} requests</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Request ID</th>
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4 text-center">Requested Quantity</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4">Submission Date</th>
                  <th className="py-3 px-4 text-right">Fulfillment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => (
                  <tr key={r.requestId} className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                      {r.requestId}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{r.productName || r.productId}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{r.productId}</div>
                    </td>

                    <td className="py-3.5 px-4 text-center font-black text-emerald-700 text-sm">
                      {r.requestedQuantity} units
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 max-w-xs leading-relaxed">
                      {r.reason}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      {r.createdAt ? r.createdAt.substring(0, 16).replace("T", " ") : "Recently"}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Request Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Create Stock Replenishment Request — ${storeId}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Product:
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500"
              required
            >
              {products.map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.productName} ({p.productId}) — {p.totalStock} units on shelf
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Requested Quantity (Units):
            </label>
            <input
              type="number"
              min="1"
              max="2000"
              value={requestedQty}
              onChange={(e) => setRequestedQty(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reason / Urgency Justification:
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Replenishment following high weekend customer demand surge"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? "Submitting..." : "Submit to Warehouse"}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
