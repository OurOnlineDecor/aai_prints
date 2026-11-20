import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { MessageCircle, Globe, Mail, Share2, Sparkles, X } from 'lucide-react';
import './Footer.css';

const policyContents = {
  'Contact Us': {
    title: 'Customer Care & Support',
    body: 'Our customer care team is dedicated to helping you with product inquiries, bulk orders, and custom dimensions.\n\n• Email: ouronlinedecor@aaiprints.com\n• Helpline: +91 70149 45523 (Mon-Sat, 10 AM - 7 PM IST)\n• WhatsApp: +91 70149 45523\n• Artisan Studio: Ananta Art International, India',
  },
  'FAQs': {
    title: 'Frequently Asked Questions',
    body: '• Are backlit frames ready to plug in? Yes, each backlit frame comes with a certified Indian 12V power adapter and warm white ambient LEDs.\n• How are wall arts mounted? All units include pre-fitted heavy-duty wall brackets and tabletop kickstands.\n• Are dashboard idols heat & vibration resistant? Yes, each idol includes automotive-grade heat-resistant 3M tape for bump-free adhesion.',
  },
  'Shipping Policy': {
    title: 'Shipping & Delivery Policy',
    body: 'We deliver safely across all serviceable pin codes in India. Every order is encased in 5-ply reinforced protective packaging with inner bubble foam shielding to ensure zero transit shock.\n\n• Free Express Shipping on all orders above ₹500.\n• Standard dispatch within 24-48 business hours.\n• Delivery turnaround: 3-5 business days across metro cities.',
  },
  'Returns & Refunds': {
    title: 'Transit Guarantee & Replacements',
    body: 'We stand 100% behind the craftsmanship of every art piece. In the rare event of transit damage, we provide an immediate 7-day hassle-free replacement upon sharing unboxing photos or video to ouronlinedecor@aaiprints.com.',
  },
  'Privacy Policy': {
    title: 'Privacy Policy',
    body: 'Your privacy is treated with the highest degree of care and confidentiality. Personal information including delivery address, phone number, and transaction history is encrypted via 256-bit SSL protocols and is never shared, rented, or sold to third parties.',
  },
  'Terms of Service': {
    title: 'Terms of Service',
    body: 'Welcome to Aai Prints (Ananta Art International). All catalog prices, specifications, and product descriptions represent authentic  goods. Orders are subject to standard verification and dispatch schedules.',
  },
};

export default function Footer({ onNavigate }) {
  const navigate = useNavigate();
  const [activePolicy, setActivePolicy] = useState(null);

  const quickLinks = [
    { label: 'Home', href: '/', page: 'home' },
    { label: 'Shop All Products', href: '/shop', page: 'shop', category: 'All' },
    { label: 'Wholesale & Bulk Orders', href: '/b2b', page: 'b2b' },
    { label: 'My Wishlist', href: '/wishlist', page: 'wishlist' },
    { label: 'Shopping Cart', href: '/cart', page: 'cart' },
    { label: 'Customer Reviews', href: '/#reviews', page: 'home', category: 'reviews' },
  ];

  const shopCategories = [
    { label: 'Devotional Wall Hangings', category: 'Wall Hangings' },
    { label: 'Illuminated Backlit LED Frames', category: 'Backlit LED Frames' },
    { label: 'Car Dashboard Idols', category: 'Dashboard Idols' },
    { label: 'Car Hangings', category: 'Car Hangings' },
    { label: 'Metal Wall Art Craft', category: 'Metal Wall Art' },
    { label: 'Artisan Wall Clocks', category: 'Wall Clocks' },
    { label: 'Desk Standees & Gifts', category: 'Desk Standees' },
  ];

  const customerCareLinks = [
    'Contact Us',
    'FAQs',
    'Shipping Policy',
    'Returns & Refunds',
    'Privacy Policy',
    'Terms of Service',
  ];

  return (
    <footer className="footer" role="contentinfo">
      <div className="section-wrap">
        <div className="footer-inner">
          {/* 1. Brand Heritage Column */}
          <div className="footer-col footer-brand">
            <div className="footer-logo">
              <span className="footer-logo-text">Aai Prints</span>
            </div>
            <p className="footer-desc">
              Devotional frames, illuminated backlit LED frames, and contemporary wall art designed to bring elegance, serenity, and premium aesthetics into every home and vehicle.
            </p>
            <img
              src="/our-online-decor-logo.png?v=3"
              alt="OurONLINE Decor - Corporate Gifts, Home Decor, Personalised Gifts, Promotional Products - अपनों के लिए कुछ खास"
              className="footer-venture-img"
              loading="lazy"
            />
            <div className="footer-socials" aria-label="Connect with us">
              <a
                href="https://wa.me/917014945523?text=Namaste%20Aai%20Prints%20Team%2C%20I%20have%20an%20inquiry%20regarding%20your%20products."
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
                aria-label="Chat on WhatsApp (+91 70149 45523)"
                title="Chat on WhatsApp (+91 70149 45523)"
              >
                <MessageCircle size={17} />
              </a>
              <a
                href="/"
                className="social-link"
                aria-label="Aai Prints Official Store"
                onClick={(e) => {
                  e.preventDefault();
                  if (onNavigate) {
                    onNavigate('home');
                  } else {
                    navigate('/');
                  }
                }}
                title="Aai Prints Official Store"
              >
                <Globe size={17} />
              </a>
              <a
                href="mailto:ouronlinedecor@aaiprints.com"
                className="social-link"
                aria-label="Email Customer Care (ouronlinedecor@aaiprints.com)"
                title="ouronlinedecor@aaiprints.com"
              >
                <Mail size={17} />
              </a>
              <button
                type="button"
                className="social-link social-link--btn"
                aria-label="Share Store Collection"
                title="Share Store Collection"
                onClick={async () => {
                  const shareData = {
                    title: 'Aai Prints | Premium Home Decor & Devotional Art',
                    text: 'Explore handcrafted backlit LED frames, devotional art, and customized decor from Aai Prints!',
                    url: window.location.origin,
                  };
                  if (navigator.share) {
                    try {
                      await navigator.share(shareData);
                    } catch {}
                  } else {
                    navigator.clipboard.writeText(shareData.url);
                    alert('Store link copied to clipboard!');
                  }
                }}
              >
                <Share2 size={17} />
              </button>
            </div>
          </div>

          {/* 2. Quick Links */}
          <div className="footer-col">
            <h3 className="footer-heading">Navigation</h3>
            <ul className="footer-links">
              {quickLinks.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    onClick={(e) => {
                      e.preventDefault();
                      if (onNavigate && l.page) {
                        onNavigate(l.page, l.category || 'All');
                      } else {
                        navigate(l.href);
                      }
                    }}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* 3. Shop Categories */}
          <div className="footer-col">
            <h3 className="footer-heading">Product Categories</h3>
            <ul className="footer-links">
              {shopCategories.map((c) => (
                <li key={c.label}>
                  <a
                    href={`/shop?category=${encodeURIComponent(c.category)}`}
                    onClick={(e) => {
                      e.preventDefault();
                      if (onNavigate) {
                        onNavigate('shop', c.category);
                      } else {
                        navigate(`/shop?category=${encodeURIComponent(c.category)}`);
                      }
                    }}
                  >
                    {c.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* 4. Customer Care & Policies */}
          <div className="footer-col">
            <h3 className="footer-heading">Customer Care</h3>
            <ul className="footer-links">
              {customerCareLinks.map((label) => (
                <li key={label}>
                  <button
                    type="button"
                    className="footer-policy-btn"
                    onClick={() => setActivePolicy(label)}
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Payment Badges & Copyright Bottom Bar ── */}
        <div className="footer-bottom">
          <p className="footer-copy">
            © {new Date().getFullYear()} <strong>Aai Prints</strong> (A Subsidiary of Our Online Decor). Crafted in India. All Rights Reserved.
          </p>
        </div>
      </div>

      {/* ── Policy Modal ── */}
      {activePolicy && createPortal(
        <div
          className="policy-modal-overlay"
          onClick={() => setActivePolicy(null)}
          role="presentation"
        >
          <div
            className="policy-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="policy-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="policy-modal-header">
              <h2 id="policy-modal-title" className="policy-modal-title">
                {policyContents[activePolicy]?.title || activePolicy}
              </h2>
              <button
                type="button"
                className="policy-modal-close"
                onClick={() => setActivePolicy(null)}
                aria-label="Close dialog"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="policy-modal-body">
              {policyContents[activePolicy]?.body
                .split('\n')
                .map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              {activePolicy === 'Contact Us' && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
                  <a
                    href="https://wa.me/917014945523?text=Namaste%20Aai%20Prints%20Team%2C%20I%20have%20an%20inquiry."
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      background: '#25D366',
                      color: '#ffffff',
                      textDecoration: 'none',
                      fontWeight: '600',
                      fontSize: '13px',
                      boxShadow: '0 2px 8px rgba(37, 211, 102, 0.25)',
                    }}
                  >
                    <MessageCircle size={16} /> WhatsApp: +91 70149 45523
                  </a>
                  <a
                    href="mailto:ouronlinedecor@aaiprints.com"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      background: 'var(--accent, #D2B98C)',
                      color: '#39332E',
                      textDecoration: 'none',
                      fontWeight: '600',
                      fontSize: '13px',
                    }}
                  >
                    <Mail size={16} /> Email Us
                  </a>
                  <a
                    href="tel:+917014945523"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      background: '#f1f5f9',
                      color: '#334155',
                      textDecoration: 'none',
                      fontWeight: '600',
                      fontSize: '13px',
                    }}
                  >
                    Call: +91 70149 45523
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </footer>
  );
}
