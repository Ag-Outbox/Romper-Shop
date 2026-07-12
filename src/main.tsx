import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles/globals.css';
import { AuthProvider } from './lib/auth';
import RequireAuth from './components/RequireAuth';
import ScrollToTop from './components/ScrollToTop';
import ReferralCapture from './components/ReferralCapture';
import MobileTabBar from './components/MobileTabBar';
import Home from './pages/Home';

/* Code-splitting: cada página vira um chunk próprio; só a Home entra no
   bundle inicial. O fallback é discreto — as páginas têm skeletons próprios. */
const Category = lazy(() => import('./pages/Category'));
const Search = lazy(() => import('./pages/Search'));
const Product = lazy(() => import('./pages/Product'));
const Store = lazy(() => import('./pages/Store'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'));
const Login = lazy(() => import('./pages/Login'));
const Account = lazy(() => import('./pages/Account'));
const SellerDashboard = lazy(() => import('./pages/SellerDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const BecomeSeller = lazy(() => import('./pages/BecomeSeller'));
const Affiliate = lazy(() => import('./pages/Affiliate'));
const NotFound = lazy(() => import('./pages/NotFound'));

function Fallback() {
  return <div className="grid min-h-[60vh] place-items-center text-sm text-fog">Carregando…</div>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <ReferralCapture />
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/categoria/:slug" element={<Category />} />
            <Route path="/busca" element={<Search />} />
            <Route path="/produto/:slug" element={<Product />} />
            <Route path="/loja/:slug" element={<Store />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/pedido/:id" element={<OrderConfirmation />} />
            <Route path="/entrar" element={<Login />} />
            <Route path="/conta" element={<RequireAuth><Account /></RequireAuth>} />
            <Route path="/vendedor" element={<RequireAuth role="seller"><SellerDashboard /></RequireAuth>} />
            <Route path="/admin" element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>} />
            <Route path="/vender" element={<RequireAuth><BecomeSeller /></RequireAuth>} />
            <Route path="/afiliado" element={<RequireAuth><Affiliate /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <MobileTabBar />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
