import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Sparkles,
  ExternalLink,
  Volume2,
  VolumeX,
  Play,
  Pause
} from 'lucide-react';
import InstagramIcon from './InstagramIcon';
import { reelService } from '../services/reelService';
import './ReelsSection.css';

/**
 * Autoplaying Video Preview for Reel Cards on the homepage shelf.
 * Silently autoplays in an infinite loop while the reel card is on screen.
 * Pauses automatically when the fullscreen story modal is opened.
 */
function ReelCardMedia({ reel, isModalOpen }) {
  const videoRef = useRef(null);
  const [videoError, setVideoError] = useState(false);
  const [isInView, setIsInView] = useState(true);

  // IntersectionObserver to only autoplay cards visible in the carousel viewport
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !window.IntersectionObserver) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInView(entry.isIntersecting);
        });
      },
      { threshold: 0.15 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [videoError, reel.videoUrl]);

  // Handle Play/Pause based on modal state and viewport intersection
  useEffect(() => {
    const video = videoRef.current;
    if (!video || videoError) return;

    video.muted = true;
    video.defaultMuted = true;

    if (!isModalOpen && isInView) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } else {
      video.pause();
    }
  }, [isModalOpen, isInView, videoError, reel.videoUrl]);

  if (reel.videoUrl && !videoError) {
    return (
      <video
        ref={videoRef}
        src={reel.videoUrl}
        className="reel-card-video-preview"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onError={() => setVideoError(true)}
      />
    );
  }

  return (
    <div className="reel-card-instagram-placeholder">
      <div className="reel-card-ig-icon-glow">
        <InstagramIcon size={42} strokeWidth={1.5} />
      </div>
      <span className="reel-card-ig-tag">Watch Reel</span>
    </div>
  );
}

export default function ReelsSection() {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeReelIndex, setActiveReelIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tapFeedback, setTapFeedback] = useState(null);
  const [slideDirection, setSlideDirection] = useState('up');
  const [showSwipeHint, setShowSwipeHint] = useState(true);

  const scrollTrackRef = useRef(null);
  const videoRef = useRef(null);
  const touchStartY = useRef(null);
  const touchStartX = useRef(null);
  const isSwiping = useRef(false);

  // Fetch reels on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await reelService.getReels();
        if (isMounted) {
          setReels(data || []);
          setLoading(false);
        }
      } catch (_err) {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeReel = activeReelIndex !== null ? reels[activeReelIndex] : null;

  // Open modal handler
  const openReelModal = (index) => {
    setActiveReelIndex(index);
    setIsMuted(false);
    setIsPlaying(true);
    setProgress(0);
    setSlideDirection('up');
    setShowSwipeHint(true);

    const targetReel = reels[index];
    if (targetReel?._id || targetReel?.id) {
      reelService.trackView(targetReel._id || targetReel.id);
    }
  };

  const closeReelModal = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setActiveReelIndex(null);
    setIsPlaying(false);
    setProgress(0);
    setShowSwipeHint(false);
  }, []);

  // Cycle to next reel
  const nextReel = useCallback(
    (e) => {
      if (e) e.stopPropagation();
      if (reels.length === 0) return;
      setSlideDirection('up');
      setShowSwipeHint(false);
      setActiveReelIndex((prev) => (prev + 1) % reels.length);
      setIsPlaying(true);
      setProgress(0);
    },
    [reels.length]
  );

  // Cycle to previous reel
  const prevReel = useCallback(
    (e) => {
      if (e) e.stopPropagation();
      if (reels.length === 0) return;
      setSlideDirection('down');
      setShowSwipeHint(false);
      setActiveReelIndex((prev) => (prev - 1 + reels.length) % reels.length);
      setIsPlaying(true);
      setProgress(0);
    },
    [reels.length]
  );

  // Auto-play when active reel changes in modal
  useEffect(() => {
    if (activeReelIndex === null || !videoRef.current) return;

    const videoEl = videoRef.current;
    videoEl.currentTime = 0;
    videoEl.muted = isMuted;

    const playPromise = videoEl.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          // Fallback to muted if unmuted autoplay prevented
          videoEl.muted = true;
          setIsMuted(true);
          videoEl.play().catch(() => {});
        });
    }
  }, [activeReelIndex]);

  // Toggle Mute
  const toggleMute = (e) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuteState = !isMuted;
    videoRef.current.muted = nextMuteState;
    setIsMuted(nextMuteState);
  };

  // Toggle Play / Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
      setTapFeedback('play');
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setTapFeedback('pause');
    }
    setTimeout(() => setTapFeedback(null), 550);
  };

  // Time progress update
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const { currentTime, duration } = videoRef.current;
    if (duration > 0) {
      setProgress((currentTime / duration) * 100);
    }
  };

  // Lock body scroll and listen for Escape / Arrow keys when modal is open
  useEffect(() => {
    if (activeReelIndex === null) return;

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeReelModal();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextReel();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevReel();
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeReelIndex, closeReelModal, nextReel, prevReel]);

  // Touch navigation for mobile vertical swipe
  const handleTouchStart = (e) => {
    if (e.touches && e.touches.length === 1) {
      touchStartY.current = e.touches[0].clientY;
      touchStartX.current = e.touches[0].clientX;
      isSwiping.current = true;
    }
  };

  const handleTouchEnd = (e) => {
    if (!isSwiping.current || touchStartY.current === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaY = touchStartY.current - touchEndY;
    const deltaX = touchStartX.current - touchEndX;

    if (Math.abs(deltaY) > 45 && Math.abs(deltaY) > Math.abs(deltaX)) {
      if (deltaY > 0) {
        nextReel();
      } else {
        prevReel();
      }
    }

    touchStartY.current = null;
    touchStartX.current = null;
    isSwiping.current = false;
  };

  // Horizontal shelf scroll
  const scrollShelf = (direction) => {
    if (!scrollTrackRef.current) return;
    const scrollAmount = direction === 'left' ? -340 : 340;
    scrollTrackRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  // Don't render section if no reels exist
  if (reels.length === 0) {
    return null;
  }

  return (
    <section className="reels-section-wrapper" aria-label="Short Videos Showcase">
      <div className="reels-container">
        {/* Section Header */}
        <div className="reels-header">
          <div className="reels-header-left">
            <span className="reels-eyebrow">
              <Sparkles size={14} className="reels-eyebrow-icon" />
              PRODUCT SHOWCASE • WATCH ON REELS
            </span>
            <h2 className="reels-title">Product Showcase &amp; Highlights</h2>
            <p className="reels-subtitle">
              Glimpses of premium craftsmanship, warm illumination, and intricate details direct from our workshop.
            </p>
          </div>

          <div className="reels-header-arrows">
            <button
              type="button"
              className="reels-arrow-btn"
              onClick={() => scrollShelf('left')}
              aria-label="Scroll reels left"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              className="reels-arrow-btn"
              onClick={() => scrollShelf('right')}
              aria-label="Scroll reels right"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Horizontal Carousel Shelf */}
        <div className="reels-track-container" ref={scrollTrackRef}>
          <div className="reels-track">
            {reels.map((reel, idx) => (
              <div
                key={reel._id || reel.id || idx}
                className="reel-card"
                onClick={() => openReelModal(idx)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    openReelModal(idx);
                  }
                }}
                aria-label={reel.title ? `Watch reel: ${reel.title}` : 'Watch reel'}
              >
                {/* Card Visual / Autoplaying Video Preview */}
                <div className="reel-card-media-wrap">
                  <ReelCardMedia
                    reel={reel}
                    isModalOpen={activeReelIndex !== null}
                  />

                  {/* Gradient Overlay */}
                  <div className="reel-card-gradient" />

                  {/* Bottom Action Pill */}
                  <div className="reel-card-action-bar">
                    <span className="reel-card-action-text">
                      <Play size={13} fill="currentColor" style={{ marginRight: '6px' }} />
                      Watch Video
                    </span>
                  </div>
                </div>

                {/* Optional Title under card */}
                {reel.title ? (
                  <div className="reel-card-meta">
                    <h3 className="reel-card-title">{reel.title}</h3>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FULL-SCREEN PURE VERTICAL STORY MODAL PLAYER (Portaled to document.body) ── */}
      {activeReel && createPortal(
        <div
          className="reel-modal-backdrop"
          onClick={closeReelModal}
          onWheel={(e) => e.preventDefault()}
          onTouchMove={(e) => e.preventDefault()}
          role="dialog"
          aria-modal="true"
          aria-label="Full Screen Video Player"
        >
          {/* Previous Arrow Button */}
          <button
            type="button"
            className="reel-modal-nav-btn prev"
            onClick={prevReel}
            aria-label="Previous reel"
          >
            <ChevronLeft size={28} />
          </button>

          {/* Main Focused Reel Player Card */}
          <div
            className="reel-modal-card"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Top Progress Bar */}
            <div className="reel-modal-progress-bar">
              <div
                className="reel-modal-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Top Controls Overlay */}
            <div className="reel-modal-header">
              <div className="reel-modal-header-brand">
                {activeReel.title ? (
                  <span className="reel-modal-header-title">{activeReel.title}</span>
                ) : null}
              </div>

              <div className="reel-modal-header-actions">
                {/* Audio Mute/Unmute Button */}
                <button
                  type="button"
                  className={`reel-modal-icon-btn ${!isMuted ? 'active-audio' : ''}`}
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                  title={isMuted ? 'Sound ON' : 'Mute Sound'}
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  className="reel-modal-icon-btn close-btn"
                  onClick={closeReelModal}
                  aria-label="Close reel player"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Subtle Vertical Swipe Hint on Mobile */}
            {showSwipeHint && (
              <div className="reel-modal-swipe-hint">
                <span>Swipe up for next</span>
                <ChevronDown size={14} className="reel-modal-swipe-arrow" />
              </div>
            )}

            {/* Video Viewport (Tap to Play/Pause, 100% Pure Video) */}
            <div
              key={`reel-${activeReel._id || activeReel.id || activeReelIndex}`}
              className={`reel-modal-viewport ${slideDirection === 'up' ? 'slide-up' : 'slide-down'}`}
              onClick={togglePlay}
              role="button"
              tabIndex={0}
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
            >
              <video
                ref={videoRef}
                src={activeReel.videoUrl}
                playsInline
                loop
                autoPlay
                onTimeUpdate={handleTimeUpdate}
                className="reel-modal-video"
              />

              {/* Tap Feedback Animation */}
              {tapFeedback && (
                <div className="reel-modal-tap-feedback">
                  {tapFeedback === 'play' ? (
                    <Play size={44} fill="currentColor" />
                  ) : (
                    <Pause size={44} fill="currentColor" />
                  )}
                </div>
              )}
            </div>

            {/* Bottom Floating Bar: Visit Original Reel CTA (No Product Association) */}
            {activeReel.instagramUrl && (
              <div className="reel-modal-footer-dock">
                <a
                  href={activeReel.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="reel-modal-visit-original-btn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="reel-modal-btn-ig-icon">
                    <InstagramIcon size={18} />
                  </div>
                  <span>Visit Original Reel</span>
                  <ExternalLink size={16} className="reel-modal-btn-arrow" />
                </a>
              </div>
            )}
          </div>

          {/* Next Arrow Button */}
          <button
            type="button"
            className="reel-modal-nav-btn next"
            onClick={nextReel}
            aria-label="Next reel"
          >
            <ChevronRight size={28} />
          </button>
        </div>,
        document.body
      )}
    </section>
  );
}
