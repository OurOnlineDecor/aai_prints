require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const connectDB = require('./connect');
const Category = require('../models/category.model');

/**
 * ─────────────────────────────────────────────────────────────
 * Aai Prints — Category-Only Seeder
 * Safely seeds the complete category & subcategory taxonomy
 * without touching users, products, orders, reviews, or carts.
 * ─────────────────────────────────────────────────────────────
 */
const seedCategories = async () => {
  try {
    console.log('[Seed Categories]: Connecting to MongoDB...');
    await connectDB();

    console.log('[Seed Categories]: Purging existing categories collection only...');
    await Category.deleteMany({});

    console.log('[Seed Categories]: Seeding parent categories...');
    const parentCategoriesData = [
      {
        name: 'Devotional',
        slug: 'devotional',
        description: 'Devotional idols, frames, and spiritual decor designed for elegant living',
        image: '/new-images/cat-wall-hangings.jpg',
        order: 1,
        isActive: true
      },
      {
        name: 'Car Decor',
        slug: 'car-decor',
        description: 'Graceful dashboard idols and spiritual hangings for every drive',
        image: '/new-images/cat-dashboard-idols.jpg',
        order: 2,
        isActive: true
      },
      {
        name: 'Wall Decor',
        slug: 'wall-decor',
        description: 'Artistic wall hangings, laser-cut metal sculptures, and clocks',
        image: '/new-images/cat-metal-wall-art.jpg',
        order: 3,
        isActive: true
      },
      {
        name: 'Festive',
        slug: 'festive',
        description: 'Sacred festive items, jhanki decor, and ceremonial treasures',
        image: '/new-images/cat-wall-hangings.jpg',
        order: 4,
        isActive: true
      },
      {
        name: 'Gifts',
        slug: 'gifts',
        description: 'Thoughtful gift combos, desk standees, and auspicious tokens',
        image: '/new-images/cat-gift-combos.jpg',
        order: 5,
        isActive: true
      },
      {
        name: 'Personalized',
        slug: 'personalized',
        description: 'Customized bespoke frames, engraved clocks, and personalized decor',
        image: '/new-images/cat-backlit-led-frames.jpg',
        order: 6,
        isActive: true
      }
    ];

    const parents = await Category.insertMany(parentCategoriesData);
    const parentMap = {};
    parents.forEach((cat) => {
      parentMap[cat.slug] = cat._id;
    });

    console.log('[Seed Categories]: Seeding subcategories linked to parents...');
    const subcategoriesData = [
      // Devotional Subcategories
      {
        name: 'Wall Hangings',
        slug: 'wall-hangings',
        description: 'Premium spiritual wall hangings and divine tapestries',
        image: '/new-images/cat-wall-hangings.jpg',
        parentCategory: parentMap['devotional'],
        order: 1,
        isActive: true
      },
      {
        name: 'Backlit LED Frames',
        slug: 'backlit-led-frames',
        description: 'Illuminated devotional frames with warm ambient LED radiance',
        image: '/new-images/cat-backlit-led-frames.jpg',
        parentCategory: parentMap['devotional'],
        order: 2,
        isActive: true
      },
      {
        name: 'Idols & Tabletop',
        slug: 'idols-tabletop',
        description: 'Finely crafted temple and home shrine deities for tabletop display',
        image: '/new-images/cat-dashboard-idols.jpg',
        parentCategory: parentMap['devotional'],
        order: 3,
        isActive: true
      },
      {
        name: 'Yantra & Chakra',
        slug: 'yantra-chakra',
        description: 'Sacred geometry, energized yantras, and chakra wall plates',
        image: '/new-images/cat-wall-hangings.jpg',
        parentCategory: parentMap['devotional'],
        order: 4,
        isActive: true
      },

      // Car Decor Subcategories
      {
        name: 'Dashboard Idols',
        slug: 'dashboard-idols',
        description: 'Divine travel companions with premium non-slip adhesive mounts',
        image: '/new-images/cat-dashboard-idols.jpg',
        parentCategory: parentMap['car-decor'],
        order: 1,
        isActive: true
      },
      {
        name: 'Car Hangings',
        slug: 'car-hangings',
        description: 'Rear-view mirror hangings with protective mantras and tassels',
        image: '/new-images/cat-car-hangings.jpg',
        parentCategory: parentMap['car-decor'],
        order: 2,
        isActive: true
      },
      {
        name: 'Combo Sets',
        slug: 'combo-sets',
        description: 'Matched dashboard idol and mirror hanging sets for vehicles',
        image: '/new-images/cat-dashboard-idols.jpg',
        parentCategory: parentMap['car-decor'],
        order: 3,
        isActive: true
      },

      // Wall Decor Subcategories
      {
        name: 'Metal Wall Art',
        slug: 'metal-wall-art',
        description: 'Precision laser-cut architectural steel and wrought iron art',
        image: '/new-images/cat-metal-wall-art.jpg',
        parentCategory: parentMap['wall-decor'],
        order: 1,
        isActive: true
      },
      {
        name: 'Wall Clocks',
        slug: 'wall-clocks',
        description: 'Silent sweep quartz movement designer decorative wall clocks',
        image: '/new-images/cat-wall-clocks.jpg',
        parentCategory: parentMap['wall-decor'],
        order: 2,
        isActive: true
      },
      {
        name: 'Framed Art',
        slug: 'framed-art',
        description: 'Gallery-wrapped prints and museum-grade acrylic framed wall art',
        image: '/new-images/cat-framed-wall-art.jpg',
        parentCategory: parentMap['wall-decor'],
        order: 3,
        isActive: true
      },

      // Festive Subcategories
      {
        name: 'Ganesh Chaturthi',
        slug: 'ganesh-chaturthi',
        description: 'Auspicious decor and ceremonial arrangements for Ganesh Utsav',
        image: '/new-images/cat-wall-hangings.jpg',
        parentCategory: parentMap['festive'],
        order: 1,
        isActive: true
      },
      {
        name: 'Jhanki Sets',
        slug: 'jhanki-sets',
        description: 'Artistic tableau and altar displays for Janmashtami and festivals',
        image: '/new-images/cat-desk-standees.jpg',
        parentCategory: parentMap['festive'],
        order: 2,
        isActive: true
      },
      {
        name: 'Diwali',
        slug: 'diwali',
        description: 'Festive lights, torans, and shimmering wall ornaments for Diwali',
        image: '/new-images/cat-backlit-led-frames.jpg',
        parentCategory: parentMap['festive'],
        order: 3,
        isActive: true
      },

      // Gifts Subcategories
      {
        name: 'Desk Standees',
        slug: 'desk-standees',
        description: 'Miniature spiritual architecture and elegant desk standees',
        image: '/new-images/cat-desk-standees.jpg',
        parentCategory: parentMap['gifts'],
        order: 1,
        isActive: true
      },
      {
        name: 'Gift Combos',
        slug: 'gift-combos',
        description: 'Curated gift hampers combining idols, fragrance, and wall art',
        image: '/new-images/cat-gift-combos.jpg',
        parentCategory: parentMap['gifts'],
        order: 2,
        isActive: true
      },
      {
        name: 'Return Gifts',
        slug: 'return-gifts',
        description: 'Memorable tokens for housewarmings, weddings, and poojas',
        image: '/new-images/cat-gift-combos.jpg',
        parentCategory: parentMap['gifts'],
        order: 3,
        isActive: true
      },

      // Personalized Subcategories
      {
        name: 'Custom Frames',
        slug: 'custom-frames',
        description: 'Personalized family portraits and photo backlit LED frames',
        image: '/new-images/cat-backlit-led-frames.jpg',
        parentCategory: parentMap['personalized'],
        order: 1,
        isActive: true
      },
      {
        name: 'Custom Clocks',
        slug: 'custom-clocks',
        description: 'Laser-engraved personalized name and anniversary wooden wall clocks',
        image: '/new-images/cat-wall-clocks.jpg',
        parentCategory: parentMap['personalized'],
        order: 2,
        isActive: true
      },
      {
        name: 'Custom Car Decor',
        slug: 'custom-car-decor',
        description: 'Tailored 3D acrylic idols and nameplate dashboard figurines',
        image: '/new-images/cat-dashboard-idols.jpg',
        parentCategory: parentMap['personalized'],
        order: 3,
        isActive: true
      }
    ];

    const subcats = await Category.insertMany(subcategoriesData);

    console.log('\n======================================================');
    console.log('✅ CATEGORY SEEDING COMPLETE (ONLY CATEGORIES TOUCHED)');
    console.log('======================================================');
    console.log(`Parent Categories Created: ${parents.length}`);
    parents.forEach((p) => console.log(`  • ${p.name} (/${p.slug})`));
    console.log(`\nSubcategories Created:     ${subcats.length}`);
    subcats.forEach((s) => console.log(`  • ${s.name} (/${s.slug})`));
    console.log(`\nTotal Categories in DB:    ${await Category.countDocuments()}`);
    console.log('======================================================\n');

    process.exit(0);
  } catch (error) {
    console.error(`[Seed Categories Error]: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
};

seedCategories();
