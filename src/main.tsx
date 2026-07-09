import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles/globals.css';
import { AuthProvider } from './lib/auth';
import RequireAuth from './components/RequireAuth';
import Home from './pages/Home';
import Category from './pages/Category';
import Search from './pages/Search';
import Product from './pages/Product';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import Login from './pages/Login';
import Account from './pages/Account';
import SellerDashboard from './pages/SellerDashboard';
import AdminDashboard from './pages/AdminDashboard';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/categoria/:slug" element={<Category />} />
          <Route path="/busca" element={<Search />} />
          <Route path="/produto/:slug" element={<Product />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/pedido/:id" element={<OrderConfirmation />} />
          <Route path="/entrar" element={<Login />} />
          <Route path="/conta" element={<RequireAuth><Account /></RequireAuth>} />
          <Route path="/vendedor" element={<RequireAuth role="seller"><SellerDashboard /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>} />
          <Route path="*" element={<Home />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
