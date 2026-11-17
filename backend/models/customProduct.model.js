const mongoose = require('mongoose');

/**
 * ─────────────────────────────────────────────────────────────
 * Aai Prints — Customization Product Model
 * For bespoke/customized items ordered directly via WhatsApp
 * ─────────────────────────────────────────────────────────────
 */
const customProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    images: {
      type: [String],
      required: [true, 'At least one product photo is required'],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length > 0 && val.some((s) => typeof s === 'string' && s.trim().length > 0);
        },
        message: 'At least one product photo is required',
      },
    },
    requirements: {
      type: String,
      required: [true, 'Product requirements instruction text is required'],
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'Personalized Decor',
    },
    price: {
      type: Number,
      default: 0,
      min: [0, 'Price cannot be negative'],
    },
    originalPrice: {
      type: Number,
      default: null,
      min: [0, 'Original price cannot be negative'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    whatsappNumber: {
      type: String,
      trim: true,
      default: '919876543210',
    },
    badge: {
      type: String,
      trim: true,
      default: 'Custom Order',
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('CustomProduct', customProductSchema);
