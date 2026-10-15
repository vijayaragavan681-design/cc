import axios from "axios";

const getSavedToken = () => {
  try {
    const saved = localStorage.getItem("smart_retail_user");
    if (saved) {
      const user = JSON.parse(saved);
      return user.token;
    }
  } catch (e) {
    // fallback
  }
  return "mock-customer-1";
};

export const retailApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8001",
});

export const inventoryApi = axios.create({
  baseURL: import.meta.env.VITE_INVENTORY_API_BASE_URL || "http://localhost:8002",
});

export const warehouseApi = axios.create({
  baseURL: import.meta.env.VITE_WAREHOUSE_API_BASE_URL || "http://localhost:8003",
});

// Attach Authorization header automatically
const attachAuthInterceptor = (apiInstance) => {
  apiInstance.interceptors.request.use((config) => {
    const token = getSavedToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
};

attachAuthInterceptor(retailApi);
attachAuthInterceptor(inventoryApi);
attachAuthInterceptor(warehouseApi);
