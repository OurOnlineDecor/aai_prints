import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import './CategoryScrollbar.css';

/* 
  Category circles matching the requested home decor categories.
  Images point to public/new-images/*.jpg for easy replacement.
*/
const categories = [
  { label: 'Wall Hangings', img: '/new-images/cat-wall-hangings.jpg', href: '/shop?category=Wall%20Hangings' },
  { label: 'Backlit LED Frames', img: '/new-images/cat-backlit-led-frames.jpg', href: '/shop?category=Backlit%20LED%20Frames' },
  { label: 'Dashboard Idols', img: '/new-images/cat-dashboard-idols.jpg', href: '/shop?category=Dashboard%20Idols' },
  { label: 'Car Hangings', img: '/new-images/cat-car-hangings.jpg', href: '/shop?category=Car%20Hangings' },
  { label: 'Framed Wall Art', img: '/new-images/cat-framed-wall-art.jpg', href: '/shop?category=Framed%20Wall%20Art' },
  { label: 'Metal Wall Art', img: '/new-images/cat-metal-wall-art.jpg', href: '/shop?category=Metal%20Wall%20Art' },
  { label: 'Wall Clocks', img: '/new-images/cat-wall-clocks.jpg', href: '/shop?category=Wall%20Clocks' },
  { label: 'Desk Standees', img: '/new-images/cat-desk-standees.jpg', href: '/shop?category=Desk%20Standees' },
  { label: 'Gift Combos', img: '/new-images/cat-gift-combos.jpg', href: '/shop?category=Gifts' },
];

// Repeat categories to create two identical groups for seamless 100% infinite looping
const marqueeGroup = [...categories, ...categories];

export default function CategoryScrollbar({ onSelectCategory }) {
  const navigate = useNavigate();
  const mobileWrapRef = useRef(null);
  const isInteractingRef = useRef(false);
  const resumeTimerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const currentScrollRef = useRef(0);

  // Smooth continuous auto-scroll for mobile that allows simultaneous touch interaction
  useEffect(() => {
    let rafId;
    let lastTime = null;
    const pixelsPerSecond = 34; // Steady, calm, readable gliding speed

    const step = (time) => {
      const container = mobileWrapRef.current;
      // Only run auto-scroll loop on mobile/tablet viewports where mobile-shelf is active
      if (window.innerWidth <= 768 && container) {
        if (lastTime !== null && !isInteractingRef.current) {
          const delta = (time - lastTime) / 1000;
          const distance = delta * pixelsPerSecond;
          const halfWidth = container.scrollWidth / 2;

          if (halfWidth > 0) {
            currentScrollRef.current += distance;
            if (currentScrollRef.current >= halfWidth) {
              currentScrollRef.current -= halfWidth;
            } else if (currentScrollRef.current < 0) {
              currentScrollRef.current += halfWidth;
            }
            container.scrollLeft = currentScrollRef.current;
          }
        }
        lastTime = time;
      } else {
        lastTime = null;
      }
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafId);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  const handleTouchStart = (e) => {
    isInteractingRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isDraggingRef.current = false;
    if (mobileWrapRef.current) {
      currentScrollRef.current = mobileWrapRef.current.scrollLeft;
    }
  };

  const handleTouchMove = (e) => {
    const diffX = Math.abs(e.touches[0].clientX - touchStartXRef.current);
    const diffY = Math.abs(e.touches[0].clientY - touchStartYRef.current);
    if (diffX > 8 && diffX > diffY) {
      isDraggingRef.current = true;
    }
    if (mobileWrapRef.current) {
      currentScrollRef.current = mobileWrapRef.current.scrollLeft;
    }
  };

  const handleTouchEnd = () => {
    const container = mobileWrapRef.current;
    if (container) {
      currentScrollRef.current = container.scrollLeft;
      const halfWidth = container.scrollWidth / 2;
      if (halfWidth > 0) {
        if (currentScrollRef.current >= halfWidth) {
          currentScrollRef.current -= halfWidth;
          container.scrollLeft = currentScrollRef.current;
        } else if (currentScrollRef.current <= 0) {
          currentScrollRef.current += halfWidth;
          container.scrollLeft = currentScrollRef.current;
        }
      }
    }

    // After user lifts finger, allow momentum settling, then resume auto-movement
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      if (mobileWrapRef.current) {
        currentScrollRef.current = mobileWrapRef.current.scrollLeft;
      }
      isInteractingRef.current = false;
    }, 850);

    // Reset dragging flag after click evaluation
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 60);
  };

  const handleScroll = () => {
    if (isInteractingRef.current && mobileWrapRef.current) {
      currentScrollRef.current = mobileWrapRef.current.scrollLeft;
    }
  };

  const handleItemClick = (e, category) => {
    e.preventDefault();
    if (isDraggingRef.current) return; // Prevent navigation if user was swiping/scrolling
    if (onSelectCategory) {
      onSelectCategory(category.label);
    } else {
      navigate(category.href);
    }
  };

  return (
    <div
      ref={mobileWrapRef}
      className="catbar-wrap"
      aria-label="Browse categories"
      onScroll={handleScroll}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Mobile Scrollable Rail (Mobile only: Auto-moves continuously AND allows touch-swiping) ── */}
      <div className="catbar-mobile-shelf">
        {marqueeGroup.map((category, index) => (
          <a
            key={`mobile-${category.label}-${index}`}
            href={category.href}
            className="catbar-item"
            title={category.label}
            onClick={(e) => handleItemClick(e, category)}
          >
            <motion.div
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className="catbar-circle"
            >
              <img
                src={category.img}
                alt={category.label}
                className="catbar-img"
                loading="lazy"
                draggable="false"
              />
            </motion.div>
            <span className="catbar-label">{category.label}</span>
          </a>
        ))}
      </div>

      {/* ── Desktop Infinite Loop Track (PC only: Continuous hands-free marquee) ── */}
      <div className="catbar-track desktop-only-catbar">
        {/* Primary Marquee Group */}
        <div className="catbar-marquee-group">
          {marqueeGroup.map((category, index) => (
            <a
              key={`primary-${category.label}-${index}`}
              href={category.href}
              className="catbar-item"
              title={category.label}
              onClick={(e) => handleItemClick(e, category)}
            >
              <motion.div
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                className="catbar-circle"
              >
                <img
                  src={category.img}
                  alt={category.label}
                  className="catbar-img"
                  loading="lazy"
                  draggable="false"
                />
              </motion.div>
              <span className="catbar-label">{category.label}</span>
            </a>
          ))}
        </div>

        {/* Identical Cloned Group for Seamless 100% Infinite Looping */}
        <div className="catbar-marquee-group" aria-hidden="true">
          {marqueeGroup.map((category, index) => (
            <a
              key={`clone-${category.label}-${index}`}
              href={category.href}
              className="catbar-item"
              title={category.label}
              tabIndex={-1}
              onClick={(e) => handleItemClick(e, category)}
            >
              <motion.div
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                className="catbar-circle"
              >
                <img
                  src={category.img}
                  alt={category.label}
                  className="catbar-img"
                  loading="lazy"
                  draggable="false"
                />
              </motion.div>
              <span className="catbar-label">{category.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
