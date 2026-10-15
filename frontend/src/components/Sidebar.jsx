import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Bell,
  CalendarClock,
  Truck,
  Store,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";

const NAV_ITEMS = [
  { name: "Dashboard & Products", path: "/owner/dashboard", icon: LayoutDashboard },
  { name: "Alerts & Stock Requests", path: "/owner/alerts", icon: Bell },
  { name: "Warehouse Requests", path: "/owner/replenishment", icon: Truck },
];

export const Sidebar = () => {
  const { assignedStoreId } = useAuth();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between hidden md:flex">
      <div>
        <div className="px-3 py-2 mb-3 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Workspace</p>
          <p className="text-sm font-bold text-slate-800 flex items-center space-x-1.5 mt-0.5">
            <Store className="w-4 h-4 text-emerald-600" />
            <span>Store: {assignedStoreId || "STORE001"}</span>
          </p>
        </div>

        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-200"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-3 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl text-xs">
        <p className="font-semibold text-white flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>ML Demand Engine</span>
        </p>
        <p className="text-slate-300 text-[11px] mt-1">
          Random Forest 7-day model running on AWS ECS Fargate.
        </p>
      </div>
    </aside>
  );
};
