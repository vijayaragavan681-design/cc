import React from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, ShieldCheck, UserCheck, ArrowRight, Sparkles, Building2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export const LoginPage = () => {
  const { loginAsMock, loginWithEntra } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50">
        <div className="text-center">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 items-center justify-center text-white shadow-lg shadow-emerald-500/25 mb-4">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Sign In to Smart Retail
          </h2>
          <p className="mt-2 text-xs text-slate-500 max-w-xs mx-auto">
            Multi-store inventory management with machine learning demand forecasting
          </p>
        </div>

        {/* Microsoft Entra ID Official Login */}
        <div className="space-y-4">
          <button
            onClick={() => {
              loginWithEntra();
              navigate("/owner/dashboard");
            }}
            className="w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/25 transition-all"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>Sign in with Microsoft Entra ID</span>
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider">
              Or Select Local Dev Profile
            </span>
          </div>
        </div>

        {/* Quick Dev Switchers */}
        <div className="space-y-2.5">
          <button
            onClick={() => {
              loginAsMock("CUSTOMER");
              navigate("/products");
            }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 text-slate-700 hover:text-emerald-800 transition-all text-xs font-semibold group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                C
              </div>
              <div className="text-left">
                <span className="block font-bold">Customer Profile</span>
                <span className="text-[11px] text-slate-400 font-normal">Browse, purchase, view bills</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            onClick={() => {
              loginAsMock("WAREHOUSE_OWNER");
              navigate("/warehouse/portal");
            }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50/40 text-slate-700 hover:text-indigo-800 transition-all text-xs font-semibold group bg-indigo-50/20"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                WH
              </div>
              <div className="text-left">
                <span className="block font-bold text-indigo-950">Warehouse Manager / Owner</span>
                <span className="text-[11px] text-slate-400 font-normal">Review, Accept & Reject store stock requests</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            onClick={() => {
              loginAsMock("STORE_OWNER", "STORE001");
              navigate("/owner/dashboard");
            }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 text-slate-700 hover:text-emerald-800 transition-all text-xs font-semibold group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                O1
              </div>
              <div className="text-left">
                <span className="block font-bold">Store Owner — STORE001</span>
                <span className="text-[11px] text-slate-400 font-normal">Downtown Flagship</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            onClick={() => {
              loginAsMock("STORE_OWNER", "STORE002");
              navigate("/owner/dashboard");
            }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 text-slate-700 hover:text-emerald-800 transition-all text-xs font-semibold group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                O2
              </div>
              <div className="text-left">
                <span className="block font-bold">Store Owner — STORE002</span>
                <span className="text-[11px] text-slate-400 font-normal">Suburban Market</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            onClick={() => {
              loginAsMock("STORE_OWNER", "STORE003");
              navigate("/owner/dashboard");
            }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 text-slate-700 hover:text-emerald-800 transition-all text-xs font-semibold group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                O3
              </div>
              <div className="text-left">
                <span className="block font-bold">Store Owner — STORE003</span>
                <span className="text-[11px] text-slate-400 font-normal">Uptown Express</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>

        <div className="text-center text-[11px] text-slate-400">
          Powered by AWS ECS, DynamoDB, SNS, and Microsoft Entra ID.
        </div>
      </div>
    </div>
  );
};
