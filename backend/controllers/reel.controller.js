const Reel = require('../models/reel.model');
const Product = require('../models/product.model');
const ApiError = require('../utils/apiError.util');
const ApiResponse = require('../utils/apiResponse.util');

// @desc    Get all active reels (for homepage showcase)
// @route   GET /api/v1/reels
// @access  Public
const getReels = async (req, res, next) => {
  try {
    const { all } = req.query;
    const filter = all === 'true' ? {} : { isActive: true };

    const reels = await Reel.find(filter)
      .sort({ order: 1, createdAt: -1 });

    return ApiResponse.send(res, 200, {
      count: reels.length,
      reels
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single reel by ID
// @route   GET /api/v1/reels/:id
// @access  Public
const getReelById = async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.id);

    if (!reel) {
      return next(new ApiError(404, 'Reel not found'));
    }

    return ApiResponse.send(res, 200, { reel });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new reel
// @route   POST /api/v1/reels
// @access  Private/Admin
const createReel = async (req, res, next) => {
  try {
    const { title, videoUrl, instagramUrl, duration, order, isActive } = req.body;
    const finalVideoUrl = (videoUrl || '').trim();

    if (!finalVideoUrl) {
      return next(new ApiError(400, 'Video URL or upload is required'));
    }

    const reel = await Reel.create({
      title: (title || '').trim(),
      videoUrl: finalVideoUrl,
      instagramUrl: (instagramUrl || '').trim(),
      thumbnailUrl: '',
      caption: '',
      duration: duration || 0,
      order: order !== undefined ? order : 0,
      isActive: isActive !== undefined ? isActive : true
    });

    return ApiResponse.send(res, 201, { reel }, 'Reel created successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Update reel
// @route   PUT /api/v1/reels/:id
// @access  Private/Admin
const updateReel = async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) {
      return next(new ApiError(404, 'Reel not found'));
    }

    const updateData = { ...req.body };
    if (updateData.instagramUrl && !updateData.videoUrl) {
      updateData.videoUrl = updateData.instagramUrl;
    }

    const updatedReel = await Reel.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return ApiResponse.send(res, 200, { reel: updatedReel }, 'Reel updated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Delete reel
// @route   DELETE /api/v1/reels/:id
// @access  Private/Admin
const deleteReel = async (req, res, next) => {
  try {
    const reel = await Reel.findByIdAndDelete(req.params.id);
    if (!reel) {
      return next(new ApiError(404, 'Reel not found'));
    }

    return ApiResponse.send(res, 200, null, 'Reel deleted successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Track reel view
// @route   PATCH /api/v1/reels/:id/view
// @access  Public
const trackReelView = async (req, res, next) => {
  try {
    const reel = await Reel.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewsCount: 1 } },
      { new: true }
    );

    if (!reel) {
      return next(new ApiError(404, 'Reel not found'));
    }

    return ApiResponse.send(res, 200, { viewsCount: reel.viewsCount });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReels,
  getReelById,
  createReel,
  updateReel,
  deleteReel,
  trackReelView
};
