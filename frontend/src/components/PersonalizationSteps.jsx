import React from 'react';
import { Gift, ImageDown, Truck, ArrowRight } from 'lucide-react';
import './PersonalizationSteps.css';

const STEPS = [
  {
    step: '01',
    icon: Gift,
    title: 'Choose Your Piece',
    description: 'Select the devotional frame, backlit artwork, or home décor item you wish to personalize.',
  },
  {
    step: '02',
    icon: ImageDown,
    title: 'Add Your Details',
    description: 'Enter your custom names, sacred mantras, or upload photos directly on the product page.',
  },
  {
    step: '03',
    icon: Truck,
    title: 'We Craft & Deliver',
    description: 'Our master artisans handcraft your piece with precision and deliver it safely to your doorstep.',
  },
];

export default function PersonalizationSteps({ onNavigateShop }) {
  return (
    <section className="personalization-steps-section" aria-label="How Personalization Works">
      <div className="personalization-steps-container">
        {/* Section Header */}
        <div className="personalization-header">
          <span className="personalization-eyebrow">HOW PERSONALIZATION WORKS</span>
          <h2 className="personalization-title">Made for you, in three simple steps</h2>
          <p className="personalization-subtitle">
            From treasured family memories to sacred spiritual motifs, we make bespoke customization effortless.
          </p>
        </div>

        {/* 3-Step Process Diagram Cards */}
        <div className="personalization-grid">
          {STEPS.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <div key={item.step} className="personalization-card">
                <span className="personalization-card-num">{item.step}</span>

                <div className="personalization-icon-badge" aria-hidden="true">
                  <IconComponent size={26} strokeWidth={1.6} />
                </div>

                <h3 className="personalization-card-title">{item.title}</h3>
                <p className="personalization-card-desc">{item.description}</p>

                {/* Desktop Flow Arrow Indicator between step 1 & 2, and 2 & 3 */}
                {index < STEPS.length - 1 && (
                  <div className="personalization-flow-arrow" aria-hidden="true">
                    <span></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Optional Interactive CTA */}
        {onNavigateShop && (
          <div className="personalization-cta-wrap">
            <button
              type="button"
              className="personalization-cta-btn"
              onClick={onNavigateShop}
            >
              Explore Personalized Collection
              <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
