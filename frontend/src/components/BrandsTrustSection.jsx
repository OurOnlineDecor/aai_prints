import React from 'react';
import './BrandsTrustSection.css';

const BRAND_LOGOS = [
  { name: 'ABAS', src: '/brands/ABAS.jpg' },
  { name: 'AV Production', src: '/brands/AV Production.png' },
  { name: 'Bansal Classes', src: '/brands/Bansal Classes.jpg' },
  { name: 'Company Wala', src: '/brands/Company Wala-06.png' },
  { name: 'Ecomledger', src: '/brands/Ecomledger.png' },
  { name: 'GMC Kota', src: '/brands/GMC Kota.jpg' },
  { name: 'ICAI', src: '/brands/ICAI.jpg' },
  { name: 'India Post', src: '/brands/India-post-logo.jpg' },
  { name: 'Kanungo Sangh', src: '/brands/Kanungo Sangh Logo-01.jpg' },
  { name: 'Kanungo Sangh Council', src: '/brands/Kanungo Sangh Logo-02.jpg' },
  { name: 'Kota Development Authority', src: '/brands/Kota Development Authority.jpeg' },
  { name: 'Magpie', src: '/brands/Magpie Logo-01.png' },
  { name: 'Rotary International', src: '/brands/Rotary International.jpeg' },
  { name: 'RTI', src: '/brands/RTI®-Logoblackofficial.png' },
  { name: 'Shree Shyam Group', src: '/brands/Shree Shyam Group-01.png' },
  { name: 'Shree Shyam Group Heritage', src: '/brands/Shree Shyam Group-02.png' },
  { name: 'Shree Shyam Group Devotional', src: '/brands/Shree Shyam Group-03.png' },
  { name: 'Shree Shyam Group Art', src: '/brands/Shree Shyam Group-04.png' },
  { name: 'Shree Shyam Group Signature', src: '/brands/Shree Shyam Group-05.png' },
  { name: 'SOW', src: '/brands/SOW-01.jpg' },
  { name: 'Unite For Good Rotary', src: '/brands/Unite For Good Rotary.jpeg' }
];

export default function BrandsTrustSection() {
  return (
    <section className="brands-trust-section" aria-label="Brands that trust Aai Prints">
      {/* Centered Editorial Header */}
      <div className="brands-trust-header">
        <h2 className="brands-trust-title">Brands That Trust Us</h2>
      </div>

      {/* Full-Width Edge-to-Edge Marquee Ribbon */}
      <div className="brands-marquee-wrap">
        <div className="brands-marquee-track">
          {/* Primary Set */}
          <div className="brands-marquee-group" aria-hidden="false">
            {BRAND_LOGOS.map((brand, idx) => (
              <div key={`brand-1-${idx}`} className="brand-logo-item" title={brand.name}>
                <img
                  src={brand.src}
                  alt={brand.name}
                  className="brand-logo-img"
                  loading="lazy"
                />
              </div>
            ))}
          </div>

          {/* Cloned Set for Seamless Infinite Loop */}
          <div className="brands-marquee-group" aria-hidden="true">
            {BRAND_LOGOS.map((brand, idx) => (
              <div key={`brand-2-${idx}`} className="brand-logo-item" title={brand.name}>
                <img
                  src={brand.src}
                  alt={brand.name}
                  className="brand-logo-img"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
