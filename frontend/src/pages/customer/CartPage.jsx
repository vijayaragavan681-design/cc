import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  Store,
  AlertCircle,
} from "lucide-react";
import { useCart } from "../../context/CartContext";
import { retailApi } from "../../api/client";
import { EmptyState } from "../../components/EmptyState";

export const CartPage = () => {
  const { cartItems, updateQuantity, removeFromCart, clearCart, selectedStore, subtotal, tax, total } =
    useCart();
  const navigate = useNavigate();

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;

    setCheckoutLoading(true);
    setCheckoutError(null);

    // Generate unique idempotency key for this checkout attempt
    const idempotencyKey = `checkout-${selectedStore}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const payload = {
      storeId: selectedStore,
      idempotencyKey: idempotencyKey,
      items: cartItems.map((item) => ({
        productId: item.product.productId,
        quantity: item.quantity,
      })),
    };

    try {
      const res = await retailApi.post("/api/billing/checkout", payload);
      const bill = res.data;
      clearCart();
      // Navigate to confirmation page passing bill state
      navigate("/checkout/confirmation", { state: { bill } });
    } catch (err) {
      console.error("Checkout failed:", err);
      const msg = err.response?.data?.detail || "Checkout failed. Please verify stock availability.";
      setCheckoutError(msg);
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="py-12 max-w-lg mx-auto">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Looks like you haven't added any fresh groceries to your cart yet."
          actionText="Start Shopping"
          onAction={() => navigate("/products")}
        />
      </div>
    );
  }

  return (
    <div className="py-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Shopping Cart
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center space-x-1.5">
            <Store className="w-3.5 h-3.5 text-emerald-600" />
            <span>Fulfilling from: <strong>{selectedStore}</strong></span>
          </p>
        </div>

        <button
          onClick={clearCart}
          className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center space-x-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Cart</span>
        </button>
      </div>

      {checkoutError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3 text-rose-800 text-xs sm:text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Transaction Failed</p>
            <p className="mt-0.5">{checkoutError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Item List */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map((item) => {
            const p = item.product;
            const itemSubtotal = (p.price * item.quantity).toFixed(2);

            return (
              <div
                key={p.productId}
                className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {p.category}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">{p.productName}</h3>
                  <div className="text-xs text-slate-500 font-medium">
                    ${p.price.toFixed(2)} each
                  </div>
                </div>

                <div className="flex items-center justify-between sm:space-x-6">
                  {/* Quantity Controls */}
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                    <button
                      onClick={() => updateQuantity(p.productId, item.quantity - 1)}
                      className="p-1.5 hover:bg-slate-200/60 text-slate-600 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-slate-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(p.productId, item.quantity + 1)}
                      className="p-1.5 hover:bg-slate-200/60 text-slate-600 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div className="text-right min-w-[70px]">
                    <span className="font-extrabold text-sm sm:text-base text-slate-900">
                      ${itemSubtotal}
                    </span>
                  </div>

                  <button
                    onClick={() => removeFromCart(p.productId)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm h-fit space-y-6">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
            Order Summary
          </h2>

          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex items-center justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Estimated Tax (8%)</span>
              <span className="font-semibold text-slate-900">${tax.toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-100 pt-3 flex items-center justify-between font-extrabold text-base sm:text-lg text-slate-900">
              <span>Total</span>
              <span className="text-emerald-700">${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>
              Prices are authoritative from database with atomic conditional stock verification.
            </span>
          </div>

          <button
            disabled={checkoutLoading}
            onClick={handleCheckout}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center space-x-2 shadow-md transition-all ${
              checkoutLoading
                ? "bg-slate-400 cursor-wait shadow-none"
                : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25 hover:scale-[1.01]"
            }`}
          >
            {checkoutLoading ? (
              <span>Validating & Processing Sale...</span>
            ) : (
              <>
                <span>Complete Purchase</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
