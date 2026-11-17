import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Share2,
  Check,
  ClipboardList,
  ShieldCheck,
  Truck,
  MessageCircle,
  Camera,
  ExternalLink,
  ZoomIn,
} from 'lucide-react';
import { buildWhatsAppOrderUrl } from '../services/customProductService';
import './CustomProductDetailPage.css';

export default function CustomProductDetailPage({
  product,
  onNavigateHome,
  onNavigateShop,
}) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [customerNotes, setCustomerNotes] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    setActiveImageIndex(0);
    setCustomerNotes('');
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [product]);

  if (!product) {
    return (
      <div className="custom-pdp-not-found">
        <h2>Customizable Product Not Found</h2>
        <p>The product you are looking for is currently unavailable.</p>
        <button type="button" className="custom-back-btn" onClick={onNavigateShop}>
          Return to Catalog
        </button>
      </div>
    );
  }

  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : ['/new-images/product-placeholder.jpg'];

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: `Check out ${product.name} on Aai Prints!`,
        url: window.location.href,
      }).catch(() => null);
    } else {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const whatsAppUrl = buildWhatsAppOrderUrl(product, customerNotes);

  return (
    <div className="custom-pdp-page page-view-fade">
      {/* ── Breadcrumb Navigation ── */}
      <nav className="custom-pdp-breadcrumb" aria-label="Breadcrumb">
        <div className="custom-pdp-container">
          <button type="button" className="breadcrumb-link" onClick={onNavigateHome}>
            Home
          </button>
          <span className="breadcrumb-separator">/</span>
          <button type="button" className="breadcrumb-link" onClick={onNavigateShop}>
            Customization
          </button>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{product.name}</span>
        </div>
      </nav>

      <div className="custom-pdp-container">
        <div className="custom-pdp-grid">
          {/* ══════════════════════════════════════════════
              LEFT COLUMN: Product Photo(s)
          ══════════════════════════════════════════════ */}
          <div className="custom-pdp-gallery">
            <div className="custom-main-image-wrap">
              <img
                src={images[activeImageIndex]}
                alt={product.name}
                className={`custom-main-image ${isZoomed ? 'zoomed' : ''}`}
                onClick={() => setIsZoomed(!isZoomed)}
              />

              <button
                type="button"
                className="custom-image-zoom-btn"
                title="Zoom photo"
                onClick={() => setIsZoomed(!isZoomed)}
              >
                <ZoomIn size={16} />
              </button>
            </div>

            {/* Thumbnail switcher if multiple images exist */}
            {images.length > 1 && (
              <div className="custom-thumbnails-row">
                {images.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`custom-thumb-btn ${idx === activeImageIndex ? 'active' : ''}`}
                    onClick={() => setActiveImageIndex(idx)}
                  >
                    <img src={imgUrl} alt={`${product.name} view ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}

            {/* Quick Guarantees beneath image */}
            <div className="custom-gallery-badges">
              <div className="custom-badge-item">
                <ShieldCheck size={18} />
                <span>100% Handcrafted Quality</span>
              </div>
              <div className="custom-badge-item">
                <Camera size={18} />
                <span>Photo Proof Shared on WhatsApp</span>
              </div>
              <div className="custom-badge-item">
                <Truck size={18} />
                <span>Secure Pan-India Delivery</span>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════
              RIGHT COLUMN: Product Name, Requirements & WhatsApp CTA
          ══════════════════════════════════════════════ */}
          <div className="custom-pdp-details">
            {/* Top Category & Share */}
            <div className="custom-pdp-top-meta">
              <span className="custom-category-tag">{product.category || 'Personalized Decor'}</span>
              <button
                type="button"
                className="custom-share-btn"
                onClick={handleShare}
                title="Share this product"
              >
                {isCopied ? <Check size={16} color="#059669" /> : <Share2 size={16} />}
                <span>{isCopied ? 'Link Copied!' : 'Share'}</span>
              </button>
            </div>

            {/* 1. PRODUCT NAME */}
            <h1 className="custom-product-name">{product.name}</h1>

            {/* Price (if specified) */}
            {product.price > 0 && (
              <div className="custom-price-row">
                <span className="custom-price-label">Starts at:</span>
                <span className="custom-price-current">
                  ₹{product.price.toLocaleString('en-IN')}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="custom-price-original">
                    ₹{product.originalPrice.toLocaleString('en-IN')}
                  </span>
                )}
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="custom-discount-pill">
                    {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                  </span>
                )}
              </div>
            )}

            {/* Optional Short Description */}
            {product.description && (
              <p className="custom-product-desc">{product.description}</p>
            )}

            {/* 2. PRODUCT REQUIREMENT (Admin Defined Instructions) */}
            <div className="custom-requirements-card">
              <div className="custom-requirements-header">
                <ClipboardList size={20} className="req-header-icon" />
                <div>
                  <h3 className="custom-requirements-title">Product Requirements</h3>
                  <span className="custom-requirements-subtitle">
                    Please provide these details when placing your custom order
                  </span>
                </div>
              </div>

              <div className="custom-requirements-body">
                {(Array.isArray(product.requirements)
                  ? product.requirements
                  : typeof product.requirements === 'string'
                  ? product.requirements.split('\n')
                  : []
                ).map((line, lineIdx) => {
                  const trimmed = String(line || '').trim();
                  if (!trimmed) return null;
                  return (
                    <div key={lineIdx} className="custom-req-line">
                      <span className="req-bullet">✦</span>
                      <p className="req-text">{trimmed.replace(/^[•\-\*]\s*/, '')}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. CUSTOMER NOTES HELPER (Pre-populates into WhatsApp) */}
            <div className="custom-user-input-group">
              <label htmlFor="custom-notes" className="custom-input-label">
                <span>Enter Your Custom Details / Query</span>
                <span className="optional-tag">(Optional — will pre-fill into WhatsApp)</span>
              </label>
              <textarea
                id="custom-notes"
                className="custom-textarea"
                rows={3}
                placeholder="Type your names, custom text, preferred colors, or special dates here..."
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
              />
            </div>

            {/* 4. WHATSAPP PRIMARY CTA BUTTON */}
            <div className="custom-order-action-wrap">
              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="custom-whatsapp-order-btn"
              >
                {/* Official WhatsApp Icon SVG */}
                <svg
                  className="whatsapp-icon-svg"
                  viewBox="0 0 24 24"
                  width="26"
                  height="26"
                  fill="currentColor"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <div className="btn-content">
                  <span className="btn-main-text">Order via WhatsApp</span>
                  <span className="btn-sub-text">Directly connect with our custom craft studio</span>
                </div>
                <ExternalLink size={18} className="btn-ext-icon" />
              </a>

              <p className="custom-order-disclaimer">
                Clicking opens WhatsApp with your pre-filled inquiry. Our artisans will review your photos & details, provide a preview, and guide you through payment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
