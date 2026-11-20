import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CategoryScrollbar from '../components/CategoryScrollbar';
import HeroVideo from '../components/HeroVideo';
import ProductSection from '../components/ProductSection';
import PersonalizationSteps from '../components/PersonalizationSteps';
import HeroSlider from '../components/HeroSlider';
import ReelsSection from '../components/ReelsSection';
import Testimonials from '../components/Testimonials';
import BrandsTrustSection from '../components/BrandsTrustSection';
import PromoBanner from '../components/PromoBanner';
import { fetchTrendingProducts, getAllProducts } from '../services/productService';

/**
 * Clean, lightweight HomePage component.
 * Instant initial paint with local fallback, followed by on-demand live refresh.
 */
export default function HomePage() {
  const navigate = useNavigate();
  const initialTrending = getAllProducts().filter((p) => p.isTrending || p.trending).slice(0, 8);
  const [trendingProducts, setTrendingProducts] = useState(initialTrending);
  const [isLoadingTrending, setIsLoadingTrending] = useState(() => initialTrending.length === 0);

  useEffect(() => {
    let isMounted = true;
    fetchTrendingProducts(8)
      .then((items) => {
        if (isMounted) {
          if (Array.isArray(items) && items.length > 0) {
            setTrendingProducts(items);
          }
          setIsLoadingTrending(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingTrending(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectProduct = (prod) => {
    if (!prod) return;
    const slug = prod.slug || String(prod.id || prod._id);
    navigate(`/product/${slug}`);
  };

  const handleSelectCategory = (cat) => {
    navigate(`/shop?category=${encodeURIComponent(cat)}`);
  };

  return (
    <main>
      {/* 1. Horizontal Category Circles Marquee */}
      <CategoryScrollbar onSelectCategory={handleSelectCategory} />

      {/* 2. Brand Cinema Video Hero */}
      <HeroVideo />

      {/* 3. Trending Now Product Section (Always mounted with skeleton to eliminate layout shift) */}
      <ProductSection
        sectionId="trending"
        title="Trending Now"
        subtitle="Most popular and trending artworks chosen by our collectors"
        products={trendingProducts}
        isLoading={isLoadingTrending}
        onSelectProduct={handleSelectProduct}
        onViewMore={() => navigate('/shop')}
      />

      {/* 4. How Personalization Works Process Diagram */}
      <PersonalizationSteps onNavigateShop={() => navigate('/shop?category=Personalized')} />

      {/* 5. Whatmore-style Short Videos / Reels Showcase */}
      <ReelsSection />

      {/* 6. Curated Gallery Showcase (2:1 visual slider) */}
      <HeroSlider onSelectCategory={handleSelectCategory} />

      {/* 7. Customer Reviews Section */}
      <Testimonials />

      {/* 8. Brands That Trust Us - Client & Institutional Showcase */}
      <BrandsTrustSection />

      {/* 9. Full-Width Promo Strip (Free Shipping + ₹100 OFF) */}
      <PromoBanner onNavigateShop={() => navigate('/shop')} />
    </main>
  );
}
