import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, Protected } from '../../shared/Auth';
import { ToastProvider, Empty } from '../../shared/UI';
import Login from '../../shared/Login';
import Layout from './Layout';
import Dashboard from './Dashboard';
import { Orders, OrderDetail } from './Orders';
import { Products, ProductEditor } from './Products';
import Inventory from './Inventory';
import { Customers, CustomerDetail, Users } from './People';
import { Payments, Shipments } from './Operations';
import '../../shared/base.css';
import './admin.css';
const manage = (element) => <Protected roles={['ADMIN', 'MANAGER']}>{element}</Protected>;
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<Login admin />} />
          <Route
            element={
              <Protected roles={['ADMIN', 'MANAGER', 'STAFF']}>
                <Layout />
              </Protected>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="products" element={manage(<Products />)} />
            <Route path="products/new" element={manage(<ProductEditor />)} />
            <Route path="products/:id" element={manage(<ProductEditor />)} />
            <Route path="inventory" element={manage(<Inventory />)} />
            <Route path="customers" element={manage(<Customers />)} />
            <Route path="customers/:id" element={manage(<CustomerDetail />)} />
            <Route path="payments" element={manage(<Payments />)} />
            <Route path="shipments" element={<Shipments />} />
            <Route path="analytics" element={manage(<Dashboard analytics />)} />
            <Route
              path="users"
              element={
                <Protected roles={['ADMIN']}>
                  <Users />
                </Protected>
              }
            />
            <Route
              path="*"
              element={
                <Empty
                  title="Page not found"
                  text="This page is not part of your workspace."
                  action={
                    <Link className="button" to="/">
                      Store overview
                    </Link>
                  }
                />
              }
            />
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  </BrowserRouter>,
);
