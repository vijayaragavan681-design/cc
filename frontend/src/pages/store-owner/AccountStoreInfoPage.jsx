import React from "react";
import { Store, User, ShieldCheck, Cloud, Cpu, Database, Bell } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";

const STORE_DETAILS = {
  STORE001: {
    name: "Downtown Flagship",
    address: "100 Metro Plaza, City Center",
    manager: "Sarah Jenkins",
    phone: "+1 (555) 234-5671",
  },
  STORE002: {
    name: "Suburban Market",
    address: "450 Valley Boulevard, Westside",
    manager: "David Rodriguez",
    phone: "+1 (555) 876-5432",
  },
  STORE003: {
    name: "Uptown Express",
    address: "88 Grand Avenue, North Hill",
    manager: "Emily Chen",
    phone: "+1 (555) 432-1098",
  },
};

export const AccountStoreInfoPage = () => {
  const { user, role, assignedStoreId } = useAuth();
  const storeId = assignedStoreId || "STORE001";
  const store = STORE_DETAILS[storeId] || STORE_DETAILS.STORE001;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Store & Account Information
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Store ownership parameters, Microsoft Entra ID authorization state, and cloud deployment details.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Store Information */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
            <Store className="w-5 h-5 text-emerald-600" />
            <span>Assigned Retail Store</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Store Identifier:</span>
              <span className="text-base font-extrabold text-slate-900 font-mono">{storeId}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Store Name:</span>
              <span className="font-bold text-slate-800">{store.name}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Location Address:</span>
              <span className="text-slate-600">{store.address}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Store Operations Manager:</span>
              <span className="font-semibold text-slate-800">{store.manager}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Contact Phone:</span>
              <span className="text-slate-600 font-mono">{store.phone}</span>
            </div>
          </div>
        </div>

        {/* User Account & Entra ID Identity */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
            <User className="w-5 h-5 text-indigo-600" />
            <span>Authenticated User Profile</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Display Name:</span>
              <span className="text-base font-extrabold text-slate-900">{user?.name || "Active User"}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Email / Principal:</span>
              <span className="font-mono text-slate-700">{user?.email || "user@example.com"}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Application Role:</span>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 mt-1">
                {role}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">User ID (OID / Sub):</span>
              <span className="font-mono text-slate-500 text-[11px]">{user?.userId || "N/A"}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Store-Level Authorization:</span>
              <span className="text-emerald-700 font-semibold flex items-center space-x-1 mt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Restricted to {assignedStoreId || "STORE001"} (Server Enforced)</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cloud & Architecture Details Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
        <h2 className="text-base font-bold flex items-center space-x-2">
          <Cloud className="w-5 h-5 text-emerald-400" />
          <span>Multi-Cloud Architecture Deployment Context</span>
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          The Smart Retail System coordinates authentication via Microsoft Entra ID and persists all state in Amazon DynamoDB with serverless compute on AWS ECS Fargate.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1">
            <div className="font-bold text-emerald-400 flex items-center space-x-1.5">
              <Database className="w-4 h-4" />
              <span>Amazon DynamoDB</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Tables: RetailInventory, Sales, InventoryPredictions, InventoryAlerts, WarehouseRequests.
            </p>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1">
            <div className="font-bold text-indigo-400 flex items-center space-x-1.5">
              <Cpu className="w-4 h-4" />
              <span>AWS ECS & Fargate</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Independent Docker containers for Store, Inventory/ML, and Warehouse services.
            </p>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1">
            <div className="font-bold text-amber-400 flex items-center space-x-1.5">
              <Bell className="w-4 h-4" />
              <span>Amazon SNS & Scheduler</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Scheduled ECS run-tasks evaluate stock and broadcast deduplicated email alerts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
