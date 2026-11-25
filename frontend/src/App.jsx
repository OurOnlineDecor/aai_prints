import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WishlistProvider } from './context/WishlistContext';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import AdminGuard from './components/AdminGuard';
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CustomProductDetailPage from './pages/CustomProductDetailPage';
import CartPage from './pages/CartPage';
import WishlistPage from './pages/WishlistPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import B2BPortalPage from './pages/B2BPortalPage';
import AdminAddProductPage from './pages/AdminAddProductPage';
import AdminB2BPage from './pages/AdminB2BPage';
import AdminReelsPage from './pages/AdminReelsPage';
import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <WishlistProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              {/* Storefront Home */}
              <Route index element={<HomePage />} />

              {/* Catalog / Shop */}
              <Route path="shop" element={<ShopPage />} />

              {/* Product Detail Views */}
              <Route path="product/:slug" element={<ProductDetailPage />} />
              <Route path="custom/:slug" element={<CustomProductDetailPage />} />

              {/* Commerce Flow */}
              <Route path="cart" element={<CartPage />} />
              <Route path="wishlist" element={<WishlistPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="my-orders" element={<OrdersPage />} />

              {/* Wholesale / B2B */}
              <Route path="b2b" element={<B2BPortalPage />} />

              {/* Administrator Studio Views */}
              <Route
                path="admin/add-product"
                element={
                  <AdminGuard>
                    <AdminAddProductPage />
                  </AdminGuard>
                }
              />
              <Route
                path="admin/b2b"
                element={
                  <AdminGuard>
                    <AdminB2BPage />
                  </AdminGuard>
                }
              />
              <Route
                path="admin/reels"
                element={
                  <AdminGuard>
                    <AdminReelsPage />
                  </AdminGuard>
                }
              />

              {/* Fallback & Catch-all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </WishlistProvider>
    </AuthProvider>
  );
}
