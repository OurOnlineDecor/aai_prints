const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  getCustomProducts,
  getCustomProductBySlugOrId,
  createCustomProduct,
  updateCustomProduct,
  deleteCustomProduct,
} = require('../controllers/customProduct.controller');
const { protect, requireAdmin } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

// Public routes
router.get('/', getCustomProducts);
router.get('/:idOrSlug', getCustomProductBySlugOrId);

// Admin-only management routes
router.post(
  '/',
  protect,
  requireAdmin,
  [
    body('name').trim().notEmpty().withMessage('Product name is required'),
    body('requirements').trim().notEmpty().withMessage('Product requirements instruction is required'),
    body('images').isArray({ min: 1 }).withMessage('At least one product photo is required'),
  ],
  validate,
  createCustomProduct
);

router.put('/:id', protect, requireAdmin, updateCustomProduct);
router.delete('/:id', protect, requireAdmin, deleteCustomProduct);

module.exports = router;
