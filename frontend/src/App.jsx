import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { CartProvider } from "./context/CartContext";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";

// Customer & Public Pages
import { LoginPage } from "./pages/LoginPage";
import { CustomerHomePage } from "./pages/customer/CustomerHomePage";
import { ProductCatalogPage } from "./pages/customer/ProductCatalogPage";
import { ProductDetailPage } from "./pages/customer/ProductDetailPage";
import { CartPage } from "./pages/customer/CartPage";
import { CheckoutConfirmationPage } from "./pages/customer/CheckoutConfirmationPage";
import { MyBillsPage } from "./pages/customer/MyBillsPage";
import { PurchaseHistoryPage } from "./pages/customer/PurchaseHistoryPage";

// Store Owner Pages
import { StoreDashboardPage } from "./pages/store-owner/StoreDashboardPage";
import { InventoryOverviewPage } from "./pages/store-owner/InventoryOverviewPage";
import { ProductInventoryDetailsPage } from "./pages/store-owner/ProductInventoryDetailsPage";
import { DemandForecastingPage } from "./pages/store-owner/DemandForecastingPage";
import { InventoryClassificationPage } from "./pages/store-owner/InventoryClassificationPage";
import { InventoryAlertsPage } from "./pages/store-owner/InventoryAlertsPage";
import { ReplenishmentRequestsPage } from "./pages/store-owner/ReplenishmentRequestsPage";
import { AccountStoreInfoPage } from "./pages/store-owner/AccountStoreInfoPage";

// Warehouse Owner Pages
import { WarehousePortalPage } from "./pages/warehouse/WarehousePortalPage";

// Route Guard for Store Owner Portal
const RequireStoreOwner = ({ children }) => {
  const { role } = useAuth();
  if (role !== "STORE_OWNER") {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Route Guard for Warehouse Owner Portal
const RequireWarehouseOwner = ({ children }) => {
  const { role } = useAuth();
  if (role !== "WAREHOUSE_OWNER") {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const AppLayout = () => {
  const location = useLocation();
  const isOwnerRoute = location.pathname.startsWith("/owner");

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar />
      <div className="flex-1 flex">
        {isOwnerRoute && <Sidebar />}
        <main className={`flex-1 p-4 sm:p-6 lg:p-8 ${!isOwnerRoute ? "max-w-7xl mx-auto w-full" : "overflow-x-hidden"}`}>
          <Routes>
            {/* Public and Customer Routes */}
            <Route path="/" element={<CustomerHomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/products" element={<ProductCatalogPage />} />
            <Route path="/products/:productId" element={<ProductDetailPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout/confirmation" element={<CheckoutConfirmationPage />} />
            <Route path="/my-bills" element={<MyBillsPage />} />
            <Route path="/purchase-history" element={<PurchaseHistoryPage />} />

            {/* Warehouse Owner Dedicated Portal */}
            <Route
              path="/warehouse/portal"
              element={
                <RequireWarehouseOwner>
                  <WarehousePortalPage />
                </RequireWarehouseOwner>
              }
            />

            {/* Store Owner Routes (Protected) */}
            <Route
              path="/owner/dashboard"
              element={
                <RequireStoreOwner>
                  <StoreDashboardPage />
                </RequireStoreOwner>
              }
            />
            <Route
              path="/owner/inventory"
              element={
                <RequireStoreOwner>
                  <InventoryOverviewPage />
                </RequireStoreOwner>
              }
            />
            <Route
              path="/owner/inventory/:productId"
              element={
                <RequireStoreOwner>
                  <ProductInventoryDetailsPage />
                </RequireStoreOwner>
              }
            />
            <Route
              path="/owner/predictions"
              element={
                <RequireStoreOwner>
                  <DemandForecastingPage />
                </RequireStoreOwner>
              }
            />
            <Route
              path="/owner/classification"
              element={
                <RequireStoreOwner>
                  <InventoryClassificationPage />
                </RequireStoreOwner>
              }
            />
            <Route
              path="/owner/alerts"
              element={
                <RequireStoreOwner>
                  <InventoryAlertsPage />
                </RequireStoreOwner>
              }
            />
            <Route
              path="/owner/replenishment"
              element={
                <RequireStoreOwner>
                  <ReplenishmentRequestsPage />
                </RequireStoreOwner>
              }
            />
            <Route
              path="/owner/account"
              element={
                <RequireStoreOwner>
                  <AccountStoreInfoPage />
                </RequireStoreOwner>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <AppLayout />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
