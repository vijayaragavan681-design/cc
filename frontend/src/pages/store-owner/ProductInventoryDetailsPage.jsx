import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Layers,
  Sparkles,
  ShieldAlert,
  Truck,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { inventoryApi } from "../../api/client";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { StatusBadge } from "../../components/StatusBadge";
import { Modal } from "../../components/Modal";
import { warehouseApi } from "../../api/client";

export const ProductInventoryDetailsPage = () => {
  const { productId } = useParams();
  const { assignedStoreId } = useAuth();
  const storeId = assignedStoreId || "STORE001";

  const [product, setProduct] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replenishModal, setReplenishModal] = useState(false);
  const [replenishQty, setReplenishQty] = useState(50);
  const [replenishReason, setReplenishReason] = useState("Restocking based on low forecast buffer.");
  const [replenishSuccess, setReplenishSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [invRes, predRes] = await Promise.all([
          inventoryApi.get(`/api/inventory/${storeId}`),
          inventoryApi.get(`/api/inventory/${storeId}/predictions/${productId}`),
        ]);
        const match = invRes.data.find((p) => p.productId === productId);
        setProduct(match || null);
        setPrediction(predRes.data);
      } catch (err) {
        console.error("Error fetching product inventory details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [storeId, productId]);

  const handleCreateReplenish = async (e) => {
    e.preventDefault();
    try {
      await warehouseApi.post("/api/warehouse/requests", {
        storeId: storeId,
        productId: productId,
        requestedQuantity: Number(replenishQty),
        reason: replenishReason,
      });
      setReplenishSuccess(true);
      setTimeout(() => {
        setReplenishSuccess(false);
        setReplenishModal(false);
      }, 1500);
    } catch (err) {
      console.error("Failed to submit replenishment request:", err);
      alert(err.response?.data?.detail || "Failed to submit request.");
    }
  };

  if (loading) return <LoadingSpinner message="Loading batch details and prediction insights..." />;
  if (!product) {
    return (
      <div className="py-12 text-center space-y-4">
        <p className="text-slate-500 text-sm">Product not found in store {storeId}.</p>
        <Link to="/owner/inventory" className="text-xs font-bold text-emerald-600">
          Back to Overview
        </Link>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link
        to="/owner/inventory"
        className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-emerald-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Inventory Overview</span>
      </Link>

      {/* Header Info Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {product.category}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-mono font-semibold text-slate-500">{product.productId}</span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              Store: {storeId}
            </span>
          </div>

          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
            {product.productName}
          </h1>

          <div className="mt-3 flex items-center space-x-4">
            <span className="text-2xl font-extrabold text-slate-900">${product.price.toFixed(2)}</span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
              Total Stock: {product.totalStock} units
            </span>
            {prediction && <StatusBadge status={prediction.classification} />}
          </div>
        </div>

        <button
          onClick={() => setReplenishModal(true)}
          className="inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all self-start md:self-auto"
        >
          <Truck className="w-4 h-4" />
          <span>Request Replenishment</span>
        </button>
      </div>

      {/* Prediction & Mathematical Explanation Card */}
      {prediction && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Demand Prediction & Inventory Classification</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <span className="text-xs text-slate-400 block">7-Day Predicted Demand</span>
              <span className="text-2xl font-extrabold text-white mt-1 block">
                {prediction.predictedDemand7d.toFixed(1)} units
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                ~{(prediction.predictedDemand7d / 7).toFixed(1)} units/day
              </span>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <span className="text-xs text-slate-400 block">Safety Stock Target</span>
              <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">
                {prediction.safetyStock} units
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Configured 1.2x demand buffer
              </span>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <span className="text-xs text-slate-400 block">Estimated Stock Coverage</span>
              <span className="text-2xl font-extrabold text-amber-400 mt-1 block">
                {prediction.coverageDays} days
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Status: [{prediction.classification}]
              </span>
            </div>
          </div>

          <div className="p-4 bg-white/10 rounded-2xl border border-white/10 text-xs text-slate-200 leading-relaxed">
            <strong>Policy Analysis: </strong>
            {prediction.explanation}
          </div>
        </div>
      )}

      {/* Batch Breakdown Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
          <Layers className="w-5 h-5 text-emerald-600" />
          <span>Tracked Inventory Batches</span>
        </h2>
        <p className="text-xs text-slate-500">
          Stock allocation across active warehouse delivery batches for this store.
        </p>

        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Batch ID</th>
                <th className="py-3 px-4 text-center">Stock Quantity</th>
                <th className="py-3 px-4 text-right">Allocation Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {product.batches && product.batches.length > 0 ? (
                product.batches.map((b) => (
                  <tr key={b.batchId} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{b.batchId}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800 text-sm">
                      {b.quantity} units
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Active Stock
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-slate-400">
                    No batch information available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Submit Warehouse Replenishment */}
      <Modal
        isOpen={replenishModal}
        onClose={() => setReplenishModal(false)}
        title={`Request Replenishment — ${product.productName}`}
      >
        {replenishSuccess ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-slate-900 text-sm">Replenishment Request Created!</h4>
            <p className="text-xs text-slate-500">
              The request has been saved with status PENDING in the Warehouse Service.
            </p>
          </div>
        ) : (
          <form onSubmit={handleCreateReplenish} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Requested Quantity (Units)
              </label>
              <input
                type="number"
                min="1"
                required
                value={replenishQty}
                onChange={(e) => setReplenishQty(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason</label>
              <textarea
                required
                rows={3}
                value={replenishReason}
                onChange={(e) => setReplenishReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500"
                placeholder="Explain the stock need..."
              />
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setReplenishModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Submit Request
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
