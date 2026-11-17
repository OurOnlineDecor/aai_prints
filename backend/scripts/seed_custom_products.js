const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../db/connect');
const CustomProduct = require('../models/customProduct.model');

const DUMMY_CUSTOM_PRODUCTS = [
  {
    name: 'Custom Backlit Acrylic LED Wall Frame',
    slug: 'custom-backlit-acrylic-led-wall-frame',
    images: [
      '/new-images/cat-backlit-led-frames.jpg',
      '/new-images/cat-framed-wall-art.jpg',
    ],
    category: 'Custom Frames',
    price: 1499,
    originalPrice: 2499,
    description:
      'High-grade imported cast acrylic backlit frame with brilliant LED luminescence. Handcrafted to order with custom photos, devotional motifs, or family blessings.',
    requirements:
      `• Required Photo: 1 or 2 high-resolution photos (portrait/landscape, min 1080p).
• Optional Custom Text: Family name, anniversary date, or sacred mantra (e.g. 'The Sharma Family' or 'ॐ नमः शिवाय').
• Custom Instructions: Choose LED backlighting tone (Warm Amber Gold, Crisp Natural White, or Ice Blue). Specify whether you need a wall-mounting hanging hook or an acrylic tabletop easel stand.`,
    whatsappNumber: '919876543210',
    order: 1,
    isActive: true,
  },
  {
    name: 'Personalized Laser-Cut Silhouette Wooden Wall Clock',
    slug: 'personalized-silhouette-wooden-wall-clock',
    images: [
      '/new-images/cat-wall-clocks.jpg',
      '/new-images/cat-metal-wall-art.jpg',
    ],
    category: 'Custom Clocks',
    price: 1299,
    originalPrice: 1999,
    description:
      'Bespoke designer wall clock laser-crafted from premium engineered teak veneer. Features silent sweep movement and custom silhouette artwork tailored to your space.',
    requirements:
      `• Required Silhouette: Choose your silhouette theme (Family portrait outline, Devotional deity, or Couple silhouette).
• Optional Custom Text: Custom surname, couple names, or special date engraved cleanly at 6 o'clock.
• Custom Instructions: Specify preferred wood finish (Rich Teak Walnut or Natural Pine Oak). Clock hands style (Sleek Modern Gold or Classic Black Needle).`,
    whatsappNumber: '919876543210',
    order: 2,
    isActive: true,
  },
  {
    name: 'Custom 3D Acrylic Car Dashboard Figurine',
    slug: 'custom-3d-acrylic-car-dashboard-figurine',
    images: [
      '/new-images/cat-dashboard-idols.jpg',
      '/new-images/cat-car-hangings.jpg',
    ],
    category: 'Custom Car Decor',
    price: 499,
    originalPrice: 899,
    description:
      'Pocket-sized laser-etched devotional idol or custom portrait figurine designed specifically for car dashboards. Fitted with heavy-duty non-slip 3M mounting pads.',
    requirements:
      `• Required Motif: Specify chosen deity, portrait silhouette, or custom emblem (e.g. Mahadev, Khatu Shyam Ji, Ram Lalla, or personalized silhouette).
• Optional Custom Text: Vehicle registration number or custom travel blessing engraved on the pedestal base.
• Custom Instructions: Mention pedestal base type (Standard Clear Acrylic or Warm Sand Wood Base). Heavy-duty reusable non-slip 3M adhesive included.`,
    whatsappNumber: '919876543210',
    order: 3,
    isActive: true,
  },
];

async function seed() {
  try {
    await connectDB();
    console.log('[Seed] Connected to MongoDB...');

    for (const prod of DUMMY_CUSTOM_PRODUCTS) {
      await CustomProduct.findOneAndUpdate(
        { slug: prod.slug },
        { $set: prod, $unset: { badge: '' } },
        { upsert: true, new: true }
      );
      console.log(`[Seed] Seeded/Updated Custom Product: ${prod.name}`);
    }

    console.log('✅ Custom products successfully seeded!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seed();
