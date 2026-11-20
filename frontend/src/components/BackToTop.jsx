import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import './BackToTop.css';

/**
 * Ultra-Minimalist Luxury Back-To-Top Button
 * Floats gracefully above the bottom-right WhatsApp action.
 */
export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setVisible(window.scrollY > 480);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      type="button"
      className={`back-to-top-btn ${visible ? 'is-visible' : ''}`}
      onClick={scrollToTop}
      aria-label="Scroll to top of page"
      title="Back to Top"
    >
      <ArrowUp size={16} strokeWidth={2.2} />
      <span className="back-to-top-text">TOP</span>
    </button>
  );
}
