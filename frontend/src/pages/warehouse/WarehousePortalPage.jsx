import React, { useState, useEffect } from "react";
import {
  Truck,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  X,
  Store,
  User,
  Filter,
  ShieldCheck,
  RotateCcw,
  Search,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { warehouseApi } from "../../api/client";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { StatusBadge } from "../../components/StatusBadge";
import { EmptyState } from "../../components/EmptyState";

const STORE_DIRECTORY = {
  STORE001: { name: "Downtown Flagship", manager: "Sarah Jenkins" },
  STORE002: { name: "Suburban Market", manager: "David Rodriguez" },
  STORE003: { name: "Uptown Express", manager: "Emily Chen" },
};

export const WarehousePortalPage = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [actionNotice, setActionNotice] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await warehouseApi.get(
        `/api/warehouse/requests?store_id=${selectedStoreFilter}`
      );
      setRequests(res.data);
    } catch (err) {
      console.error("Failed to load warehouse requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [selectedStoreFilter]);

  const handleUpdateStatus = async (requestId, requestStoreId, newStatus) => {
    setProcessingId(requestId);
    try {
      await warehouseApi.post(
        `/api/warehouse/requests/${requestId}/status?status=${newStatus}&store_id=${requestStoreId}`
      );
      setRequests((prev) =>
        prev.map((r) =>
          r.requestId === requestId ? { ...r, status: newStatus } : r
        )
      );
      setActionNotice({
        type: newStatus === "APPROVED" ? "success" : "warning",
        message: `Request ${requestId} has been ${
          newStatus === "APPROVED" ? "ACCEPTED and scheduled for dispatch" : "REJECTED"
        }!`,
      });
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      console.error("Failed to update status:", err);
      alert(err.response?.data?.detail || "Status update failed.");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <LoadingSpinner message="Accessing central warehouse fulfillment records..." />;

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    const storeInfo = STORE_DIRECTORY[r.storeId] || { name: r.storeName || "", manager: r.managerName || "" };
    const matchesSearch =
      r.requestId.toLowerCase().includes(search.toLowerCase()) ||
      (r.productName || "").toLowerCase().includes(search.toLowerCase()) ||
      r.productId.toLowerCase().includes(search.toLowerCase()) ||
      storeInfo.name.toLowerCase().includes(search.toLowerCase()) ||
      storeInfo.manager.toLowerCase().includes(search.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const totalPending = requests.filter((r) => r.status === "PENDING").length;
  const totalApproved = requests.filter((r) => r.status === "APPROVED" || r.status === "ACKNOWLEDGED").length;
  const totalRejected = requests.filter((r) => r.status === "REJECTED").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
              Central Warehouse Hub
            </span>
            <span className="text-xs text-slate-400">• Authenticated as {user?.name || "Warehouse Manager"}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2 mt-1">
            <Building2 className="w-7 h-7 text-indigo-600" />
            <span>Warehouse Order Management & Fulfillment</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Exclusive portal for the Warehouse Owner to review, Accept, or Reject retail store stock requests.
          </p>
        </div>

        <button
          onClick={loadRequests}
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Refresh Orders</span>
        </button>
      </div>

      {actionNotice && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center space-x-2 shadow-xs border ${
            actionNotice.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {actionNotice.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{actionNotice.message}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-400">Total Requests</span>
          <span className="text-2xl font-black text-slate-900 block mt-1">{requests.length}</span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <span className="text-xs font-semibold text-amber-600">Pending Review</span>
          <span className="text-2xl font-black text-amber-700 block mt-1">{totalPending}</span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <span className="text-xs font-semibold text-emerald-600">Accepted & Dispatched</span>
          <span className="text-2xl font-black text-emerald-700 block mt-1">{totalApproved}</span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-rose-200 bg-rose-50/20 shadow-2xs">
          <span className="text-xs font-semibold text-rose-600">Rejected</span>
          <span className="text-2xl font-black text-rose-700 block mt-1">{totalRejected}</span>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
            <Store className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-500">Retail Store:</span>
            <select
              value={selectedStoreFilter}
              onChange={(e) => setSelectedStoreFilter(e.target.value)}
              className="font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
            >
              <option value="ALL">All Retail Stores</option>
              <option value="STORE001">STORE001 — Downtown Flagship</option>
              <option value="STORE002">STORE002 — Suburban Market</option>
              <option value="STORE003">STORE003 — Uptown Express</option>
            </select>
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {["ALL", "PENDING", "APPROVED", "REJECTED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg transition-all ${
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

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by store, owner, product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Orders Table */}
      {filteredRequests.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No matching requests found"
          description="There are currently no store replenishment requests matching the selected filters."
        />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Retail Shop & Location</th>
                  <th className="py-3 px-4">Store Owner / Manager</th>
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4 text-center">Requested Units</th>
                  <th className="py-3 px-4">Reason & Timestamp</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4 text-right">Accept / Reject Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((r) => {
                  const storeInfo = STORE_DIRECTORY[r.storeId] || {
                    name: r.storeName || r.storeId,
                    manager: r.managerName || r.createdBy,
                  };

                  const isPending = r.status === "PENDING";
                  const isApproved = r.status === "APPROVED" || r.status === "ACKNOWLEDGED";
                  const isRejected = r.status === "REJECTED";
                  const isProcessing = processingId === r.requestId;

                  return (
                    <tr key={r.requestId} className="hover:bg-slate-50/60">
                      {/* Shop Name & Store ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <Store className="w-4 h-4 text-indigo-600 shrink-0" />
                          <div>
                            <span className="font-extrabold text-slate-900 block">
                              {storeInfo.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {r.storeId} • {r.requestId}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Store Owner / Manager */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5 text-slate-700">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-slate-800">{storeInfo.manager}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Retail Store Owner</span>
                      </td>

                      {/* Product */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{r.productName || r.productId}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{r.productId}</div>
                      </td>

                      {/* Requested Quantity */}
                      <td className="py-3.5 px-4 text-center font-black text-indigo-700 text-sm">
                        {r.requestedQuantity} units
                      </td>

                      {/* Reason & Timestamp */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-slate-700 leading-snug line-clamp-2">{r.reason}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-1">
                          {r.createdAt ? r.createdAt.substring(0, 16).replace("T", " ") : "Recently"}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={r.status} />
                      </td>

                      {/* Accept / Reject Action Controls ONLY for Warehouse Owner */}
                      <td className="py-3.5 px-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              disabled={isProcessing}
                              onClick={() => handleUpdateStatus(r.requestId, r.storeId, "APPROVED")}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-xs transition-all disabled:opacity-50"
                              title="Accept Stock Request"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Accept</span>
                            </button>

                            <button
                              disabled={isProcessing}
                              onClick={() => handleUpdateStatus(r.requestId, r.storeId, "REJECTED")}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all disabled:opacity-50"
                              title="Reject Stock Request"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : isApproved ? (
                          <span className="text-emerald-700 font-bold text-xs inline-flex items-center space-x-1 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Accepted</span>
                          </span>
                        ) : (
                          <span className="text-rose-700 font-bold text-xs inline-flex items-center space-x-1 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Rejected</span>
                          </span>
                        )}
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
