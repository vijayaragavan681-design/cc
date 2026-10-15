import React, { createContext, useContext, useState, useEffect } from "react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig, loginRequest } from "./authConfig";

const AuthContext = createContext(null);

let msalInstance = null;
const isEntraConfigured =
  import.meta.env.VITE_AUTH_MODE === "ENTRA_ID" &&
  import.meta.env.VITE_AZURE_CLIENT_ID &&
  import.meta.env.VITE_AZURE_CLIENT_ID !== "dev-mock-client-id";

if (isEntraConfigured) {
  try {
    msalInstance = new PublicClientApplication(msalConfig);
    msalInstance.initialize().catch((err) => console.error("MSAL init error:", err));
  } catch (e) {
    console.warn("MSAL initialization skipped:", e);
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("smart_retail_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    // Default initial mock session: CUSTOMER
    return {
      userId: "cust-001",
      email: "customer001@example.com",
      role: "CUSTOMER",
      assignedStoreId: null,
      token: "mock-customer-1",
      name: "Alex Customer",
    };
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem("smart_retail_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("smart_retail_user");
    }
  }, [user]);

  const loginAsMock = (role, storeId = null) => {
    let mockUser;
    if (role === "STORE_OWNER") {
      const assigned = storeId || "STORE001";
      mockUser = {
        userId: `owner-${assigned.toLowerCase()}`,
        email: `owner_${assigned.toLowerCase()}@retail-smart.com`,
        role: "STORE_OWNER",
        assignedStoreId: assigned,
        token: `mock-owner-${assigned.toLowerCase()}`,
        name: `Manager (${assigned})`,
      };
    } else if (role === "WAREHOUSE_OWNER") {
      mockUser = {
        userId: "warehouse-manager-1",
        email: "warehouse_manager@retail-smart.com",
        role: "WAREHOUSE_OWNER",
        assignedStoreId: null,
        token: "mock-warehouse-manager",
        name: "Marcus Vance (Warehouse Manager)",
      };
    } else {
      mockUser = {
        userId: "cust-001",
        email: "customer001@example.com",
        role: "CUSTOMER",
        assignedStoreId: null,
        token: "mock-customer-1",
        name: "Alex Customer",
      };
    }
    setUser(mockUser);
  };

  const loginWithEntra = async () => {
    if (!msalInstance) {
      alert("Microsoft Entra ID is not configured or in MOCK mode. Falling back to Dev login.");
      loginAsMock("STORE_OWNER", "STORE001");
      return;
    }
    setLoading(true);
    try {
      const response = await msalInstance.loginPopup(loginRequest);
      const idClaims = response.idTokenClaims || {};
      const roles = idClaims.roles || [];

      let role = "CUSTOMER";
      if (roles.includes("STORE_OWNER")) role = "STORE_OWNER";

      const assignedStoreId = idClaims.store_id || idClaims.extension_storeId || "STORE001";

      const entraUser = {
        userId: response.account.homeAccountId,
        email: response.account.username,
        role: role,
        assignedStoreId: role === "STORE_OWNER" ? assignedStoreId : null,
        token: response.accessToken,
        name: response.account.name || response.account.username,
      };
      setUser(entraUser);
    } catch (err) {
      console.error("Entra ID login failed:", err);
      alert(`Microsoft Entra ID login error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    if (msalInstance && isEntraConfigured) {
      msalInstance.logoutPopup().catch(console.error);
    }
    setUser(null);
  };

  const getToken = () => {
    return user?.token || "mock-customer-1";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role,
        assignedStoreId: user?.assignedStoreId,
        isAuthenticated: !!user,
        loading,
        loginAsMock,
        loginWithEntra,
        logout,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
