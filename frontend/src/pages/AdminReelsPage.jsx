import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Film,
  Upload,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Trash2,
  ExternalLink,
  Sparkles,
  PlusCircle,
  Play,
  Loader2
} from 'lucide-react';
import InstagramIcon from '../components/InstagramIcon';
import { reelService } from '../services/reelService';
import './AdminReelsPage.css';

export default function AdminReelsPage({ onNavigateHome }) {
  const navigate = useNavigate();
  const handleHome = onNavigateHome || (() => navigate('/'));

  // Form Fields
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');

  // Video Upload State
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoFileName, setVideoFileName] = useState('');
  const fileInputRef = useRef(null);

  // Form Submission & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Existing Reels state
  const [existingReels, setExistingReels] = useState([]);
  const [isLoadingReels, setIsLoadingReels] = useState(true);
  const [deletingReelId, setDeletingReelId] = useState(null);

  // Fetch reels on mount
  useEffect(() => {
    loadReels();
  }, []);

  const loadReels = async () => {
    try {
      setIsLoadingReels(true);
      const data = await reelService.getReels();
      setExistingReels(data || []);
    } catch (err) {
      console.warn('[AdminReelsPage] Failed to load reels:', err);
    } finally {
      setIsLoadingReels(false);
    }
  };

  // Handle Cloudinary Video Upload
  const handleVideoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setErrorMessage('Please select a valid video file (MP4, WebM, MOV).');
      return;
    }

    try {
      setIsUploadingVideo(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      setVideoFileName(file.name);

      const asset = await reelService.uploadVideo(file);
      if (asset && asset.url) {
        setVideoUrl(asset.url);
        setSuccessMessage('Video uploaded successfully to Cloudinary!');
      } else {
        throw new Error('Upload returned invalid response.');
      }
    } catch (err) {
      setErrorMessage(
        err?.message || err?.data?.message || 'Failed to upload video to Cloudinary. You can also paste a direct video URL.'
      );
    } finally {
      setIsUploadingVideo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Reel Submission
  const handleSubmitReel = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanTitle = title.trim();
    const cleanVideoUrl = videoUrl.trim();

    if (!cleanVideoUrl) {
      setErrorMessage('Please upload a video or provide a direct video URL.');
      return;
    }

    try {
      setIsSubmitting(true);
      await reelService.createReel({
        title: cleanTitle,
        videoUrl: cleanVideoUrl,
        instagramUrl: instagramUrl.trim(),
        order: existingReels.length + 1,
        isActive: true
      });

      const label = cleanTitle ? `"${cleanTitle}" ` : '';
      setSuccessMessage(`Reel ${label}published to homepage successfully!`);
      // Reset form
      setTitle('');
      setVideoUrl('');
      setInstagramUrl('');
      setVideoFileName('');

      // Reload reels list
      await loadReels();
    } catch (err) {
      setErrorMessage(
        err?.message || err?.data?.message || 'Failed to publish reel. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Reel
  const handleDeleteReel = async (reelId) => {
    if (!window.confirm('Are you sure you want to delete this reel? It will no longer appear on the homepage.')) {
      return;
    }
    try {
      setDeletingReelId(reelId);
      await reelService.deleteReel(reelId);
      setExistingReels((prev) => prev.filter((r) => (r._id || r.id) !== reelId));
      setSuccessMessage('Reel deleted successfully.');
    } catch (err) {
      setErrorMessage(err?.message || 'Failed to delete reel.');
    } finally {
      setDeletingReelId(null);
    }
  };

  return (
    <div className="admin-reels-page">
      {/* ── Top Header Bar ── */}
      <div className="admin-reels-header">
        <div className="admin-reels-header-left">
          <button
            type="button"
            className="admin-reels-back-btn"
            onClick={handleHome}
          >
            <ArrowLeft size={16} />
            <span>Return to Store</span>
          </button>
          <div className="admin-reels-header-title-wrap">
            <span className="admin-reels-eyebrow">
              <Sparkles size={13} />
              STOREFRONT SHORT VIDEOS • ADMIN STUDIO
            </span>
            <h1 className="admin-reels-title">Reels &amp; Short Videos Manager</h1>
            <p className="admin-reels-subtitle">
              Upload edge-to-edge vertical videos to Cloudinary and link your Instagram reel. Customers will enjoy true full-screen video with a direct button to visit your Instagram post.
            </p>
          </div>
        </div>

        <div className="admin-reels-stats-pill">
          <Film size={16} />
          <span>{existingReels.length} Active Reels</span>
        </div>
      </div>

      {/* ── Feedback Alerts ── */}
      {errorMessage && (
        <div className="admin-reels-alert error">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage(null)}>✕</button>
        </div>
      )}

      {successMessage && (
        <div className="admin-reels-alert success">
          <CheckCircle size={18} />
          <span>{successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage(null)}>✕</button>
        </div>
      )}

      {/* ── Main Studio Grid ── */}
      <div className="admin-reels-grid">
        {/* Left Form: Add New Reel */}
        <div className="admin-reels-panel form-panel">
          <div className="admin-reels-panel-header">
            <div className="admin-reels-panel-title-wrap">
              <PlusCircle size={18} className="panel-icon" />
              <h2>Publish New Video Reel</h2>
            </div>
            <p className="admin-reels-panel-sub">
              Upload pure 9:16 vertical video. No product association required.
            </p>
          </div>

          <form onSubmit={handleSubmitReel} className="admin-reels-form">
            {/* 1. Title (Optional) */}
            <div className="admin-reels-field">
              <label className="admin-reels-label" htmlFor="reel-title">
                Reel Title <span className="admin-reels-optional">(Optional)</span>
              </label>
              <input
                id="reel-title"
                type="text"
                className="admin-reels-input"
                placeholder="e.g. Pure Brass Ganesha Wall Hanging Unboxing"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
              />
              <span className="admin-reels-hint">
                Optional caption displayed beneath the card on the homepage carousel.
              </span>
            </div>

            {/* 2. Video Upload (Cloudinary Dropzone) */}
            <div className="admin-reels-field">
              <label className="admin-reels-label">
                Reel Video (MP4 / WebM / MOV) <em>*</em>
              </label>

              <div
                className={`admin-reels-dropzone ${videoUrl ? 'has-video' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    fileInputRef.current?.click();
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  style={{ display: 'none' }}
                  onChange={handleVideoFileChange}
                />

                {isUploadingVideo ? (
                  <div className="admin-reels-upload-state">
                    <Loader2 size={32} className="spin-anim" style={{ color: '#D2B98C' }} />
                    <span className="admin-reels-upload-prompt">Uploading video to Cloudinary...</span>
                    <span className="admin-reels-upload-subtext">Please wait while the media is being processed.</span>
                  </div>
                ) : videoUrl ? (
                  <div className="admin-reels-video-preview-wrap">
                    <video
                      src={videoUrl}
                      controls
                      playsInline
                      className="admin-reels-video-preview"
                    />
                    <div className="admin-reels-video-preview-meta">
                      <span className="admin-reels-preview-status">
                        <CheckCircle size={14} color="#16a34a" /> {videoFileName ? `${videoFileName} ready` : 'Video ready'}
                      </span>
                      <button
                        type="button"
                        className="admin-reels-replace-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        Change Video File
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="admin-reels-upload-prompt-wrap">
                    <div className="admin-reels-upload-icon-circle">
                      <Upload size={22} />
                    </div>
                    <span className="admin-reels-upload-prompt">Click to upload reel video</span>
                    <span className="admin-reels-upload-subtext">
                      Supports vertical 9:16 MP4 or WebM (up to 100MB)
                    </span>
                  </div>
                )}
              </div>

              {/* Direct Video URL Fallback */}
              <div className="admin-reels-url-fallback">
                <span className="admin-reels-url-fallback-label">Or paste a direct Video URL:</span>
                <input
                  type="url"
                  className="admin-reels-input-small"
                  placeholder="https://res.cloudinary.com/.../video.mp4"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                />
              </div>
            </div>

            {/* 3. Instagram Reel Link (For Visit Original Reel CTA) */}
            <div className="admin-reels-field">
              <label className="admin-reels-label" htmlFor="reel-insta-url">
                Instagram Reel Link <span className="admin-reels-optional">(Recommended for "Visit Original Reel" Button)</span>
              </label>
              <div className="admin-reels-input-with-icon">
                <InstagramIcon size={18} className="input-icon" />
                <input
                  id="reel-insta-url"
                  type="url"
                  className="admin-reels-input with-icon"
                  placeholder="https://www.instagram.com/reel/C8qXYZ123/"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                />
              </div>
              <span className="admin-reels-hint">
                When visitors watch the video in full screen, this link will power the <strong>"Visit Original Reel"</strong> button to open your Instagram post.
              </span>
            </div>

            {/* Submit Button */}
            <div className="admin-reels-actions">
              <button
                type="submit"
                className="admin-reels-submit-btn"
                disabled={isSubmitting || isUploadingVideo || !videoUrl}
              >
                <Film size={17} />
                <span>{isSubmitting ? 'Publishing Reel...' : 'Publish Reel to Homepage'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Panel: Live Card Preview & Details */}
        <div className="admin-reels-panel preview-panel">
          <div className="admin-reels-panel-header">
            <div className="admin-reels-panel-title-wrap">
              <Film size={18} className="panel-icon" />
              <h2>Shelf Card Preview</h2>
            </div>
            <p className="admin-reels-panel-sub">
              How this reel will appear in the homepage carousel.
            </p>
          </div>

          <div className="admin-reels-preview-card-wrap">
            <div className="admin-preview-reel-card">
              <div className="admin-preview-media-box">
                {videoUrl ? (
                  <video
                    src={videoUrl}
                    muted
                    loop
                    playsInline
                    autoPlay
                    className="admin-preview-img"
                  />
                ) : (
                  <div className="admin-preview-placeholder">
                    <div className="admin-preview-ig-glow">
                      <Film size={36} strokeWidth={1.5} />
                    </div>
                    <span>Video Preview</span>
                  </div>
                )}

                {/* Reel Badge */}
                <div className="admin-preview-ig-pill">
                  <Film size={12} />
                  <span>Reel</span>
                </div>

                {/* Center Play Icon */}
                <div className="admin-preview-play-icon">
                  <Play size={20} fill="currentColor" />
                </div>
              </div>

              <div className="admin-preview-meta">
                <h4 className="admin-preview-title">
                  {title.trim() || <span style={{ opacity: 0.5, fontStyle: 'italic' }}>No title (video only)</span>}
                </h4>
                {instagramUrl && (
                  <div className="admin-preview-url-tag">
                    <InstagramIcon size={12} />
                    <span>Instagram Link Attached</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Section: Active Published Reels ── */}
      <div className="admin-reels-table-section">
        <div className="admin-reels-table-header">
          <div>
            <h2>Published Reels on Storefront ({existingReels.length})</h2>
            <p>Manage, inspect, or delete live reels from your homepage carousel.</p>
          </div>
        </div>

        {isLoadingReels ? (
          <div className="admin-reels-loading">
            <div className="admin-reels-spinner" />
            <span>Loading active reels...</span>
          </div>
        ) : existingReels.length === 0 ? (
          <div className="admin-reels-empty">
            <Film size={42} strokeWidth={1.3} className="empty-icon" />
            <h3>No reels published yet</h3>
            <p>Upload your first reel video above to showcase craftsmanship on your storefront.</p>
          </div>
        ) : (
          <div className="admin-reels-grid-list">
            {existingReels.map((reel) => {
              const reelLink = reel.instagramUrl || '';
              return (
                <div key={reel._id || reel.id} className="admin-reel-item-card">
                  <div className="admin-reel-item-thumb">
                    {reel.videoUrl ? (
                      <video
                        src={reel.videoUrl}
                        muted
                        playsInline
                        className="admin-reel-thumb-video"
                      />
                    ) : (
                      <div className="admin-reel-item-fallback">
                        <Film size={26} />
                      </div>
                    )}
                    <span className="admin-reel-item-badge">
                      <Film size={11} /> Reel
                    </span>
                  </div>

                  <div className="admin-reel-item-content">
                    <h3 className="admin-reel-item-title">{reel.title || 'Untitled Reel'}</h3>

                    <div className="admin-reel-item-links">
                      {reelLink ? (
                        <a
                          href={reelLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-reel-link-btn"
                        >
                          <InstagramIcon size={12} />
                          <span>View on Instagram</span>
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="admin-reel-link-btn" style={{ opacity: 0.6 }}>
                          Direct Video
                        </span>
                      )}
                    </div>

                    <div className="admin-reel-item-footer">
                      <span className="admin-reel-views">
                        {reel.viewsCount || 0} views
                      </span>
                      <button
                        type="button"
                        className="admin-reel-delete-btn"
                        onClick={() => handleDeleteReel(reel._id || reel.id)}
                        disabled={deletingReelId === (reel._id || reel.id)}
                        title="Delete Reel"
                      >
                        <Trash2 size={15} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
