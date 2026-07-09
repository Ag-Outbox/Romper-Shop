import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles/globals.css';
import Home from './pages/Home';
import Category from './pages/Category';
import Search from './pages/Search';
import Product from './pages/Product';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/categoria/:slug" element={<Category />} />
        <Route path="/busca" element={<Search />} />
        <Route path="/produto/:slug" element={<Product />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/pedido/:id" element={<OrderConfirmation />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
