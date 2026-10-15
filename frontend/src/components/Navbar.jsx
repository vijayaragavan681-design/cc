import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  Store,
  ShoppingCart,
  User,
  ShieldCheck,
  ChevronDown,
  LogOut,
  Sparkles,
  Receipt,
  Layers,
  Bell,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../context/CartContext";

const STORES = [
  { id: "STORE001", name: "STORE001 — Downtown Flagship" },
  { id: "STORE002", name: "STORE002 — Suburban Market" },
  { id: "STORE003", name: "STORE003 — Uptown Express" },
];

export const Navbar = () => {
  const { user, role, assignedStoreId, logout, loginAsMock, loginWithEntra } = useAuth();
  const { selectedStore, setSelectedStore, itemCount } = useCart();
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();

  const isStoreOwner = role === "STORE_OWNER";
  const isWarehouseOwner = role === "WAREHOUSE_OWNER";

  return (
    <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight text-slate-900 block leading-tight">
                  Smart<span className="text-emerald-600">Retail</span>
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Inventory & ML System
                </span>
              </div>
            </Link>

            {/* Store Selector (for Customers) or Current Store Badge (for Store Owner) or Warehouse Badge */}
            {isWarehouseOwner ? (
              <div className="hidden md:flex items-center space-x-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-indigo-800">
                <Store className="w-3.5 h-3.5 text-indigo-600" />
                <span>Central Warehouse Authority</span>
              </div>
            ) : isStoreOwner ? (
              <div className="hidden md:flex items-center space-x-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-emerald-800">
                <Store className="w-3.5 h-3.5 text-emerald-600" />
                <span>Assigned Store: {assignedStoreId || "STORE001"}</span>
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700">
                <Store className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-slate-400">Shopping at:</span>
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
                >
                  {STORES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {isWarehouseOwner ? (
              <Link
                to="/warehouse/portal"
                className="px-3.5 py-2 rounded-xl text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center space-x-2 border border-indigo-200"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Warehouse Fulfillment Portal</span>
              </Link>
            ) : isStoreOwner ? (
              <>
                <Link
                  to="/owner/dashboard"
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 transition-colors flex items-center space-x-1.5"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Store Owner Hub</span>
                </Link>
                <Link
                  to="/owner/inventory"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-emerald-600 hover:bg-slate-50 transition-colors flex items-center space-x-1.5"
                >
                  <Layers className="w-4 h-4" />
                  <span>Inventory</span>
                </Link>
                <Link
                  to="/owner/predictions"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-emerald-600 hover:bg-slate-50 transition-colors flex items-center space-x-1.5"
                >
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>ML Forecasts</span>
                </Link>
                <Link
                  to="/owner/alerts"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-emerald-600 hover:bg-slate-50 transition-colors flex items-center space-x-1.5"
                >
                  <Bell className="w-4 h-4 text-amber-500" />
                  <span>Alerts</span>
                </Link>
                <Link
                  to="/owner/replenishment"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-emerald-600 hover:bg-slate-50 transition-colors flex items-center space-x-1.5"
                >
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>Stock Orders</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/products"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-emerald-600 hover:bg-slate-50 transition-colors"
                >
                  Product Catalog
                </Link>
                <Link
                  to="/my-bills"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-emerald-600 hover:bg-slate-50 transition-colors flex items-center space-x-1.5"
                >
                  <Receipt className="w-4 h-4" />
                  <span>My Bills</span>
                </Link>
                <Link
                  to="/purchase-history"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-emerald-600 hover:bg-slate-50 transition-colors"
                >
                  Purchase History
                </Link>
              </>
            )}
          </div>

          {/* Right Action Icons: Cart & Profile */}
          <div className="flex items-center space-x-3">
            {!isStoreOwner && !isWarehouseOwner && (
              <Link
                to="/cart"
                className="relative p-2.5 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
                title="View Shopping Cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center shadow-sm">
                    {itemCount}
                  </span>
                )}
              </Link>
            )}

            {/* User Profile / Dev Switcher Menu */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center space-x-2 pl-3 pr-2 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-all text-xs font-semibold text-slate-700 shadow-sm"
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                  role === "WAREHOUSE_OWNER"
                    ? "bg-indigo-600 text-white"
                    : role === "STORE_OWNER"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
                }`}>
                  {role === "STORE_OWNER" ? "O" : role === "WAREHOUSE_OWNER" ? "W" : "C"}
                </div>
                <div className="text-left hidden sm:block">
                  <span className="block leading-none text-slate-900">{user?.name || "Guest"}</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {role === "STORE_OWNER"
                      ? `Owner (${assignedStoreId})`
                      : role === "WAREHOUSE_OWNER"
                      ? "Warehouse Manager"
                      : "Customer"}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900">{user?.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                    <div className="mt-1 flex items-center space-x-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {role}
                      </span>
                      {assignedStoreId && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {assignedStoreId}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Quick Role Switcher (Dev Mode)
                  </div>

                  <button
                    onClick={() => {
                      loginAsMock("CUSTOMER");
                      setProfileOpen(false);
                      navigate("/products");
                    }}
                    className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      role === "CUSTOMER" ? "font-bold text-emerald-600" : "text-slate-700"
                    }`}
                  >
                    <span>Customer Account</span>
                    {role === "CUSTOMER" && <span className="w-2 h-2 rounded-full bg-emerald-600"></span>}
                  </button>

                  <button
                    onClick={() => {
                      loginAsMock("WAREHOUSE_OWNER");
                      setProfileOpen(false);
                      navigate("/warehouse/portal");
                    }}
                    className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      role === "WAREHOUSE_OWNER" ? "font-bold text-indigo-600" : "text-slate-700"
                    }`}
                  >
                    <span>Warehouse Manager</span>
                    {role === "WAREHOUSE_OWNER" && <span className="w-2 h-2 rounded-full bg-indigo-600"></span>}
                  </button>

                  <button
                    onClick={() => {
                      loginAsMock("STORE_OWNER", "STORE001");
                      setProfileOpen(false);
                      navigate("/owner/dashboard");
                    }}
                    className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      role === "STORE_OWNER" && assignedStoreId === "STORE001"
                        ? "font-bold text-emerald-600"
                        : "text-slate-700"
                    }`}
                  >
                    <span>Store Owner (STORE001)</span>
                    {role === "STORE_OWNER" && assignedStoreId === "STORE001" && (
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      loginAsMock("STORE_OWNER", "STORE002");
                      setProfileOpen(false);
                      navigate("/owner/dashboard");
                    }}
                    className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      role === "STORE_OWNER" && assignedStoreId === "STORE002"
                        ? "font-bold text-emerald-600"
                        : "text-slate-700"
                    }`}
                  >
                    <span>Store Owner (STORE002)</span>
                    {role === "STORE_OWNER" && assignedStoreId === "STORE002" && (
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      loginAsMock("STORE_OWNER", "STORE003");
                      setProfileOpen(false);
                      navigate("/owner/dashboard");
                    }}
                    className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      role === "STORE_OWNER" && assignedStoreId === "STORE003"
                        ? "font-bold text-emerald-600"
                        : "text-slate-700"
                    }`}
                  >
                    <span>Store Owner (STORE003)</span>
                    {role === "STORE_OWNER" && assignedStoreId === "STORE003" && (
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    )}
                  </button>

                  <div className="my-1 border-t border-slate-100"></div>

                  <button
                    onClick={() => {
                      loginWithEntra();
                      setProfileOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-blue-600 hover:bg-blue-50 font-medium flex items-center space-x-2"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Login via Entra ID</span>
                  </button>

                  <button
                    onClick={() => {
                      logout();
                      setProfileOpen(false);
                      navigate("/login");
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-medium flex items-center space-x-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
