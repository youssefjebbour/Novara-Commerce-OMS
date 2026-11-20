import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../../shared/api';
import { useToast } from '../../shared/UI';
const CartContext = createContext();
function initial() {
  try {
    const items = JSON.parse(localStorage.getItem('novara-cart') || '[]');
    return Array.isArray(items)
      ? items.filter(
          (i) =>
            Number.isInteger(i.productId) &&
            Number.isInteger(i.quantity) &&
            i.quantity > 0 &&
            i.quantity <= 99,
        )
      : [];
  } catch {
    return [];
  }
}
export function CartProvider({ children }) {
  const [cart, setCart] = useState(initial),
    toast = useToast();
  useEffect(() => {
    localStorage.setItem('novara-cart', JSON.stringify(cart));
  }, [cart]);
  const add = (product, quantity = 1) => {
    const existing = cart.find((i) => i.productId === product.id)?.quantity || 0;
    if (existing + quantity > Math.min(product.stock, 99)) {
      toast('The available quantity is already in your bag.');
      return;
    }
    setCart((items) => {
      const found = items.find((i) => i.productId === product.id);
      return found
        ? items.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + quantity } : i))
        : [...items, { productId: product.id, quantity }];
    });
    toast(`${product.name} added to your bag`);
  };
  return (
    <CartContext.Provider
      value={{
        cart,
        add,
        count: cart.reduce((n, i) => n + i.quantity, 0),
        remove: (id) => setCart((c) => c.filter((i) => i.productId !== id)),
        quantity: (id, q) => setCart((c) => c.map((i) => (i.productId === id ? { ...i, quantity: q } : i))),
        clear: () => setCart([]),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
export const useCart = () => useContext(CartContext);
export function useCartProducts() {
  const { cart } = useCart();
  const [items, setItems] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const signature = JSON.stringify(cart);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    Promise.all(
      JSON.parse(signature).map(async (i) => {
        try {
          return { ...i, product: (await api.get(`/products/${i.productId}`)).data };
        } catch (e) {
          if (e.response?.status === 404) return { ...i, unavailable: true };
          throw e;
        }
      }),
    )
      .then((r) => {
        if (live) setItems(r);
      })
      .catch(() => {
        if (live) setError('Could not check current prices and stock. Please reload to try again.');
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [signature]);
  const subtotalCents = items.reduce(
      (s, i) => s + (i.product ? Math.round(Number(i.product.price) * 100) * i.quantity : 0),
      0,
    ),
    shippingCents = subtotalCents >= 10000 || items.length === 0 ? 0 : 995;
  return {
    items,
    loading,
    error,
    subtotal: subtotalCents / 100,
    shipping: shippingCents / 100,
    total: (subtotalCents + shippingCents) / 100,
    invalid: items.some((i) => i.unavailable || i.quantity > i.product.stock),
  };
}
