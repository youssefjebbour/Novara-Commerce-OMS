import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import { AuthProvider, Protected } from '../../shared/Auth';
import { ToastProvider, Empty } from '../../shared/UI';
import Login from '../../shared/Login';
import { CartProvider } from './CartContext';
import Layout from './Layout';
import Home from './Home';
import Catalog from './Catalog';
import Product from './Product';
import Cart from './Cart';
import Checkout from './Checkout';
import { AccountLayout, Profile, MyOrders, Addresses, CustomerOrder } from './Account';
import Help from './Help';
import '../../shared/base.css';
import './storefront.css';
function ScrollTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView());
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
}
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <ToastProvider>
        <CartProvider>
          <ScrollTop />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Login register />} />
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="products" element={<Catalog />} />
              <Route path="products/:id" element={<Product />} />
              <Route path="cart" element={<Cart />} />
              <Route
                path="checkout"
                element={
                  <Protected roles={['CUSTOMER']}>
                    <Checkout />
                  </Protected>
                }
              />
              <Route
                path="account"
                element={
                  <Protected>
                    <AccountLayout />
                  </Protected>
                }
              >
                <Route index element={<Profile />} />
                <Route path="orders" element={<MyOrders />} />
                <Route path="addresses" element={<Addresses />} />
              </Route>
              <Route
                path="account/orders/:id"
                element={
                  <Protected>
                    <CustomerOrder />
                  </Protected>
                }
              />
              <Route path="help" element={<Help />} />
              <Route
                path="*"
                element={
                  <Empty
                    title="Page not found"
                    text="Let’s get you back to the collection."
                    action={
                      <Link className="button" to="/">
                        Return home
                      </Link>
                    }
                  />
                }
              />
            </Route>
          </Routes>
        </CartProvider>
      </ToastProvider>
    </AuthProvider>
  </BrowserRouter>,
);
