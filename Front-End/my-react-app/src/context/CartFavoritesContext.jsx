import React, { createContext, useState, useEffect, useCallback } from 'react';

export const CartFavoritesContext = createContext();

export const CartFavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState([]);
  const [cart, setCart] = useState([]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favorites');
    const savedCart = localStorage.getItem('cart');

    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        console.error('Error loading favorites:', e);
      }
    }

    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Error loading cart:', e);
      }
    }
  }, []);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  // Add to favorites
  const addToFavorites = useCallback((product) => {
    setFavorites((prev) => {
      const exists = prev.find((p) => p.id === product.id && p.store === product.store);
      if (exists) {
        return prev; // Already in favorites
      }
      return [...prev, product];
    });
  }, []);

  // Remove from favorites
  const removeFromFavorites = useCallback((productId, store) => {
    setFavorites((prev) =>
      prev.filter((p) => !(p.id === productId && p.store === store))
    );
  }, []);

  // Check if product is in favorites
  const isFavorite = useCallback((productId, store) => {
    return favorites.some((p) => p.id === productId && p.store === store);
  }, [favorites]);

  // Toggle favorite
  const toggleFavorite = useCallback((product) => {
    if (isFavorite(product.id, product.store)) {
      removeFromFavorites(product.id, product.store);
    } else {
      addToFavorites(product);
    }
  }, [isFavorite, removeFromFavorites, addToFavorites]);

  // Add to cart
  const addToCart = useCallback((product, quantity = 1) => {
    setCart((prev) => {
      const exists = prev.find((p) => p.id === product.id && p.store === product.store);
      if (exists) {
        return prev.map((p) =>
          p.id === product.id && p.store === product.store
            ? { ...p, quantity: p.quantity + quantity }
            : p
        );
      }
      return [...prev, { ...product, quantity }];
    });
  }, []);

  // Remove from cart
  const removeFromCart = useCallback((productId, store) => {
    setCart((prev) =>
      prev.filter((p) => !(p.id === productId && p.store === store))
    );
  }, []);

  // Update cart quantity
  const updateCartQuantity = useCallback((productId, store, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId, store);
    } else {
      setCart((prev) =>
        prev.map((p) =>
          p.id === productId && p.store === store ? { ...p, quantity } : p
        )
      );
    }
  }, [removeFromCart]);

  // Clear cart
  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Get cart total
  const getCartTotal = useCallback(() => {
    return cart.reduce((total, item) => {
      return total + (item.price || 0) * (item.quantity || 0);
    }, 0);
  }, [cart]);

  const value = {
    favorites,
    cart,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    toggleFavorite,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    getCartTotal,
  };

  return (
    <CartFavoritesContext.Provider value={value}>
      {children}
    </CartFavoritesContext.Provider>
  );
};

// Custom hook to use the context
export const useCartFavorites = () => {
  const context = React.useContext(CartFavoritesContext);
  if (!context) {
    throw new Error('useCartFavorites must be used within CartFavoritesProvider');
  }
  return context;
};
