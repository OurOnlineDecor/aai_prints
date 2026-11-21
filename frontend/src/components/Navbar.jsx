import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  User,
  Heart,
  ShoppingBag,
  X,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Building2
} from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { fetchInstantSearch } from '../services/productService';
import { navLinks, getActiveNavLabel } from '../data/navigationConfig';
import './Navbar.css';

export default function Navbar({
  products = [],
  currentPage,
  selectedCategory,
  onNavigate,
  onSelectProduct,
  onOpenAccount,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { wishlistCount, cartCount, setIsWishlistOpen, setIsCartOpen } = useWishlist();
  const { isAuthenticated, user } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [mobileSubmenu, setMobileSubmenu] = useState(null);

  // Search feature states
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [liveSearchResults, setLiveSearchResults] = useState([]);
  const searchInputRef = useRef(null);

  // Debounced live instant search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setLiveSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      fetchInstantSearch(searchQuery).then((results) => {
        if (results && results.length > 0) {
          setLiveSearchResults(results);
        }
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Auto-focus input when search opens
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [searchOpen]);

  // Close search and mobile menu when Escape key is pressed
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (searchOpen) setSearchOpen(false);
        if (menuOpen) setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, menuOpen]);

  // Lock background body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [menuOpen]);

  // Auto-close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  // Auto-close mobile menu on desktop viewport resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 960) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMobileSubmenu = (label) => {
    setMobileSubmenu((prev) => (prev === label ? null : label));
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
    setLiveSearchResults([]);
  };

  // Filter products: prefer live backend results, fallback to client-side matching if provided
  const filteredProducts = searchQuery.trim()
    ? (liveSearchResults.length > 0
      ? liveSearchResults
      : products.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      ))
    : [];

  // Navigate to matching product on click or enter
  const handleSelectProduct = (product) => {
    closeSearch();
    if (onSelectProduct) {
      onSelectProduct(product);
      return;
    }
    const targetSlug = product.slug || product.id;
    navigate(`/product/${targetSlug}`);
  };

  // Handle Enter key on search input
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts.length > 0) {
        handleSelectProduct(filteredProducts[0]);
      }
    }
  };

  const handleNavClick = (e, link) => {
    e.preventDefault();
    setMenuOpen(false);
    if (onNavigate) {
      onNavigate(link.page, link.category || 'All');
    } else {
      const cleanPath = link.href.replace(/^#/, '');
      navigate(cleanPath || '/');
    }
  };

  // Strictly compute at most ONE active top-level navigation label
  const resolvedPage = currentPage || (
    location.pathname === '/' ? 'home' :
      location.pathname.startsWith('/shop') ? 'shop' :
        location.pathname.startsWith('/custom') ? 'custom-product' : ''
  );
  const resolvedCategory = selectedCategory || searchParams.get('category') || 'All';
  const activeNavLabel = getActiveNavLabel(resolvedPage, resolvedCategory);

  return (
    <header className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-inner">

        {/* aai Prints Brand Logo */}
        <a
          href="/"
          className="navbar-logo"
          aria-label="aai Prints Home"
          onClick={(e) => {
            e.preventDefault();
            if (onNavigate) {
              onNavigate('home');
            } else {
              navigate('/');
            }
          }}
        >
          <img
            src="/new-images/logo.png?v=2"
            alt="aai Prints"
            className="site-logo"
          />
        </a>

        {/* ── Desktop Nav ── */}
        <nav className="nav-links" aria-label="Site navigation">
          {navLinks.map((link) => {
            const isActive = link.label === activeNavLabel;

            return (
              <div
                key={link.label}
                className="nav-item-wrap"
                onMouseEnter={() => link.hasDropdown && setOpenDropdown(link.label)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <a
                  href={link.href}
                  className={`nav-link ${isActive ? 'nav-link--active' : ''}`}
                  onClick={(e) => handleNavClick(e, link)}
                >
                  {link.label}
                  {link.hasDropdown && <ChevronDown size={11} strokeWidth={2.4} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />}
                </a>

                {link.hasDropdown && (
                  <AnimatePresence>
                    {openDropdown === link.label && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.15 }}
                        className="nav-dropdown is-visible"
                        role="menu"
                      >
                        {link.children.map((child) => {
                          const isChildActive =
                            Boolean(selectedCategory) &&
                            String(selectedCategory).toLowerCase().trim() === (child.category || '').toLowerCase().trim();

                          return (
                            <a
                              key={child.label}
                              href={child.href}
                              className={`nav-dropdown-item ${isChildActive ? 'nav-dropdown-item--active' : ''}`}
                              role="menuitem"
                              onClick={(e) => {
                                if (onNavigate) {
                                  e.preventDefault();
                                  if (child.page === 'custom-product') {
                                    onNavigate('custom-product', child.slug);
                                  } else {
                                    onNavigate(child.page || 'shop', child.category || 'All');
                                  }
                                  setOpenDropdown(null);
                                }
                              }}
                            >
                              {child.label}
                            </a>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            );
          })}
        </nav>

        {/* ── Right Icons: Search, Wholesale Portal, Admin Portal, Account, Wishlist, Cart ── */}
        <div className="navbar-icons">
          {/* 1. Desktop Bulk Trigger Button (Text + Icon) */}
          <a
            href="#/b2b"
            className={`navbar-wholesale-btn desktop-only-flex ${currentPage === 'b2b' ? 'active' : ''}`}
            title="Bulk Orders"
            onClick={(e) => {
              e.preventDefault();
              if (onNavigate) {
                onNavigate('b2b');
              } else {
                navigate('/b2b');
              }
            }}
          >
            <Building2 size={13} strokeWidth={2.4} className="navbar-wholesale-icon" />
            <span className="navbar-wholesale-text">Bulk</span>
            <span className="navbar-wholesale-dot" />
          </a>

          {/* 2. Mobile Bulk Symbol Icon Button */}
          <a
            href="#/b2b"
            className={`icon-btn mobile-only-flex mobile-bulk-btn ${currentPage === 'b2b' ? 'icon-btn--active' : ''}`}
            title="Bulk"
            aria-label="Bulk"
            onClick={(e) => {
              e.preventDefault();
              setMenuOpen(false);
              if (onNavigate) {
                onNavigate('b2b');
              } else {
                navigate('/b2b');
              }
            }}
          >
            <Building2 size={19} strokeWidth={2} />
          </a>

          {/* 3. Quick Search Trigger (Desktop & Mobile) */}
          <button
            className={`icon-btn search-trigger-btn ${searchOpen ? 'icon-btn--active' : ''}`}
            aria-label={searchOpen ? 'Close search' : 'Open search'}
            title="Search"
            onClick={() => {
              setSearchOpen((prev) => !prev);
              setMenuOpen(false);
            }}
            aria-expanded={searchOpen}
          >
            <Search size={19} strokeWidth={2} />
          </button>

          {/* 4. Account (Desktop only - mobile moves inside hamburger menu) */}
          <button
            className="icon-btn pos-rel desktop-only-flex"
            aria-label={isAuthenticated ? `Account (${user?.name || user?.email})` : "Account"}
            title={isAuthenticated ? `Account (${user?.name || user?.email})` : "Account"}
            onClick={onOpenAccount}
          >
            <User size={19} strokeWidth={2} />
            {isAuthenticated && (
              <span
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  border: '1.5px solid #fff'
                }}
              />
            )}
          </button>

          {/* 5. Wishlist (Desktop only - mobile moves inside hamburger menu) */}
          <button
            className={`icon-btn pos-rel desktop-only-flex ${currentPage === 'wishlist' ? 'icon-btn--active' : ''}`}
            aria-label={`Wishlist (${wishlistCount} items)`}
            title="Wishlist"
            onClick={() => setIsWishlistOpen(true)}
          >
            <Heart
              size={19}
              strokeWidth={2}
              fill={wishlistCount > 0 ? '#e53935' : 'none'}
              color={wishlistCount > 0 ? '#e53935' : 'currentColor'}
            />
            {wishlistCount > 0 && (
              <span className="icon-badge">
                {wishlistCount}
              </span>
            )}
          </button>

          {/* 6. Cart Button (Desktop & Mobile) */}
          <button
            className={`icon-btn pos-rel ${currentPage === 'cart' ? 'icon-btn--active' : ''}`}
            aria-label={`Cart (${cartCount} items)`}
            title="Cart"
            onClick={() => setIsCartOpen(true)}
          >
            <ShoppingBag size={19} strokeWidth={2} />
            {cartCount > 0 && (
              <span className="icon-badge">
                {cartCount}
              </span>
            )}
          </button>

          {/* 7. Hamburger Menu Trigger – mobile only */}
          <button
            className={`hamburger${menuOpen ? ' open' : ''}`}
            onClick={() => {
              setMenuOpen(!menuOpen);
              setSearchOpen(false);
            }}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      {/* ── Search Interface Drawer (Opens below Navbar) ── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="navbar-search-drawer"
            role="search"
            aria-label="Product Search"
          >
            <div className="search-bar-inner">
              <div className="search-input-box">
                <Search size={18} strokeWidth={2} className="search-input-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="search-input"
                  placeholder="Search for devotional art, frames, idols..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  aria-label="Search for products"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    aria-label="Clear search input"
                    title="Clear input"
                  >
                    <X size={14} strokeWidth={2.4} />
                  </button>
                )}
              </div>

              <button
                type="button"
                className="search-close-btn"
                onClick={closeSearch}
                aria-label="Close search"
                title="Close search (Esc)"
              >
                <X size={17} strokeWidth={2.4} />
                <span className="search-close-text">Close</span>
              </button>
            </div>

            {/* Dynamic Search Results */}
            {searchQuery.trim() && (
              <div className="search-results-wrapper">
                <div className="search-results-container">
                  {filteredProducts.length > 0 ? (
                    <div className="search-results-list" role="listbox">
                      <div className="search-results-header">
                        <span>Found <strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'match' : 'matches'}</span>
                        <span className="search-results-hint">Press Enter or click to view</span>
                      </div>
                      {filteredProducts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="search-result-item"
                          role="option"
                          onClick={() => handleSelectProduct(p)}
                        >
                          <div className="search-result-img-wrap">
                            {p.image && !p.image.includes('placeholder') ? (
                              <img
                                src={p.image}
                                alt={p.name}
                                className="search-result-img"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="search-result-img-empty" />
                            )}
                          </div>
                          <div className="search-result-info">
                            <span className="search-result-name">{p.name}</span>
                            <span className="search-result-price">₹{p.price}</span>
                          </div>
                          <span className="search-result-action">
                            View <ArrowRight size={13} strokeWidth={2.5} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="search-no-results">
                      <p className="search-no-results-title">No products found</p>
                      <p className="search-no-results-desc">
                        No products matched "<strong>{searchQuery}</strong>". Try searching for <em>Ganesha</em>, <em>Ram Mandir</em>, <em>Frame</em>, <em>Clock</em>, or <em>Metal Art</em>.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile Dropdown Menu with Fixed Backdrop ── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {createPortal(
              <motion.div
                key="navbar-mobile-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="mobile-menu-backdrop"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />,
              document.body
            )}
            <motion.nav
              key="navbar-mobile-nav"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="mobile-menu"
              aria-label="Mobile navigation"
            >
              {navLinks.map((link) => {
                const isGroupActive = link.label === activeNavLabel;

                return (
                  <div key={link.label} className="mobile-nav-group">
                    <div className="mobile-nav-row">
                      <a
                        href={link.href}
                        className={`mobile-nav-link ${isGroupActive ? 'mobile-nav-link--active' : ''}`}
                        onClick={(e) => {
                          if (!link.hasDropdown) {
                            handleNavClick(e, link);
                          } else {
                            e.preventDefault();
                            toggleMobileSubmenu(link.label);
                          }
                        }}
                      >
                        {link.label}
                      </a>
                      {link.hasDropdown && (
                        <button
                          type="button"
                          className="mobile-sub-toggle"
                          onClick={() => toggleMobileSubmenu(link.label)}
                          aria-label={`Toggle ${link.label} submenu`}
                        >
                          <ChevronRight
                            size={16}
                            strokeWidth={2}
                            className={`sub-chevron ${mobileSubmenu === link.label ? 'open' : ''}`}
                          />
                        </button>
                      )}
                    </div>
                    {link.hasDropdown && mobileSubmenu === link.label && (
                      <div className="mobile-sub-list">
                        {link.children.map((child) => {
                          const isChildActive =
                            Boolean(selectedCategory) &&
                            String(selectedCategory).toLowerCase().trim() === (child.category || '').toLowerCase().trim();

                          return (
                            <a
                              key={child.label}
                              href={child.href}
                              className={`mobile-sub-link ${isChildActive ? 'mobile-sub-link--active' : ''}`}
                              onClick={(e) => {
                                e.preventDefault();
                                setMenuOpen(false);
                                if (onNavigate) {
                                  if (child.page === 'custom-product') {
                                    onNavigate('custom-product', child.slug);
                                  } else {
                                    onNavigate(child.page || 'shop', child.category || 'All');
                                  }
                                } else {
                                  const cleanPath = child.href.replace(/^#/, '');
                                  navigate(cleanPath || '/');
                                }
                              }}
                            >
                              {child.label}
                            </a>
                          );
                        })}
                        <a
                          href={link.href}
                          className="mobile-sub-link mobile-sub-link--view-all"
                          onClick={(e) => {
                            e.preventDefault();
                            setMenuOpen(false);
                            if (onNavigate) {
                              onNavigate(link.page || 'shop', link.category || 'All');
                            } else {
                              const cleanPath = link.href.replace(/^#/, '');
                              navigate(cleanPath || '/');
                            }
                          }}
                        >
                          View All {link.label} →
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Quick Switch to Bulk Orders for Mobile */}
              <div className="mobile-wholesale-wrap">
                <a
                  href="#/b2b"
                  className={`mobile-wholesale-card ${currentPage === 'b2b' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setMenuOpen(false);
                    if (onNavigate) {
                      onNavigate('b2b');
                    } else {
                      navigate('/b2b');
                    }
                  }}
                >
                  <div className="mobile-wholesale-card-content">
                    <div className="mobile-wholesale-badge-top">
                      <Building2 size={13} strokeWidth={2.4} />
                      <span>BULK DIVISION</span>
                    </div>
                    <strong>Bulk Orders Portal</strong>
                    <p>Factory-direct tiered volume rates &amp; custom branding</p>
                  </div>
                  <span className="mobile-wholesale-arrow">→</span>
                </a>
              </div>

            {/* Quick Access Actions for Mobile Menu (Account, Wishlist, Cart) */}
            <div className="mobile-menu-footer">
              <button
                type="button"
                className="mobile-footer-link"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenAccount();
                }}
              >
                <User size={18} strokeWidth={2} />
                <span>
                  {isAuthenticated
                    ? `Account (${user?.name || user?.email || 'Profile'})`
                    : 'Sign In / Register'}
                </span>
              </button>
              <button
                type="button"
                className="mobile-footer-link"
                onClick={() => {
                  setMenuOpen(false);
                  setIsWishlistOpen(true);
                }}
              >
                <Heart size={18} strokeWidth={2} fill={wishlistCount > 0 ? '#e53935' : 'none'} color={wishlistCount > 0 ? '#e53935' : 'currentColor'} />
                <span>Wishlist ({wishlistCount})</span>
              </button>
              <button
                type="button"
                className="mobile-footer-link"
                onClick={() => {
                  setMenuOpen(false);
                  setIsCartOpen(true);
                }}
              >
                <ShoppingBag size={18} strokeWidth={2} />
                <span>Cart ({cartCount})</span>
              </button>
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
    </header>
  );
}
