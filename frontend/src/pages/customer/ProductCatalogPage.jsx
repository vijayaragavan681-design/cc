import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  ShoppingCart,
  Plus,
  Minus,
  Check,
  Calendar,
  AlertTriangle,
  Info,
} from "lucide-react";
import { retailApi } from "../../api/client";
import { useCart } from "../../context/CartContext";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { EmptyState } from "../../components/EmptyState";
import { StatusBadge } from "../../components/StatusBadge";

export const ProductCatalogPage = () => {
  const { selectedStore, setSelectedStore, addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [addedNotice, setAddedNotice] = useState(null);
  const [quantities, setQuantities] = useState({});

  const getQty = (productId) => quantities[productId] || 1;
  const updateQty = (productId, delta, maxStock) => {
    setQuantities((prev) => {
      const current = prev[productId] || 1;
      const next = Math.max(1, Math.min(maxStock || 1, current + delta));
      return { ...prev, [productId]: next };
    });
  };

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await retailApi.get(`/api/stores/${selectedStore}/products`);
      setProducts(res.data);
    } catch (err) {
      console.error("Failed to load products:", err);
      setError(err.response?.data?.detail || "Failed to load products from store.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedStore]);

  const categories = ["ALL", ...new Set(products.map((p) => p.category))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.productName.toLowerCase().includes(search.toLowerCase()) ||
      p.productId.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === "ALL" || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleAddToCart = (product) => {
    const count = getQty(product.productId);
    addToCart(product, count);
    setAddedNotice(product.productId);
    setTimeout(() => setAddedNotice(null), 1500);
  };

  return (
    <div className="space-y-8 py-6">
      {/* Header and Store Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Product Catalogue
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse available products with real-time stock and live dynamic subtotals.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Store:</span>
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
          >
            <option value="STORE001">STORE001 — Downtown Flagship</option>
            <option value="STORE002">STORE002 — Suburban Market</option>
            <option value="STORE003">STORE003 — Uptown Express</option>
          </select>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search products by name or ID (e.g. Milk, Apples, PROD001)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <LoadingSpinner message="Fetching authoritative inventory..." />
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs text-center">
          {error}
        </div>
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          title="No products found"
          description="Try adjusting your search query or selecting a different category."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((p) => {
            const hasStock = p.totalStock > 0;

            return (
              <div
                key={p.productId}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {p.category}
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                      {p.productId}
                    </span>
                  </div>

                  <Link
                    to={`/products/${p.productId}`}
                    className="block mt-2 font-bold text-slate-900 hover:text-emerald-600 transition-colors text-sm sm:text-base leading-snug"
                  >
                    {p.productName}
                  </Link>

                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <span className="text-xl font-extrabold text-slate-900">
                        ${p.price.toFixed(2)}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        hasStock
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {hasStock ? `${p.totalStock} in stock` : "Out of stock"}
                    </span>
                  </div>

                  {/* Quantity Counter & Live Calculated Price */}
                  {hasStock && (
                    <div className="mt-3.5 p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/80 flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[11px] font-semibold text-slate-500">Qty:</span>
                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
                          <button
                            type="button"
                            onClick={() => updateQty(p.productId, -1, p.totalStock)}
                            disabled={getQty(p.productId) <= 1}
                            className="p-1 hover:bg-slate-100 text-slate-600 disabled:opacity-30 transition-colors"
                            title="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center font-bold text-xs text-slate-900">
                            {getQty(p.productId)}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQty(p.productId, 1, p.totalStock)}
                            disabled={getQty(p.productId) >= p.totalStock}
                            className="p-1 hover:bg-slate-100 text-slate-600 disabled:opacity-30 transition-colors"
                            title="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-medium">Subtotal</span>
                        <span className="text-xs font-black text-emerald-700">
                          ${(p.price * getQty(p.productId)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center space-x-2">
                  <Link
                    to={`/products/${p.productId}`}
                    className="px-3 py-2 text-center rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                  >
                    Details
                  </Link>

                  <button
                    disabled={!hasStock}
                    onClick={() => handleAddToCart(p)}
                    className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      !hasStock
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                        : addedNotice === p.productId
                        ? "bg-emerald-700 text-white"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                    }`}
                  >
                    {addedNotice === p.productId ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Added ({getQty(p.productId)})!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        <span>{hasStock ? `Add (${getQty(p.productId)})` : "Sold Out"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
