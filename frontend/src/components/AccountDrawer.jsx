import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  X,
  LogOut,
  Package,
  MapPin,
  Heart,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Crown,
  ShoppingBag,
  ChevronRight,
  PlusCircle,
  Headphones,
  Building2,
  Film,
  ArrowLeft,
  Trash2,
  Edit2,
  Check,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { fetchMyOrders } from '../services/orderService';
import './AccountDrawer.css';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Chandigarh',
  'Jammu and Kashmir', 'Ladakh', 'Puducherry'
];

export default function AccountDrawer({ isOpen, onClose, onNavigate }) {
  const navigate = useNavigate();
  const handleNav = (target) => {
    if (onNavigate) {
      onNavigate(target);
    } else {
      if (target === 'shop') navigate('/shop');
      else if (target === 'cart') navigate('/cart');
      else if (target === 'wishlist') navigate('/wishlist');
      else if (target === 'b2b') navigate('/b2b');
      else if (target === 'admin-add-product') navigate('/admin/add-product');
      else if (target === 'admin-b2b') navigate('/admin/b2b');
      else if (target === 'admin-reels') navigate('/admin/reels');
      else if (typeof target === 'string' && target.startsWith('/')) navigate(target);
      else navigate('/' + target);
    }
  };

  const {
    user,
    isAuthenticated,
    login,
    register,
    logout,
    authError,
    addAddress,
    updateAddress,
    deleteAddress,
  } = useAuth();
  const { wishlistCount = 0, cartCount = 0, setIsWishlistOpen } = useWishlist();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [activeView, setActiveView] = useState('menu'); // 'menu' | 'addresses' | 'orders'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', phone: '', password: '' });

  // Address subview state
  const [editingAddress, setEditingAddress] = useState(null); // null | 'new' | address object
  const [addressForm, setAddressForm] = useState({
    fullName: '',
    phone: '',
    street: '',
    landmark: '',
    city: '',
    state: 'Maharashtra',
    postalCode: '',
    isDefault: false,
  });
  const [isAddressSaving, setIsAddressSaving] = useState(false);
  const [addressFeedback, setAddressFeedback] = useState(null);

  // Orders subview state
  const [myOrders, setMyOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Load orders when activeView is 'orders'
  const loadOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const serverOrders = await fetchMyOrders();
      let localOrders = [];
      try {
        localOrders = JSON.parse(localStorage.getItem('aaiprints_orders') || '[]');
      } catch (e) {
        localOrders = [];
      }
      const seen = new Set();
      const combined = [];
      [...serverOrders, ...localOrders].forEach((ord) => {
        const key = ord.orderNumber || ord._id;
        if (key && !seen.has(key)) {
          seen.add(key);
          combined.push(ord);
        }
      });
      setMyOrders(combined);
    } catch (err) {
      console.warn('[AccountDrawer] Could not load orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeView === 'orders') {
      loadOrders();
    }
  }, [isOpen, activeView]);

  // Address Handlers
  const handleOpenAddAddress = () => {
    setAddressForm({
      fullName: user?.name || '',
      phone: user?.phone || '',
      street: '',
      landmark: '',
      city: '',
      state: 'Maharashtra',
      postalCode: '',
      isDefault: !user?.addresses || user.addresses.length === 0,
    });
    setEditingAddress('new');
    setAddressFeedback(null);
  };

  const handleOpenEditAddress = (addr) => {
    setAddressForm({
      fullName: addr.fullName || '',
      phone: addr.phone || '',
      street: addr.street || '',
      landmark: addr.landmark || '',
      city: addr.city || '',
      state: addr.state || 'Maharashtra',
      postalCode: addr.postalCode || '',
      isDefault: Boolean(addr.isDefault),
    });
    setEditingAddress(addr);
    setAddressFeedback(null);
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!addressForm.fullName.trim() || !addressForm.street.trim() || !addressForm.city.trim() || !addressForm.postalCode.trim()) {
      setAddressFeedback({ type: 'error', message: 'Please complete all required address fields.' });
      return;
    }
    const cleanPhone = addressForm.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setAddressFeedback({ type: 'error', message: 'Please enter a valid 10-digit mobile number.' });
      return;
    }
    const cleanPin = addressForm.postalCode.replace(/\s/g, '');
    if (!/^\d{6}$/.test(cleanPin)) {
      setAddressFeedback({ type: 'error', message: 'Please enter a valid 6-digit Indian PIN code.' });
      return;
    }

    try {
      setIsAddressSaving(true);
      setAddressFeedback(null);
      if (editingAddress === 'new') {
        await addAddress(addressForm);
        setAddressFeedback({ type: 'success', message: 'Delivery address added successfully.' });
      } else if (editingAddress && (editingAddress._id || editingAddress.id)) {
        await updateAddress(editingAddress._id || editingAddress.id, addressForm);
        setAddressFeedback({ type: 'success', message: 'Delivery address updated successfully.' });
      }
      setEditingAddress(null);
    } catch (err) {
      setAddressFeedback({
        type: 'error',
        message: err.data?.message || err.message || 'Failed to save address. Please try again.',
      });
    } finally {
      setIsAddressSaving(false);
    }
  };

  const handleDeleteAddress = async (addrId) => {
    if (!window.confirm('Are you sure you want to delete this delivery address?')) return;
    try {
      setAddressFeedback(null);
      await deleteAddress(addrId);
      setAddressFeedback({ type: 'success', message: 'Address removed successfully.' });
    } catch (err) {
      setAddressFeedback({
        type: 'error',
        message: err.data?.message || err.message || 'Could not delete address.',
      });
    }
  };

  const handleSetDefaultAddress = async (addr) => {
    try {
      setAddressFeedback(null);
      await updateAddress(addr._id || addr.id, { ...addr, isDefault: true });
      setAddressFeedback({ type: 'success', message: 'Default address updated.' });
    } catch (err) {
      setAddressFeedback({
        type: 'error',
        message: err.data?.message || err.message || 'Could not set default address.',
      });
    }
  };

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setLocalError(null);
    } else {
      document.body.style.overflow = '';
      setActiveView('menu');
      setEditingAddress(null);
      setAddressFeedback(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginForm.email.trim() || !loginForm.password) return;

    try {
      setIsSubmitting(true);
      setLocalError(null);
      await login({ email: loginForm.email.trim(), password: loginForm.password });
      setLoginForm({ email: '', password: '' });
      setActiveView('menu');
    } catch (err) {
      const detailedMsg = err.data?.errors?.length
        ? err.data.errors.map((e) => e.message).join('. ')
        : (err.data?.message || err.message || 'Login failed. Please check your credentials.');
      setLocalError(detailedMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!registerForm.email.trim() || !registerForm.password || !registerForm.name.trim()) return;

    try {
      setIsSubmitting(true);
      setLocalError(null);
      await register({
        name: registerForm.name.trim(),
        email: registerForm.email.trim(),
        password: registerForm.password,
        phone: registerForm.phone.trim() || undefined,
      });
      setRegisterForm({ name: '', email: '', phone: '', password: '' });
      setActiveView('menu');
    } catch (err) {
      const detailedMsg = err.data?.errors?.length
        ? err.data.errors.map((e) => e.message).join('. ')
        : (err.data?.message || err.message || 'Registration failed. Please try again.');
      setLocalError(detailedMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsSubmitting(true);
      await logout();
      setActiveView('menu');
      setLoginForm({ email: '', password: '' });
      setRegisterForm({ name: '', email: '', phone: '', password: '' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayEmail = user?.email || '';
  const displayName = user?.name || displayEmail.split('@')[0] || 'User';

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="account-overlay"
          className="account-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          role="presentation"
        >
          <motion.aside
            key="account-drawer"
            className="account-drawer"
            role="dialog"
            aria-label="User Account"
            aria-modal="true"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div className="account-header">
              <div className="account-header-title">
                {activeView !== 'menu' ? (
                  <button
                    type="button"
                    className="account-sub-back-btn"
                    onClick={() => {
                      setActiveView('menu');
                      setEditingAddress(null);
                    }}
                    title="Back to Account Menu"
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>
                ) : (
                  <User size={20} strokeWidth={2} style={{ color: 'var(--teal)' }} />
                )}
                <h2>
                  {activeView === 'addresses'
                    ? 'Delivery Addresses'
                    : activeView === 'orders'
                    ? 'My Orders'
                    : 'My Account'}
                </h2>
              </div>
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                className="account-close-btn"
                onClick={onClose}
                aria-label="Close account panel"
                title="Close (Esc)"
              >
                <X size={18} strokeWidth={2} />
              </motion.button>
            </div>

        {/* ── Body ── */}
        <div className="account-body">
          {isAuthenticated && user ? (
            activeView === 'addresses' ? (
              /* ════════════════ VIEW: ADDRESS MANAGEMENT ════════════════ */
              <div className="account-addresses-view" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="account-sub-nav-bar">
                  <span className="account-sub-title">
                    {editingAddress ? (editingAddress === 'new' ? 'New Address' : 'Edit Address') : `Saved Addresses (${user.addresses?.length || 0})`}
                  </span>
                  {!editingAddress && (
                    <button
                      type="button"
                      className="account-sub-action-btn"
                      onClick={handleOpenAddAddress}
                    >
                      <PlusCircle size={13} />
                      <span>Add Address</span>
                    </button>
                  )}
                </div>

                {addressFeedback && (
                  <div
                    style={{
                      backgroundColor: addressFeedback.type === 'success' ? '#ecfdf5' : 'var(--badge-discount-bg)',
                      border: `1px solid ${addressFeedback.type === 'success' ? '#a7f3d0' : 'rgba(184, 50, 50, 0.3)'}`,
                      color: addressFeedback.type === 'success' ? '#065f46' : 'var(--badge-discount)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {addressFeedback.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                    <span>{addressFeedback.message}</span>
                  </div>
                )}

                {editingAddress ? (
                  /* ── Form: Add or Edit Address ── */
                  <form className="address-form-wrapper" onSubmit={handleSaveAddress}>
                    <h3 className="address-form-title">
                      {editingAddress === 'new' ? 'Add New Delivery Address' : 'Edit Delivery Address'}
                    </h3>

                    <div className="address-form-grid">
                      <div className="form-group">
                        <label>Full Name *</label>
                        <input
                          type="text"
                          required
                          value={addressForm.fullName}
                          onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                          placeholder="Recipient Name"
                          disabled={isAddressSaving}
                        />
                      </div>

                      <div className="form-group">
                        <label>Phone Number *</label>
                        <input
                          type="tel"
                          required
                          value={addressForm.phone}
                          onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                          placeholder="10-digit mobile"
                          disabled={isAddressSaving}
                        />
                      </div>

                      <div className="form-group full-span">
                        <label>Street Address / House / Flat No. *</label>
                        <input
                          type="text"
                          required
                          value={addressForm.street}
                          onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                          placeholder="House / Flat No., Building, Street"
                          disabled={isAddressSaving}
                        />
                      </div>

                      <div className="form-group full-span">
                        <label>Landmark / Area (Optional)</label>
                        <input
                          type="text"
                          value={addressForm.landmark}
                          onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                          placeholder="Near City Mall, Opposite Metro Station"
                          disabled={isAddressSaving}
                        />
                      </div>

                      <div className="form-group">
                        <label>City / Town *</label>
                        <input
                          type="text"
                          required
                          value={addressForm.city}
                          onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                          placeholder="City"
                          disabled={isAddressSaving}
                        />
                      </div>

                      <div className="form-group">
                        <label>State *</label>
                        <select
                          value={addressForm.state}
                          onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                          disabled={isAddressSaving}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--taupe-border, #EAE3D2)',
                            background: '#ffffff',
                            fontFamily: 'inherit',
                            fontSize: '13px',
                          }}
                        >
                          {INDIAN_STATES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>PIN Code *</label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={addressForm.postalCode}
                          onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                          placeholder="6-digit PIN"
                          disabled={isAddressSaving}
                        />
                      </div>

                      <div className="form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: '22px' }}>
                        <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                          <input
                            type="checkbox"
                            checked={addressForm.isDefault}
                            onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                            disabled={isAddressSaving}
                          />
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--teal-deep)' }}>Set as default</span>
                        </label>
                      </div>
                    </div>

                    <div className="address-form-actions">
                      <button
                        type="button"
                        className="address-form-btn-cancel"
                        onClick={() => {
                          setEditingAddress(null);
                          setAddressFeedback(null);
                        }}
                        disabled={isAddressSaving}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="address-form-btn-save"
                        disabled={isAddressSaving}
                      >
                        {isAddressSaving ? 'Saving Address...' : 'Save Delivery Address'}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* ── Address Cards List ── */
                  <div className="address-cards-list">
                    {user.addresses && user.addresses.length > 0 ? (
                      user.addresses.map((addr) => (
                        <div
                          key={addr._id || addr.id}
                          className={`address-card ${addr.isDefault ? 'is-default' : ''}`}
                        >
                          <div className="address-card-header">
                            <span className="address-card-name">{addr.fullName}</span>
                            {addr.isDefault && (
                              <span className="address-card-badge">
                                <Check size={11} /> Default
                              </span>
                            )}
                          </div>

                          <div className="address-card-phone">
                            <MapPin size={13} />
                            <span>+91 {addr.phone}</span>
                          </div>

                          <div className="address-card-body">
                            {addr.street}
                            {addr.landmark ? `, ${addr.landmark}` : ''}
                            <br />
                            {addr.city}, {addr.state} — {addr.postalCode}
                          </div>

                          <div className="address-card-actions">
                            <button
                              type="button"
                              className="address-action-btn"
                              onClick={() => handleOpenEditAddress(addr)}
                            >
                              <Edit2 size={12} />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              className="address-action-btn delete"
                              onClick={() => handleDeleteAddress(addr._id || addr.id)}
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                            {!addr.isDefault && (
                              <button
                                type="button"
                                className="address-action-btn set-default"
                                onClick={() => handleSetDefaultAddress(addr)}
                              >
                                <span>Make Default</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="account-empty-state">
                        <div className="account-empty-state-icon">
                          <MapPin size={24} />
                        </div>
                        <h4>No Delivery Addresses Saved</h4>
                        <p>Save your home, studio, or office address for seamless one-click order fulfillment.</p>
                        <button
                          type="button"
                          className="account-sub-action-btn"
                          style={{ marginTop: '8px' }}
                          onClick={handleOpenAddAddress}
                        >
                          <PlusCircle size={14} />
                          <span>Add Your First Address</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : activeView === 'orders' ? (
              /* ════════════════ VIEW: ORDER TRACKING ════════════════ */
              <div className="account-orders-view" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="account-sub-nav-bar">
                  <span className="account-sub-title">Order History ({myOrders.length})</span>
                  <button
                    type="button"
                    className="address-action-btn"
                    onClick={loadOrders}
                    title="Refresh orders list"
                  >
                    <RefreshCw size={12} className={isLoadingOrders ? 'spin-anim' : ''} />
                    <span>Refresh</span>
                  </button>
                </div>

                {isLoadingOrders ? (
                  <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                    <RefreshCw size={22} className="spin-anim" style={{ margin: '0 auto 10px', display: 'block', color: 'var(--teal)' }} />
                    <span style={{ fontSize: '13px' }}>Loading your orders...</span>
                  </div>
                ) : myOrders.length > 0 ? (
                  <div className="order-cards-list">
                    {myOrders.map((ord) => {
                      const orderNum = ord.orderNumber || ord._id;
                      const orderDate = ord.createdAt || ord.orderDate
                        ? new Date(ord.createdAt || ord.orderDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Recent';
                      const status = (ord.status || 'pending').toLowerCase();
                      const items = ord.items || [];
                      const total = ord.pricing?.total != null ? ord.pricing.total : (ord.totalAmount || 0);

                      return (
                        <div key={ord._id || orderNum} className="account-order-card">
                          <div className="account-order-header">
                            <div>
                              <div className="account-order-num">#{orderNum}</div>
                              <div className="account-order-date">{orderDate}</div>
                            </div>
                            <span className={`account-order-status-pill ${status}`}>
                              {status}
                            </span>
                          </div>

                          {/* Items Preview */}
                          <div className="account-order-items">
                            {items.map((it, idx) => (
                              <div key={idx} className="account-order-item-row">
                                <img
                                  src={it.image || (it.product && it.product.images?.[0]?.url) || '/placeholder.png'}
                                  alt={it.name || 'Order Item'}
                                  className="account-order-thumb"
                                  onError={(e) => {
                                    e.target.src = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=100&auto=format&fit=crop&q=60';
                                  }}
                                />
                                <div className="account-order-details">
                                  <div className="account-order-item-name">{it.name || it.product?.name || 'Art Print'}</div>
                                  <div className="account-order-item-meta">
                                    Qty: {it.quantity || 1} • ₹{((it.price != null ? it.price : (it.unitPrice || 0)) * (it.quantity || 1)).toLocaleString('en-IN')}
                                    {it.variantName ? ` (${it.variantName})` : ''}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Admin Note / Order Update Message */}
                          {ord.adminMessage && (
                            <div className="account-order-admin-note">
                              <div className="account-order-admin-note-header">
                                <Sparkles size={12} />
                                <span>Aai Prints Status Update</span>
                              </div>
                              <p>{ord.adminMessage}</p>
                            </div>
                          )}

                          {/* Footer */}
                          <div className="account-order-footer">
                            <span className="account-order-total">
                              Total: ₹{Number(total).toLocaleString('en-IN')}
                            </span>
                            <a
                              href={`https://wa.me/917014945523?text=${encodeURIComponent(`Namaste Aai Prints, I am checking on the status of my Order #${orderNum}.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="account-order-help-btn"
                              title="Chat about this order on WhatsApp"
                            >
                              <MessageSquare size={12} />
                              <span>Order Help</span>
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="account-empty-state">
                    <div className="account-empty-state-icon">
                      <Package size={24} />
                    </div>
                    <h4>No Orders Placed Yet</h4>
                    <p>Discover our gallery of museum-grade spiritual and abstract canvas art.</p>
                    <button
                      type="button"
                      className="account-sub-action-btn"
                      style={{ marginTop: '8px' }}
                      onClick={() => {
                        onClose();
                        handleNav('shop');
                      }}
                    >
                      <ShoppingBag size={14} />
                      <span>Start Shopping</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* ════════════════ VIEW: MAIN ACCOUNT MENU ════════════════ */
              <div className="account-profile-view">
                {/* 1. Hero Identity Card */}
                <div className="account-hero-card">
                  <div className="account-hero-avatar">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="account-hero-info">
                    <span className="account-user-badge">ACCOUNT</span>
                    <h3 className="account-user-name">{displayName}</h3>
                    <p className="account-user-email">{displayEmail}</p>
                    <div className="account-badge-wrapper">
                      {user.role === 'admin' ? (
                        <span className="account-badge-pill admin">
                          <Crown size={12} />
                          <span>Store Administrator</span>
                        </span>
                      ) : (
                        <span className="account-badge-pill member">
                          <Sparkles size={12} />
                          <span>Verified Customer</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Admin Direct Access Banners (If Admin) */}
                {user.role === 'admin' && (
                  <>
                    <div
                      className="account-admin-card"
                      onClick={() => {
                        onClose();
                        handleNav('admin-add-product');
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onClose();
                          handleNav('admin-add-product');
                        }
                      }}
                    >
                      <div className="account-admin-card-icon">
                        <PlusCircle size={22} />
                      </div>
                      <div className="account-admin-card-text">
                        <div className="account-admin-card-title">
                          <strong>Retail Catalog &amp; Orders</strong>
                        </div>
                        <p>Manage catalog, fulfill orders &amp; updates</p>
                      </div>
                      <ChevronRight size={18} className="account-admin-arrow" />
                    </div>

                    <div
                      className="account-admin-card"
                      style={{ borderColor: 'rgba(197, 155, 39, 0.45)' }}
                      onClick={() => {
                        onClose();
                        handleNav('admin-b2b');
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onClose();
                          handleNav('admin-b2b');
                        }
                      }}
                    >
                      <div className="account-admin-card-icon" style={{ background: 'var(--cream)', color: 'var(--gold)' }}>
                        <Building2 size={22} />
                      </div>
                      <div className="account-admin-card-text">
                        <div className="account-admin-card-title">
                          <strong>Wholesale Hub</strong>
                        </div>
                        <p>Manage wholesale catalog &amp; volume tiers</p>
                      </div>
                      <ChevronRight size={18} className="account-admin-arrow" />
                    </div>

                    <div
                      className="account-admin-card"
                      style={{ borderColor: 'rgba(197, 139, 89, 0.45)' }}
                      onClick={() => {
                        onClose();
                        handleNav('admin-reels');
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onClose();
                          handleNav('admin-reels');
                        }
                      }}
                    >
                      <div className="account-admin-card-icon" style={{ background: '#FFFCF5', color: '#D2B98C' }}>
                        <Film size={22} />
                      </div>
                      <div className="account-admin-card-text">
                        <div className="account-admin-card-title">
                          <strong>Shoppable Reels</strong>
                        </div>
                        <p>Upload videos &amp; link to products</p>
                      </div>
                      <ChevronRight size={18} className="account-admin-arrow" />
                    </div>
                  </>
                )}

                {/* 4. Navigation Menu List */}
                <div className="account-nav-list">
                  <span className="account-nav-section-title">ACCOUNT &amp; SERVICES</span>

                  <div
                    className="account-nav-item"
                    onClick={() => {
                      onClose();
                      handleNav('b2b');
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onClose();
                        handleNav('b2b');
                      }
                    }}
                  >
                    <div className="account-nav-item-icon" style={{ color: 'var(--teal)', background: 'var(--teal-border-light)' }}>
                      <Building2 size={18} />
                    </div>
                    <div className="account-nav-item-content">
                      <strong>Wholesale &amp; Bulk Orders Portal</strong>
                      <span>Volume pricing, corporate gifting</span>
                    </div>
                    <ChevronRight size={16} className="account-nav-chevron" />
                  </div>

                  <div
                    className="account-nav-item"
                    onClick={() => setActiveView('orders')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveView('orders');
                      }
                    }}
                  >
                    <div className="account-nav-item-icon">
                      <Package size={18} />
                    </div>
                    <div className="account-nav-item-content">
                      <strong>My Orders</strong>
                      <span>Track recent shipments, notes &amp; invoices</span>
                    </div>
                    <ChevronRight size={16} className="account-nav-chevron" />
                  </div>

                  <div
                    className="account-nav-item"
                    onClick={() => {
                      onClose();
                      handleNav('wishlist');
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onClose();
                        handleNav('wishlist');
                      }
                    }}
                  >
                    <div className="account-nav-item-icon" style={{ color: '#e53935', background: '#fef2f2' }}>
                      <Heart size={18} />
                    </div>
                    <div className="account-nav-item-content">
                      <strong>My Wishlist</strong>
                      <span>
                        {wishlistCount > 0
                          ? `${wishlistCount} item${wishlistCount > 1 ? 's' : ''} saved`
                          : 'Synchronized across all your devices'}
                      </span>
                    </div>
                    <ChevronRight size={16} className="account-nav-chevron" />
                  </div>

                  <div
                    className="account-nav-item"
                    onClick={() => {
                      onClose();
                      handleNav('cart');
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onClose();
                        handleNav('cart');
                      }
                    }}
                  >
                    <div className="account-nav-item-icon">
                      <ShoppingBag size={18} />
                    </div>
                    <div className="account-nav-item-content">
                      <strong>Shopping Bag &amp; Checkout</strong>
                      <span>
                        {cartCount > 0
                          ? `${cartCount} item${cartCount > 1 ? 's' : ''} ready to order`
                          : 'Zero items in cart'}
                      </span>
                    </div>
                    <ChevronRight size={16} className="account-nav-chevron" />
                  </div>

                  <div
                    className="account-nav-item"
                    onClick={() => setActiveView('addresses')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveView('addresses');
                      }
                    }}
                  >
                    <div className="account-nav-item-icon">
                      <MapPin size={18} />
                    </div>
                    <div className="account-nav-item-content">
                      <strong>Saved Delivery Addresses</strong>
                      <span>
                        {user.addresses && user.addresses.length > 0
                          ? `${user.addresses.length} saved address${user.addresses.length > 1 ? 'es' : ''}`
                          : 'Add & manage delivery addresses'}
                      </span>
                    </div>
                    <ChevronRight size={16} className="account-nav-chevron" />
                  </div>

                  <div
                    className="account-nav-item"
                    onClick={() => {
                      window.location.href = 'mailto:ouronlinedecor@aaiprints.com';
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="account-nav-item-icon">
                      <Headphones size={18} />
                    </div>
                    <div className="account-nav-item-content">
                      <strong>Customer Support</strong>
                      <span>ouronlinedecor@aaiprints.com • +91 70149 45523</span>
                    </div>
                    <ChevronRight size={16} className="account-nav-chevron" />
                  </div>
                </div>

                {/* 5. Security & Trust Badge */}
                <div className="account-security-notice">
                  <ShieldCheck size={15} style={{ color: 'var(--teal)' }} />
                  <span>Protected by 256-bit SSL encryption</span>
                </div>

                {/* 6. Sign Out Button */}
                <button
                  type="button"
                  className="account-signout-btn"
                  onClick={handleSignOut}
                  disabled={isSubmitting}
                >
                  <LogOut size={16} />
                  <span>{isSubmitting ? 'Signing Out...' : 'Sign Out of Account'}</span>
                </button>
              </div>
            )
          ) : (
            <div className="account-auth-wrap">
              {/* Tabs */}
              <div className="account-tabs">
                <button
                  type="button"
                  className={`account-tab ${activeTab === 'login' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('login');
                    setLocalError(null);
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`account-tab ${activeTab === 'register' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('register');
                    setLocalError(null);
                  }}
                >
                  Create Account
                </button>
              </div>

              {(localError || authError) && (
                <div
                  style={{
                    backgroundColor: 'var(--badge-discount-bg)',
                    border: '1px solid rgba(184, 50, 50, 0.3)',
                    color: 'var(--badge-discount)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{localError || authError}</span>
                </div>
              )}

              {/* Login Form */}
              {activeTab === 'login' ? (
                <form className="account-form" onSubmit={handleLoginSubmit}>
                  <p className="account-form-desc">
                    Sign in to track orders, manage addresses, and view your saved items.
                  </p>

                  <div className="form-group">
                    <label htmlFor="login-email">Email Address</label>
                    <input
                      id="login-email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="login-password">Password</label>
                    <input
                      id="login-password"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="form-extra-row">
                    <label className="checkbox-label">
                      <input type="checkbox" defaultChecked />
                      <span>Remember me</span>
                    </label>
                    <a href="#forgot" onClick={(e) => e.preventDefault()} className="forgot-link">
                      Forgot Password?
                    </a>
                  </div>

                  <button type="submit" className="account-submit-btn" disabled={isSubmitting}>
                    {isSubmitting ? 'SIGNING IN...' : 'SIGN IN'}
                  </button>

                  <div className="account-dev-notice" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <ShieldCheck size={14} style={{ color: 'var(--teal)' }} />
                    <span>Secure &amp; Encrypted Member Access</span>
                  </div>
                </form>
              ) : (
                <form className="account-form" onSubmit={handleRegisterSubmit}>
                  <p className="account-form-desc">
                    Join Aai Prints to enjoy seamless shopping and express checkout.
                  </p>

                  <div className="form-group">
                    <label htmlFor="reg-name">Full Name</label>
                    <input
                      id="reg-name"
                      type="text"
                      required
                      placeholder="Your full name"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="reg-email">Email Address</label>
                    <input
                      id="reg-email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="reg-phone">Phone Number (Optional)</label>
                    <input
                      id="reg-phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={registerForm.phone}
                      onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="reg-password">Password</label>
                    <input
                      id="reg-password"
                      type="password"
                      required
                      placeholder="At least 6 characters"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="account-submit-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
                  </motion.button>
                </form>
              )}
            </div>
          )}
        </div>
      </motion.aside>
    </motion.div>
  )}
</AnimatePresence>,
    document.body
  );
}
