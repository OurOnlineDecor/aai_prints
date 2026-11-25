import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  RefreshCw,
  Search,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  ShoppingBag,
  Sparkles,
  MapPin,
  CreditCard,
  Copy,
  Check,
  ArrowRight,
  LogIn,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchMyOrders, trackOrderGuest } from '../services/orderService';
import './OrdersPage.css';

export default function OrdersPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'delivered' | 'cancelled'

  // Guest Order Tracker state
  const [showTracker, setShowTracker] = useState(false);
  const [trackOrderNum, setTrackOrderNum] = useState('');
  const [trackContact, setTrackContact] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [trackError, setTrackError] = useState(null);
  const [guestTrackedOrder, setGuestTrackedOrder] = useState(null);

  // Load orders function
  const loadOrders = async () => {
    setIsLoading(true);
    try {
      let serverOrders = [];
      if (isAuthenticated) {
        serverOrders = await fetchMyOrders();
      }

      let localOrders = [];
      try {
        localOrders = JSON.parse(localStorage.getItem('aaiprints_orders') || '[]');
      } catch (e) {
        localOrders = [];
      }

      // Merge & deduplicate by orderNumber or _id
      const seen = new Set();
      const combined = [];
      [...serverOrders, ...localOrders].forEach((ord) => {
        if (!ord) return;
        const key = ord.orderNumber || ord._id;
        if (key && !seen.has(key)) {
          seen.add(key);
          combined.push(ord);
        }
      });

      // Sort by newest first
      combined.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.orderDate || 0).getTime();
        const dateB = new Date(b.createdAt || b.orderDate || 0).getTime();
        return dateB - dateA;
      });

      setOrders(combined);
    } catch (err) {
      console.warn('[OrdersPage] Could not load orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [isAuthenticated]);

  // Copy order ID helper
  const handleCopy = (id) => {
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Guest track submit
  const handleTrackSubmit = async (e) => {
    e.preventDefault();
    if (!trackOrderNum.trim() || !trackContact.trim()) return;

    setIsTracking(true);
    setTrackError(null);
    setGuestTrackedOrder(null);

    try {
      const order = await trackOrderGuest({
        orderNumber: trackOrderNum.trim(),
        contact: trackContact.trim(),
      });
      if (order) {
        setGuestTrackedOrder(order);
      } else {
        setTrackError('No matching order found. Please check your order number and contact details.');
      }
    } catch (err) {
      setTrackError(err?.message || 'Could not locate order with the provided details.');
    } finally {
      setIsTracking(false);
    }
  };

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const orderNum = (ord.orderNumber || ord._id || '').toLowerCase();
      const status = (ord.status || 'confirmed').toLowerCase();
      const items = ord.items || [];
      const itemNames = items.map((it) => (it.name || it.product?.name || '').toLowerCase()).join(' ');

      // Search match
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || orderNum.includes(q) || itemNames.includes(q);

      // Status match
      let matchesStatus = true;
      if (statusFilter === 'in_progress') {
        matchesStatus = ['confirmed', 'processing', 'shipped', 'pending'].includes(status);
      } else if (statusFilter === 'delivered') {
        matchesStatus = status === 'delivered';
      } else if (statusFilter === 'cancelled') {
        matchesStatus = status === 'cancelled';
      }

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  return (
    <div className="orders-page-container">
      {/* ── Breadcrumb Bar ── */}
      <nav className="orders-breadcrumb" aria-label="Breadcrumb">
        <div className="orders-breadcrumb-inner">
          <Link to="/" className="orders-crumb-link">Home</Link>
          <span className="orders-crumb-sep">/</span>
          <span className="orders-crumb-current">My Orders</span>
        </div>
      </nav>

      {/* ── Hero Header ── */}
      <header className="orders-hero">
        <div className="orders-hero-content">
          <div className="orders-hero-badge">
            <Package size={14} />
            <span>Order History &amp; Tracking</span>
          </div>
          <h1 className="orders-hero-title">My Orders</h1>
          <p className="orders-hero-subtitle">
            Track live fulfillment updates, view purchased home decor pieces, and manage your delivery details.
          </p>
        </div>

        <div className="orders-hero-actions">
          <button
            type="button"
            className="orders-refresh-btn"
            onClick={loadOrders}
            title="Refresh order statuses"
          >
            <RefreshCw size={14} className={isLoading ? 'spin-anim' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className={`orders-track-toggle-btn ${showTracker ? 'active' : ''}`}
            onClick={() => setShowTracker(!showTracker)}
          >
            <Search size={14} />
            <span>{showTracker ? 'Close Tracker' : 'Track by Order #'}</span>
          </button>
        </div>
      </header>

      {/* ── Guest / Quick Order Lookup Drawer / Card ── */}
      <AnimatePresence>
        {showTracker && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="orders-guest-tracker-card"
          >
            <div className="tracker-card-header">
              <Sparkles size={18} className="tracker-header-icon" />
              <div>
                <h3>Track a Specific Order</h3>
                <p>Have an Order ID from an SMS, email, or guest checkout? Enter it below to check instant live status.</p>
              </div>
            </div>

            <form onSubmit={handleTrackSubmit} className="tracker-form">
              <div className="tracker-form-inputs">
                <div className="tracker-input-group">
                  <label htmlFor="track-order-id">Order ID *</label>
                  <input
                    id="track-order-id"
                    type="text"
                    required
                    placeholder="e.g. AAI-830859-1190"
                    value={trackOrderNum}
                    onChange={(e) => setTrackOrderNum(e.target.value)}
                  />
                </div>

                <div className="tracker-input-group">
                  <label htmlFor="track-contact">Phone Number or Email *</label>
                  <input
                    id="track-contact"
                    type="text"
                    required
                    placeholder="Registered phone or email"
                    value={trackContact}
                    onChange={(e) => setTrackContact(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="tracker-submit-btn"
                  disabled={isTracking}
                >
                  {isTracking ? (
                    <>
                      <RefreshCw size={14} className="spin-anim" />
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <Search size={14} />
                      <span>Track Order</span>
                    </>
                  )}
                </button>
              </div>

              {trackError && (
                <div className="tracker-error-alert">
                  <AlertCircle size={15} />
                  <span>{trackError}</span>
                </div>
              )}
            </form>

            {guestTrackedOrder && (
              <div className="tracker-result-card">
                <div className="tracker-result-header">
                  <div>
                    <span className="tracker-result-badge">LOOKUP RESULT</span>
                    <h4>Order #{guestTrackedOrder.orderNumber}</h4>
                    <span className="tracker-result-date">
                      {new Date(guestTrackedOrder.createdAt || Date.now()).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <span className={`order-status-pill ${(guestTrackedOrder.status || 'confirmed').toLowerCase()}`}>
                    {(guestTrackedOrder.status || 'confirmed').toUpperCase()}
                  </span>
                </div>

                <div className="tracker-result-items">
                  {(guestTrackedOrder.items || []).map((it, idx) => (
                    <div key={idx} className="tracker-result-item-row">
                      <img
                        src={it.image || it.product?.images?.[0]?.url || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=100&auto=format&fit=crop&q=60'}
                        alt={it.name || 'Decor Item'}
                      />
                      <div>
                        <strong>{it.name || it.product?.name || 'Art Piece'}</strong>
                        <span>Qty: {it.quantity || 1} • ₹{((it.price || it.product?.basePrice || 0) * (it.quantity || 1)).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {guestTrackedOrder.adminMessage && (
                  <div className="order-admin-note">
                    <Sparkles size={14} />
                    <span><strong>Store Note:</strong> {guestTrackedOrder.adminMessage}</span>
                  </div>
                )}
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── Non-Auth Notice (If Guest) ── */}
      {!isAuthenticated && (
        <div className="orders-auth-prompt-banner">
          <div className="auth-prompt-left">
            <LogIn size={18} />
            <div>
              <strong>Sync Orders Across All Devices</strong>
              <p>Sign in to your OurOnlineDecor account to securely save and access your order history from anywhere.</p>
            </div>
          </div>
          <button
            type="button"
            className="auth-prompt-btn"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('auth:open-drawer', { detail: { view: 'login' } }));
            }}
          >
            <span>Sign In / Create Account</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* ── Toolbar: Search & Status Filters ── */}
      <section className="orders-toolbar">
        <div className="orders-search-wrap">
          <Search size={16} className="orders-search-icon" />
          <input
            type="text"
            placeholder="Search by Order ID or item name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="orders-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="orders-search-clear"
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </div>

        <div className="orders-filter-chips">
          <button
            type="button"
            className={`orders-filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Orders ({orders.length})
          </button>
          <button
            type="button"
            className={`orders-filter-chip ${statusFilter === 'in_progress' ? 'active' : ''}`}
            onClick={() => setStatusFilter('in_progress')}
          >
            In Progress
          </button>
          <button
            type="button"
            className={`orders-filter-chip ${statusFilter === 'delivered' ? 'active' : ''}`}
            onClick={() => setStatusFilter('delivered')}
          >
            Delivered
          </button>
          <button
            type="button"
            className={`orders-filter-chip ${statusFilter === 'cancelled' ? 'active' : ''}`}
            onClick={() => setStatusFilter('cancelled')}
          >
            Cancelled
          </button>
        </div>
      </section>

      {/* ── Orders Listing View ── */}
      {isLoading ? (
        <div className="orders-loading-state">
          <RefreshCw size={28} className="spin-anim" />
          <span>Fetching your orders...</span>
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className="orders-cards-grid">
          {filteredOrders.map((ord) => {
            const orderNum = ord.orderNumber || ord._id;
            const orderDate = ord.createdAt || ord.orderDate
              ? new Date(ord.createdAt || ord.orderDate).toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })
              : 'Recent Order';

            const status = (ord.status || 'confirmed').toLowerCase();
            const items = ord.items || [];
            const addr = ord.shippingAddress || {};
            const total = ord.pricing?.total != null ? ord.pricing.total : (ord.totalAmount || 0);
            const isCOD = (ord.paymentMethod || '').toLowerCase() === 'cod';

            return (
              <article key={ord._id || orderNum} className="order-main-card">
                {/* Header */}
                <header className="order-card-header">
                  <div className="order-card-meta">
                    <div className="order-id-group">
                      <span className="order-id-label">ORDER ID</span>
                      <strong className="order-id-val">#{orderNum}</strong>
                      <button
                        type="button"
                        className="order-copy-btn"
                        onClick={() => handleCopy(orderNum)}
                        title="Copy Order ID"
                      >
                        {copiedId === orderNum ? <Check size={12} color="#166534" /> : <Copy size={12} />}
                      </button>
                    </div>
                    <div className="order-date-text">
                      <Clock size={12} />
                      <span>{orderDate}</span>
                    </div>
                  </div>

                  <div className="order-status-group">
                    <span className={`order-status-pill ${status}`}>
                      {status === 'confirmed' && <CheckCircle2 size={12} />}
                      {status === 'shipped' && <Truck size={12} />}
                      {status === 'processing' && <RefreshCw size={12} />}
                      <span>{status.toUpperCase()}</span>
                    </span>
                  </div>
                </header>

                {/* Items List */}
                <div className="order-items-wrapper">
                  {items.map((it, idx) => {
                    const price = Number(it.price || it.product?.basePrice || 0);
                    const qty = it.quantity || 1;
                    const imgUrl = it.image || it.product?.images?.[0]?.url || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=160&auto=format&fit=crop&q=70';

                    return (
                      <div key={idx} className="order-item-row">
                        <img
                          src={imgUrl}
                          alt={it.name || 'Home Decor Product'}
                          className="order-item-img"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=160&auto=format&fit=crop&q=70';
                          }}
                        />
                        <div className="order-item-details">
                          <h4 className="order-item-name">{it.name || it.product?.name || 'Handcrafted Decor Piece'}</h4>
                          {it.variantName && (
                            <span className="order-item-variant">Variant: {it.variantName}</span>
                          )}
                          <div className="order-item-pricing">
                            <span className="order-item-qty">Qty: {qty}</span>
                            <span className="order-item-sep">•</span>
                            <span className="order-item-cost">₹{(price * qty).toLocaleString('en-IN')}</span>
                            {qty > 1 && (
                              <span className="order-item-unit">(₹{price.toLocaleString('en-IN')} each)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Store Admin Message / Status Note */}
                {ord.adminMessage && (
                  <div className="order-admin-note">
                    <Sparkles size={14} className="order-admin-sparkle" />
                    <div className="order-admin-note-content">
                      <strong>Store Fulfillment Update:</strong>
                      <p>{ord.adminMessage}</p>
                    </div>
                  </div>
                )}

                {/* Footer / Summary Info */}
                <footer className="order-card-footer">
                  <div className="order-footer-details">
                    <div className="order-detail-column">
                      <div className="order-detail-label">
                        <MapPin size={12} />
                        <span>DELIVERING TO</span>
                      </div>
                      <p className="order-detail-text">
                        <strong>{addr.fullName || 'Customer'}</strong>
                        <br />
                        {addr.street || 'Address on file'}{addr.city ? `, ${addr.city}` : ''}
                        {addr.postalCode ? ` - ${addr.postalCode}` : ''}
                      </p>
                    </div>

                    <div className="order-detail-column">
                      <div className="order-detail-label">
                        <CreditCard size={12} />
                        <span>PAYMENT MODE</span>
                      </div>
                      <p className="order-detail-text">
                        <strong>{isCOD ? 'Cash on Delivery (COD)' : 'Online / Razorpay'}</strong>
                        <br />
                        Status: <span className="order-payment-status">{(ord.paymentStatus || (isCOD ? 'Pending' : 'Paid')).toUpperCase()}</span>
                      </p>
                    </div>
                  </div>

                  <div className="order-footer-actions">
                    <div className="order-total-block">
                      <span className="order-total-label">TOTAL AMOUNT</span>
                      <strong className="order-total-val">₹{Number(total).toLocaleString('en-IN')}</strong>
                    </div>

                    <a
                      href={`https://wa.me/917014945523?text=${encodeURIComponent(`Namaste OurOnlineDecor, I am inquiring regarding the status of my Order #${orderNum}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="order-whatsapp-btn"
                      title="Contact customer support on WhatsApp"
                    >
                      <MessageSquare size={14} />
                      <span>Order Help</span>
                    </a>
                  </div>
                </footer>
              </article>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="orders-empty-state">
          <div className="orders-empty-icon-wrap">
            <Package size={36} />
          </div>
          <h3>No Orders Found</h3>
          <p>
            {searchQuery || statusFilter !== 'all'
              ? 'No orders match your search or filter criteria. Try clearing your search.'
              : 'You haven’t placed any orders yet. Discover our curated collection of spiritual canvas art, metallic wall decor, and artisan clocks.'}
          </p>
          <div className="orders-empty-buttons">
            {(searchQuery || statusFilter !== 'all') ? (
              <button
                type="button"
                className="orders-empty-action-btn"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
              >
                Reset Filters
              </button>
            ) : (
              <button
                type="button"
                className="orders-empty-action-btn"
                onClick={() => navigate('/shop')}
              >
                <ShoppingBag size={15} />
                <span>Explore Shop Catalog</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
