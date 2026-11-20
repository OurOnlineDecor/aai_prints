import { apiClient } from './api';

/**
 * ─────────────────────────────────────────────────────────────
 * Aai Prints — Reel / Short Video Service
 * ─────────────────────────────────────────────────────────────
 */

export const reelService = {
  /**
   * Fetch active reels for the homepage showcase.
   * Returns empty array if no reels uploaded yet.
   */
  async getReels() {
    try {
      const response = await apiClient('/reels');
      if (response && response.data && Array.isArray(response.data.reels)) {
        return response.data.reels.map((reel) => ({
          ...reel,
          id: reel._id,
          instagramUrl: reel.instagramUrl || reel.videoUrl || '',
          videoUrl: reel.videoUrl || reel.instagramUrl || '',
          thumbnailUrl: reel.thumbnailUrl || '',
        }));
      }
      return [];
    } catch (err) {
      console.warn('[ReelService] Failed to load reels from API:', err?.message || err);
      return [];
    }
  },

  /**
   * Increment view counter for a reel
   */
  async trackView(reelId) {
    if (!reelId || reelId.startsWith('reel-dev-')) return;
    try {
      await apiClient(`/reels/${reelId}/view`, { method: 'PATCH' });
    } catch (err) {
      // Non-blocking telemetry
      console.debug('[ReelService] View tracking failed:', err?.message);
    }
  },

  /**
   * Create a new reel with an Instagram link (Admin only)
   */
  async createReel(reelData) {
    const response = await apiClient('/reels', {
      method: 'POST',
      body: JSON.stringify(reelData)
    });
    return response.data?.reel;
  },

  /**
   * Delete a reel (Admin only)
   */
  async deleteReel(reelId) {
    const response = await apiClient(`/reels/${reelId}`, {
      method: 'DELETE'
    });
    return response;
  },

  /**
   * Upload video file directly to Cloudinary via backend media API
   */
  async uploadVideo(file) {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('folder', 'aai_prints/reels');

    const response = await apiClient('/media/upload-video', {
      method: 'POST',
      body: formData
    });

    return response.data?.asset;
  }
};
