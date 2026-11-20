import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Instantly normalize legacy hash URLs (e.g. #/shop -> /shop) before React Router initializes
if (typeof window !== 'undefined' && window.location.hash) {
  const hash = window.location.hash;
  if (hash.startsWith('#/')) {
    const clean = hash.slice(1);
    window.history.replaceState(null, '', clean);
  } else if (hash === '#b2b') {
    window.history.replaceState(null, '', '/b2b');
  } else if (hash === '#shop') {
    window.history.replaceState(null, '', '/shop');
  } else if (hash === '#cart') {
    window.history.replaceState(null, '', '/cart');
  } else if (hash === '#wishlist') {
    window.history.replaceState(null, '', '/wishlist');
  } else if (hash === '#checkout') {
    window.history.replaceState(null, '', '/checkout');
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
