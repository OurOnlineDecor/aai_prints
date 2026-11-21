import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';
import './HeroSlider.css';

/* 
  Gallery Visual Showcase (formerly HeroSlider)
  - 2:1 Aspect Ratio Window (same as hero-video-player)
  - Text-block completely removed for pure, unobstructed visual immersion
  - Smooth Ken Burns micro-zoom & 0.8s cross-fade transitions preserved
  - Click-to-Fullscreen: slides are NOT links; clicking opens in fullscreen lightbox
*/
const slides = [
  {
    id: 1,
    image: '/new-images/hero-devotional.jpg',
    category: 'Wall Hangings',
    title: 'Devotional Collection',
    ctaHref: '/shop?category=Wall%20Hangings',
  },
  {
    id: 2,
    image: '/new-images/hero-car-decor.jpg',
    category: 'Dashboard Idols',
    title: 'Car Decor Collection',
    ctaHref: '/shop?category=Dashboard%20Idols',
  },
  {
    id: 3,
    image: '/new-images/hero-wall-decor.jpg',
    category: 'Metal Wall Art',
    title: 'Wall Decor Collection',
    ctaHref: '/shop?category=Metal%20Wall%20Art',
  },
];

export default function HeroSlider({ onSelectCategory }) {
  const [active, setActive] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);

  /* Auto-advance every 5.5 seconds (only when fullscreen is closed) */
  useEffect(() => {
    if (isFullscreen) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % slides.length), 5500);
    return () => clearTimeout(t);
  }, [active, isFullscreen]);

  const prev = () => setActive((a) => (a - 1 + slides.length) % slides.length);
  const next = () => setActive((a) => (a + 1) % slides.length);

  const openFullscreen = (index = active) => {
    setFullscreenIndex(index);
    setIsFullscreen(true);
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
  };

  const prevFullscreen = useCallback((e) => {
    if (e) e.stopPropagation();
    setFullscreenIndex((curr) => (curr - 1 + slides.length) % slides.length);
  }, []);

  const nextFullscreen = useCallback((e) => {
    if (e) e.stopPropagation();
    setFullscreenIndex((curr) => (curr + 1) % slides.length);
  }, []);

  // Keyboard navigation (Esc to close, Left/Right arrows to flip) & scroll lock
  useEffect(() => {
    if (!isFullscreen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeFullscreen();
      } else if (e.key === 'ArrowLeft') {
        prevFullscreen();
      } else if (e.key === 'ArrowRight') {
        nextFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, prevFullscreen, nextFullscreen]);

  const s = slides[active];
  const fsSlide = slides[fullscreenIndex];

  // Touch swipe gesture handlers for main slider on mobile
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
    setIsSwiping(false);
  };

  const handleTouchMove = (e) => {
    if (touchStartX === null || touchStartY === null) return;
    const diffX = touchStartX - e.touches[0].clientX;
    const diffY = touchStartY - e.touches[0].clientY;
    if (Math.abs(diffX) > 10 && Math.abs(diffX) > Math.abs(diffY)) {
      setIsSwiping(true);
    }
  };

  const handleTouchEnd = (e) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchStartX - touchEndX;
    const minSwipeDistance = 35;

    if (Math.abs(diffX) >= minSwipeDistance) {
      if (diffX > 0) {
        next();
      } else {
        prev();
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
    setTimeout(() => setIsSwiping(false), 60);
  };

  // Fullscreen touch swipe gesture handlers for lightbox on mobile
  const [fsTouchStartX, setFsTouchStartX] = useState(null);
  const [fsTouchStartY, setFsTouchStartY] = useState(null);

  const handleFsTouchStart = (e) => {
    setFsTouchStartX(e.touches[0].clientX);
    setFsTouchStartY(e.touches[0].clientY);
  };

  const handleFsTouchEnd = (e) => {
    if (fsTouchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = fsTouchStartX - touchEndX;
    const minSwipeDistance = 35;

    if (Math.abs(diffX) >= minSwipeDistance) {
      if (diffX > 0) {
        nextFullscreen();
      } else {
        prevFullscreen();
      }
    }
    setFsTouchStartX(null);
    setFsTouchStartY(null);
  };

  return (
    <section className="gallery-section" id="gallery" aria-label="Curated Visual Gallery">
      <div className="gallery-container">
        {/* Section Header (styled like Reels section) */}
        <div className="gallery-header">
          <div className="gallery-header-left">
            <h2 className="gallery-title">Gallery</h2>
            <p className="gallery-subtitle">
              Explore our handcrafted devotional artworks, illuminated LED frames &amp; premium decor.
            </p>
          </div>
        </div>

        {/* 2:1 Aspect Ratio Slider Window (same as hero-video-player) */}
        <div className="gallery-window-container">
          <div
            className="hero-slider"
            onClick={() => {
              if (isSwiping) return;
              openFullscreen(active);
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            title="Click to view in fullscreen, swipe left or right on mobile"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openFullscreen(active);
              }
            }}
            aria-label={`View ${s.title} in fullscreen`}
          >
            {/* Background slide images with Ken Burns zoom & smooth cross-fade */}
            {slides.map((slide, idx) => (
              <div
                key={slide.id}
                className={`hero-bg ${idx === active ? 'hero-bg--active' : ''}`}
                style={{ backgroundImage: `url(${slide.image})` }}
                aria-hidden={idx !== active}
              />
            ))}

            {/* Subtle atmospheric gradient overlay for depth */}
            <div className="hero-gradient-overlay" aria-hidden="true" />

            {/* Hover fullscreen prompt badge */}
            <div className="gallery-fullscreen-badge" aria-hidden="true">
              <Maximize2 size={14} />
              <span>Fullscreen</span>
            </div>

            {/* Prev / Next arrows with Lucide icons */}
            <button
              type="button"
              className="hero-arrow hero-prev"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="Previous slide"
            >
              <ChevronLeft size={22} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              className="hero-arrow hero-next"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="Next slide"
            >
              <ChevronRight size={22} strokeWidth={2.2} />
            </button>

            {/* Modern elongated pill dot indicators */}
            <div
              className="hero-dots"
              role="tablist"
              aria-label="Slide indicators"
              onClick={(e) => e.stopPropagation()}
            >
              {slides.map((_, i) => (
                <button
                  key={i}
                  className={`hero-dot ${i === active ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActive(i);
                  }}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-selected={i === active}
                  role="tab"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── IMMERSIVE FULLSCREEN LIGHTBOX MODAL (Portaled to document.body) ── */}
      {isFullscreen &&
        createPortal(
          <div
            className="gallery-lightbox-backdrop"
            onClick={closeFullscreen}
            role="dialog"
            aria-modal="true"
            aria-label="Fullscreen Gallery Viewer"
          >
            {/* Top Close Button */}
            <button
              type="button"
              className="gallery-lightbox-close"
              onClick={(e) => {
                e.stopPropagation();
                closeFullscreen();
              }}
              aria-label="Close fullscreen view"
            >
              <X size={24} />
            </button>

            {/* Prev Arrow inside Lightbox */}
            <button
              type="button"
              className="gallery-lightbox-nav prev"
              onClick={prevFullscreen}
              aria-label="Previous image"
            >
              <ChevronLeft size={30} />
            </button>

            {/* Image Stage with Mobile Swipe Support */}
            <div
              className="gallery-lightbox-content"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleFsTouchStart}
              onTouchEnd={handleFsTouchEnd}
            >
              <img
                src={fsSlide.image}
                alt={fsSlide.title}
                className="gallery-lightbox-img"
              />
              <div className="gallery-lightbox-footer">
                <span className="gallery-lightbox-title">{fsSlide.title}</span>
                <span className="gallery-lightbox-counter">
                  {fullscreenIndex + 1} / {slides.length}
                </span>
              </div>
            </div>

            {/* Next Arrow inside Lightbox */}
            <button
              type="button"
              className="gallery-lightbox-nav next"
              onClick={nextFullscreen}
              aria-label="Next image"
            >
              <ChevronRight size={30} />
            </button>
          </div>,
          document.body
        )}
    </section>
  );
}
