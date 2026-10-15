import React from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, ArrowRight, ShieldCheck, Sparkles, Clock, CheckCircle2 } from "lucide-react";
import { useCart } from "../../context/CartContext";

export const CustomerHomePage = () => {
  const { selectedStore } = useCart();

  return (
    <div className="space-y-12 py-6">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-8 sm:p-12 shadow-2xl">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Smart Retail Experience</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Fresh grocers, guaranteed freshness & real-time inventory.
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Browse our full catalog across STORE001, STORE002, and STORE003. Powered by FEFO batch management, ensuring you always get the freshest products.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              to="/products"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02]"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Shop Products</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/my-bills"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-sm border border-white/10 transition-all"
            >
              <span>View My Bills</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Live Stock Availability</h3>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Every product is tracked with authoritative store inventory levels. Real-time availability ensures accurate order fulfillment.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Atomic Checkout</h3>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Real-time conditional inventory deductions prevent overselling or race conditions. Authoritative pricing is verified at checkout.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Multi-Cloud Security</h3>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Secured by Microsoft Entra ID authorization and deployed on AWS ECS with fine-grained DynamoDB access policies.
          </p>
        </div>
      </div>
    </div>
  );
};
