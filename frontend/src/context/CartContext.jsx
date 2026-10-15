import React, { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [selectedStore, setSelectedStore] = useState(() => {
    return localStorage.getItem("smart_retail_store") || "STORE001";
  });

  const [cartItems, setCartItems] = useState(() => {
    const saved = localStorage.getItem("smart_retail_cart");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("smart_retail_store", selectedStore);
  }, [selectedStore]);

  useEffect(() => {
    localStorage.setItem("smart_retail_cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const changeStore = (newStoreId) => {
    if (newStoreId !== selectedStore) {
      if (cartItems.length > 0) {
        if (window.confirm("Switching stores will clear your current cart. Do you want to proceed?")) {
          setCartItems([]);
          setSelectedStore(newStoreId);
        }
      } else {
        setSelectedStore(newStoreId);
      }
    }
  };

  const addToCart = (product, quantity = 1) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.productId === product.productId);
      if (existing) {
        return prev.map((item) =>
          item.product.productId === product.productId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.product.productId === productId ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCartItems((prev) => prev.filter((item) => item.product.productId !== productId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const itemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = round(
    cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0),
    2
  );
  const tax = round(subtotal * 0.08, 2);
  const total = round(subtotal + tax, 2);

  function round(val, dec) {
    return Number(Math.round(val + "e" + dec) + "e-" + dec);
  }

  return (
    <CartContext.Provider
      value={{
        selectedStore,
        setSelectedStore: changeStore,
        cartItems,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        itemCount,
        subtotal,
        tax,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
