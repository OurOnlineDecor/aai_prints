const CustomProduct = require('../models/customProduct.model');
const ApiError = require('../utils/apiError.util');
const ApiResponse = require('../utils/apiResponse.util');
const slugify = require('../utils/slugify.util');

// Helper to escape user search queries and prevent ReDoS
const escapeRegex = (str) => str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

/**
 * @desc    Get all active custom products
 * @route   GET /api/v1/custom-products
 * @access  Public
 */
const getCustomProducts = async (req, res, next) => {
  try {
    const { category, search, sort = 'order' } = req.query;
    const query = { isActive: true, isDeleted: false };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search && search.trim().length > 0) {
      const sanitized = escapeRegex(search.trim());
      query.$or = [
        { name: { $regex: sanitized, $options: 'i' } },
        { requirements: { $regex: sanitized, $options: 'i' } },
        { description: { $regex: sanitized, $options: 'i' } },
      ];
    }

    let sortOption = { order: 1, createdAt: -1 };
    if (sort === 'price-asc') sortOption = { price: 1 };
    if (sort === 'price-desc') sortOption = { price: -1 };
    if (sort === 'newest') sortOption = { createdAt: -1 };

    const customProducts = await CustomProduct.find(query).sort(sortOption);

    return ApiResponse.send(
      res,
      200,
      { customProducts, count: customProducts.length },
      'Custom products fetched successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single custom product by slug or ID
 * @route   GET /api/v1/custom-products/:idOrSlug
 * @access  Public
 */
const getCustomProductBySlugOrId = async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    let customProduct;

    if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      customProduct = await CustomProduct.findOne({ _id: idOrSlug, isDeleted: false });
    } else {
      customProduct = await CustomProduct.findOne({ slug: idOrSlug.toLowerCase(), isDeleted: false });
    }

    if (!customProduct) {
      return next(new ApiError(404, 'Customizable product not found'));
    }

    return ApiResponse.send(
      res,
      200,
      { customProduct },
      'Customizable product fetched successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new custom product (Admin only)
 * @route   POST /api/v1/custom-products
 * @access  Private (Admin)
 */
const createCustomProduct = async (req, res, next) => {
  try {
    const {
      name,
      images,
      requirements,
      category,
      price,
      originalPrice,
      description,
      whatsappNumber,
      order,
    } = req.body;

    if (!name || !requirements) {
      return next(new ApiError(400, 'Product name and requirements are required.'));
    }

    let slug = slugify(name);
    const existing = await CustomProduct.findOne({ slug });
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const customProduct = await CustomProduct.create({
      name,
      slug,
      images: Array.isArray(images) && images.length > 0 ? images : ['/new-images/product-placeholder.jpg'],
      requirements,
      category: category || 'Personalized Decor',
      price: Number(price) || 0,
      originalPrice: originalPrice ? Number(originalPrice) : null,
      description: description || '',
      whatsappNumber: whatsappNumber || '917014945523',
      order: Number(order) || 0,
    });

    return ApiResponse.send(
      res,
      201,
      { customProduct },
      'Customizable product created successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update custom product (Admin only)
 * @route   PUT /api/v1/custom-products/:id
 * @access  Private (Admin)
 */
const updateCustomProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.name) {
      updates.slug = slugify(updates.name);
    }

    const customProduct = await CustomProduct.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!customProduct) {
      return next(new ApiError(404, 'Customizable product not found'));
    }

    return ApiResponse.send(
      res,
      200,
      { customProduct },
      'Customizable product updated successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Soft-delete custom product (Admin only)
 * @route   DELETE /api/v1/custom-products/:id
 * @access  Private (Admin)
 */
const deleteCustomProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customProduct = await CustomProduct.findByIdAndUpdate(
      id,
      { isDeleted: true, isActive: false },
      { new: true }
    );

    if (!customProduct) {
      return next(new ApiError(404, 'Customizable product not found'));
    }

    return ApiResponse.send(
      res,
      200,
      { id: customProduct._id },
      'Customizable product removed successfully'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomProducts,
  getCustomProductBySlugOrId,
  createCustomProduct,
  updateCustomProduct,
  deleteCustomProduct,
};
