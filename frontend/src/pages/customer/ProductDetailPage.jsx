import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingCart,
  Plus,
  Minus,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Store,
  ShieldCheck,
} from "lucide-react";
import { retailApi } from "../../api/client";
import { useCart } from "../../context/CartContext";
import { LoadingSpinner } from "../../components/LoadingSpinner";

export const ProductDetailPage = () => {
  const { productId } = useParams();
  const { selectedStore, addToCart } = useCart();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await retailApi.get(`/api/stores/${selectedStore}/products/${productId}`);
        setProduct(res.data);
      } catch (err) {
        console.error("Error loading product detail:", err);
        setError(err.response?.data?.detail || "Failed to load product details.");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [selectedStore, productId]);

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, quantity);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  };

  if (loading) return <LoadingSpinner message="Loading product information..." />;
  if (error || !product) {
    return (
      <div className="py-12 max-w-md mx-auto text-center space-y-4">
        <p className="text-rose-600 text-sm font-semibold">{error || "Product not found."}</p>
        <Link
          to="/products"
          className="inline-flex items-center space-x-2 text-xs font-bold text-slate-700 hover:text-emerald-600"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Product Catalog</span>
        </Link>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="py-8 max-w-4xl mx-auto space-y-8">
      <Link
        to="/products"
        className="inline-flex items-center space-x-2 text-xs font-bold text-slate-500 hover:text-emerald-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Product Catalog</span>
      </Link>

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Side: Product Details */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {product.category}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-mono font-semibold text-slate-500">{product.productId}</span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
              {product.productName}
            </h1>
          </div>

          <div className="flex items-baseline space-x-3">
            <span className="text-4xl font-extrabold text-slate-900">${product.price.toFixed(2)}</span>
            <span className="text-xs text-slate-400 font-medium">Authoritative Store Price</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Selected Store:</span>
              <span className="font-bold text-slate-800">{product.storeId}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Available Units:</span>
              <span
                className={`font-bold ${
                  product.totalStock > 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {product.totalStock} units available
              </span>
            </div>
          </div>

          {/* Quantity and Add to Cart */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-semibold text-slate-600">Quantity:</span>
                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="p-2 hover:bg-slate-50 text-slate-500 disabled:opacity-30 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center font-bold text-sm text-slate-800">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.totalStock || 1, quantity + 1))}
                    disabled={quantity >= (product.totalStock || 1)}
                    className="p-2 hover:bg-slate-50 text-slate-500 disabled:opacity-30 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Calculated Total
                </span>
                <span className="text-lg font-black text-emerald-700">
                  ${(product.price * quantity).toFixed(2)}
                </span>
              </div>
            </div>

            <button
              disabled={product.totalStock <= 0}
              onClick={handleAddToCart}
              className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 transition-all shadow-md ${
                product.totalStock <= 0
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none"
                  : added
                  ? "bg-emerald-700 text-white shadow-emerald-700/20"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25"
              }`}
            >
              {added ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Added {quantity} to Cart!</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  <span>
                    {product.totalStock > 0
                      ? `Add ${quantity} to Cart • $${(product.price * quantity).toFixed(2)}`
                      : "Currently Out of Stock"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Store Fulfillment & Stock Guarantee */}
        <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-200/80 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Store Fulfillment & Stock Guarantee</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Real-time inventory levels synchronized across retail stores with atomic DynamoDB conditional updates.
            </p>

            <div className="space-y-2.5 pt-2">
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Current Store Stock</span>
                  <span className="text-[11px] text-slate-400">Available immediately on shelf</span>
                </div>
                <span className="font-black text-emerald-700 text-sm">
                  {product.totalStock} units
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Product Category</span>
                  <span className="text-[11px] text-slate-400">{product.category}</span>
                </div>
                <span className="font-mono text-xs text-slate-600">{product.productId}</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Order Processing</span>
                  <span className="text-[11px] text-slate-400">Instant barcode verification</span>
                </div>
                <span className="font-bold text-xs text-emerald-600">Active</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center space-x-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Conditional write stock verification enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
};
