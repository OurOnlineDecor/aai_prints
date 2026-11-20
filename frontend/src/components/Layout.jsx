import { useState, useEffect, useLayoutEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import RouteProgressBar from './RouteProgressBar';
import AnnouncementBar from './AnnouncementBar';
import Navbar from './Navbar';
import Footer from './Footer';
import WishlistDrawer from './WishlistDrawer';
import CartDrawer from './CartDrawer';
import AccountDrawer from './AccountDrawer';
import BackToTop from './BackToTop';
import FloatingWhatsApp from './FloatingWhatsApp';

/**
 * HashRedirector:
 * Seamlessly catches legacy hash URLs (e.g. #/shop, #/product/xyz, #/cart, #b2b)
 * and redirects to clean real routes (/shop, /product/xyz, /cart, /b2b),
 * ensuring 100% backward compatibility for existing user bookmarks and links.
 */
function HashRedirector() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleHashCheck = () => {
      const hash = window.location.hash;
      if (!hash) return;

      if (hash.startsWith('#/')) {
        const cleanPath = hash.slice(1);
        window.history.replaceState(null, '', cleanPath);
        navigate(cleanPath, { replace: true });
      } else if (hash === '#b2b') {
        window.history.replaceState(null, '', '/b2b');
        navigate('/b2b', { replace: true });
      } else if (hash === '#shop') {
        window.history.replaceState(null, '', '/shop');
        navigate('/shop', { replace: true });
      } else if (hash === '#cart') {
        window.history.replaceState(null, '', '/cart');
        navigate('/cart', { replace: true });
      } else if (hash === '#wishlist') {
        window.history.replaceState(null, '', '/wishlist');
        navigate('/wishlist', { replace: true });
      } else if (hash === '#checkout') {
        window.history.replaceState(null, '', '/checkout');
        navigate('/checkout', { replace: true });
      } else if (hash === '#reviews' || hash === '#/reviews') {
        setTimeout(() => {
          const el = document.getElementById('reviews');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    };

    handleHashCheck();
    window.addEventListener('hashchange', handleHashCheck);
    return () => window.removeEventListener('hashchange', handleHashCheck);
  }, [navigate]);

  return null;
}

/**
 * ScrollToTop:
 * Resets window scroll position synchronously before paint on every page navigation,
 * with exception for direct in-page anchor jumps like #reviews.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    if (hash === '#reviews' || hash === '#/reviews') {
      setTimeout(() => {
        const el = document.getElementById('reviews');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
}

/**
 * Layout:
 * Universal site layout containing the navigation bar, universal animated page view,
 * drawers, announcement bar, and persistent footer.
 */
export default function Layout() {
  const location = useLocation();
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  return (
    <div className="app">
      {/* ── Legacy Hash Auto-Redirector ── */}
      <HashRedirector />

      {/* ── Scroll To Top On Route Change ── */}
      <ScrollToTop />

      {/* ── Ultra-Luxury Laser Top Progress Bar ── */}
      <RouteProgressBar />

      {/* ── Top Announcement Bar ── */}
      <AnnouncementBar />

      {/* ── Universal Luxury Header / Navbar ── */}
      <Navbar onOpenAccount={() => setIsAccountOpen(true)} />

      {/* ── Main Content View (Silky Seamless Transition) ── */}
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0.75, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.22,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="universal-page-wrapper"
      >
        <Outlet />
      </motion.div>

      {/* ── Storefront Footer ── */}
      <Footer />

      {/* ── Wishlist Slide-in Drawer ── */}
      <WishlistDrawer />

      {/* ── Cart Slide-in Drawer ── */}
      <CartDrawer />

      {/* ── Account Slide-in Drawer ── */}
      <AccountDrawer
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
      />

      {/* ── Floating Tools: Direct WhatsApp Connect & Back-to-Top ── */}
      <BackToTop />
      <FloatingWhatsApp />
    </div>
  );
}
