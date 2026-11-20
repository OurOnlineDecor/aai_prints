import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PackagePlus,
  Layers,
  Pencil,
  Trash2,
  Search,
  ExternalLink,
  ArrowLeft,
  Building2,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Loader2,
  X,
  Sparkles,
  Tag,
  Box,
  Eye,
  RefreshCw,
  MessageSquare,
  FileText,
  Plus,
  ShoppingBag,
  Truck,
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
} from 'lucide-react';
import { api } from '../services/api';
import { fetchAllProducts } from '../services/productService';
import {
  fetchCustomProducts,
  createCustomProduct,
  deleteCustomProduct,
} from '../services/customProductService';
import {
  fetchAllOrdersAdmin,
  updateOrderStatusAdmin,
} from '../services/orderService';
import AdminEditProductModal from '../components/AdminEditProductModal';
import './AdminAddProductPage.css';

const PRESET_BADGES = ['Bestseller', 'New Launch', 'Devotional', 'Sale', 'Trending'];

export default function AdminAddProductPage({
  onNavigateHome,
  onNavigateShop,
  onNavigateB2B,
  onProductCreated,
  onProductUpdated,
  onProductDeleted,
}) {
  const navigate = useNavigate();
  const handleHome = onNavigateHome || (() => navigate('/'));
  const handleShop = onNavigateShop || (() => navigate('/shop'));
  const handleB2B = onNavigateB2B || (() => navigate('/admin/b2b'));

  // Navigation & Tabs State ('products' = retail hub, 'custom' = customization hub)
  const [activeTab, setActiveTab] = useState('products');
  const [retailSubTab, setRetailSubTab] = useState('list'); // 'list' | 'add'

  // Products Catalog State
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Feedback Banner State
  const [feedback, setFeedback] = useState(null);

  // Modal Editing State
  const [editingProduct, setEditingProduct] = useState(null);

  // ── Add Product Form State ──
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [stock, setStock] = useState('10');
  const [inStock, setInStock] = useState(true);
  const [isTrending, setIsTrending] = useState(false);
  const [dispatchTimeInfo, setDispatchTimeInfo] = useState('Ready to Dispatch within 24-48 Hours');
  const [badges, setBadges] = useState(['Devotional']);
  const [customBadge, setCustomBadge] = useState('');

  // Images state
  const [images, setImages] = useState([]);
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  // Variants state
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState([
    {
      name: '12x18 inches / Rolled Canvas',
      size: '12x18 in',
      material: 'Canvas',
      price: '',
      originalPrice: '',
      stock: '10',
    },
  ]);

  // Categories list from API
  const [categoriesList, setCategoriesList] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Load Products Catalog ──
  const loadProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const list = await fetchAllProducts();
      setProducts(list || []);
    } catch (err) {
      console.warn('[AdminAddProductPage] Could not load products:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // ── Customization Products Hub State ──
  const [customProducts, setCustomProducts] = useState([]);
  const [isLoadingCustomProducts, setIsLoadingCustomProducts] = useState(false);
  const [customSubTab, setCustomSubTab] = useState('list'); // 'list' | 'add'
  const [customSearchQuery, setCustomSearchQuery] = useState('');

  // Form fields for adding Custom Product
  const [customName, setCustomName] = useState('');
  const [customRequirements, setCustomRequirements] = useState('');
  const [customCategory, setCustomCategory] = useState('Custom Frames');
  const [customPrice, setCustomPrice] = useState('');
  const [customOriginalPrice, setCustomOriginalPrice] = useState('');
  const [customWhatsAppNumber, setCustomWhatsAppNumber] = useState('917014945523');
  const [customDescription, setCustomDescription] = useState('');
  const [customImages, setCustomImages] = useState([]);
  const [customManualUrl, setCustomManualUrl] = useState('');
  const [isUploadingCustomImages, setIsUploadingCustomImages] = useState(false);
  const [customUploadError, setCustomUploadError] = useState(null);
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);
  const customFileInputRef = useRef(null);

  // Load Custom Products
  const loadCustomProducts = async () => {
    try {
      setIsLoadingCustomProducts(true);
      const list = await fetchCustomProducts();
      setCustomProducts(list || []);
    } catch (err) {
      console.warn('[AdminAddProductPage] Could not load custom products:', err);
    } finally {
      setIsLoadingCustomProducts(false);
    }
  };

  useEffect(() => {
    loadCustomProducts();
  }, []);

  // ── Customer Orders Hub State ──
  const [orders, setOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [editingOrder, setEditingOrder] = useState(null);
  const [orderUpdateForm, setOrderUpdateForm] = useState({
    status: 'pending',
    paymentStatus: 'pending',
    adminMessage: '',
    cancelReason: '',
  });
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  // Load Admin Orders (Server + Local Storage)
  const loadOrders = async () => {
    try {
      setIsLoadingOrders(true);
      const res = await fetchAllOrdersAdmin({
        status: orderStatusFilter !== 'All' ? orderStatusFilter : undefined,
        limit: 100,
      });
      const serverList = res?.orders || [];
      let localList = [];
      try {
        localList = JSON.parse(localStorage.getItem('aaiprints_orders') || '[]');
      } catch (e) {
        localList = [];
      }
      const seen = new Set();
      const merged = [];
      [...serverList, ...localList].forEach((o) => {
        const key = o._id || o.orderNumber;
        if (key && !seen.has(key)) {
          seen.add(key);
          merged.push(o);
        }
      });
      setOrders(merged);
    } catch (err) {
      console.warn('[AdminAddProductPage] Failed to load admin orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [orderStatusFilter]);

  const handleOpenUpdateOrder = (ord) => {
    setEditingOrder(ord);
    setOrderUpdateForm({
      status: ord.status || 'pending',
      paymentStatus: ord.paymentStatus || 'pending',
      adminMessage: ord.adminMessage || '',
      cancelReason: ord.cancelReason || '',
    });
  };

  const handleSaveOrderUpdate = async (e) => {
    e.preventDefault();
    if (!editingOrder) return;

    setIsUpdatingOrder(true);
    try {
      const orderId = editingOrder._id;
      if (orderId && orderId.length === 24) {
        await updateOrderStatusAdmin(orderId, {
          status: orderUpdateForm.status,
          paymentStatus: orderUpdateForm.paymentStatus,
          message: orderUpdateForm.adminMessage,
          cancelReason: orderUpdateForm.cancelReason,
        });
      }

      // Also persist to local storage history
      try {
        const localList = JSON.parse(localStorage.getItem('aaiprints_orders') || '[]');
        const updatedLocalList = localList.map((o) => {
          if ((o._id && o._id === orderId) || (o.orderNumber && o.orderNumber === editingOrder.orderNumber)) {
            return {
              ...o,
              status: orderUpdateForm.status,
              paymentStatus: orderUpdateForm.paymentStatus,
              adminMessage: orderUpdateForm.adminMessage.trim(),
              cancelReason: orderUpdateForm.cancelReason,
            };
          }
          return o;
        });
        localStorage.setItem('aaiprints_orders', JSON.stringify(updatedLocalList));
      } catch (e) {
        // ignore
      }

      setFeedback({
        type: 'success',
        message: `Order #${editingOrder.orderNumber || editingOrder._id} updated to "${orderUpdateForm.status.toUpperCase()}". Message attached and customer notified.`,
      });
      setEditingOrder(null);
      await loadOrders();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.data?.message || err.message || 'Failed to update order status.',
      });
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (orderStatusFilter !== 'All' && (o.status || '').toLowerCase() !== orderStatusFilter.toLowerCase()) {
        return false;
      }
      if (orderSearchQuery.trim()) {
        const q = orderSearchQuery.toLowerCase();
        const matchNum = (o.orderNumber || o._id || '').toLowerCase().includes(q);
        const matchName = (o.shippingAddress?.fullName || o.user?.name || '').toLowerCase().includes(q);
        const matchPhone = (o.shippingAddress?.phone || o.user?.phone || '').toLowerCase().includes(q);
        const matchEmail = (o.shippingAddress?.email || o.user?.email || '').toLowerCase().includes(q);
        const matchCity = (o.shippingAddress?.city || '').toLowerCase().includes(q);
        return matchNum || matchName || matchPhone || matchEmail || matchCity;
      }
      return true;
    });
  }, [orders, orderStatusFilter, orderSearchQuery]);

  // Custom Product File Upload
  const handleCustomFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setIsUploadingCustomImages(true);
      setCustomUploadError(null);
      const formData = new FormData();
      files.forEach((file) => formData.append('images', file));

      const res = await api.post('/media/upload-multiple', formData);
      const newAssets = (res.data?.assets || []).map((a) => ({
        url: a.url,
        publicId: a.publicId,
      }));
      setCustomImages((prev) => [...prev, ...newAssets]);
    } catch (err) {
      setCustomUploadError(
        err.data?.message || err.message || 'Image upload failed. You can paste an image URL directly.'
      );
    } finally {
      setIsUploadingCustomImages(false);
      if (customFileInputRef.current) customFileInputRef.current.value = '';
    }
  };

  const handleAddCustomManualUrl = () => {
    const trimmed = customManualUrl.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/')) {
      setCustomUploadError('Please enter a valid HTTP/HTTPS or local image URL.');
      return;
    }
    const match = trimmed.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
    const publicId = match ? match[1] : null;
    setCustomImages((prev) => [...prev, { url: trimmed, publicId }]);
    setCustomManualUrl('');
    setCustomUploadError(null);
  };

  const removeCustomImage = async (index) => {
    const target = customImages[index];
    if (!target) return;
    const url = typeof target === 'string' ? target : target.url;
    const publicId = typeof target === 'string' ? null : target.publicId;

    setCustomImages((prev) => prev.filter((_, i) => i !== index));

    if (publicId || (url && url.includes('cloudinary.com'))) {
      try {
        const query = publicId
          ? `publicId=${encodeURIComponent(publicId)}`
          : `url=${encodeURIComponent(url)}`;
        await api.delete(`/media?${query}`);
      } catch (err) {
        console.warn('[Media] Cloudinary cleanup notice:', err.message);
      }
    }
  };

  const insertRequirementsTemplate = (type) => {
    if (type === 'frame') {
      setCustomRequirements(
        `• Required Photo: 1 or 2 high-resolution photos (portrait/landscape, min 1080p).\n• Optional Custom Text: Family name, anniversary date, or sacred mantra (e.g. 'The Sharma Family' or 'ॐ नमः शिवाय').\n• Custom Instructions: Choose LED backlighting tone (Warm Amber Gold, Crisp Natural White, or Ice Blue). Specify whether you need a wall-mounting hanging hook or an acrylic tabletop easel stand.`
      );
    } else if (type === 'clock') {
      setCustomRequirements(
        `• Required Silhouette: Choose your silhouette theme (Family portrait outline, Devotional deity, or Couple silhouette).\n• Optional Custom Text: Custom surname, couple names, or special date engraved cleanly at 6 o'clock.\n• Custom Instructions: Specify preferred wood finish (Rich Teak Walnut or Natural Pine Oak). Clock hands style (Sleek Modern Gold or Classic Black Needle).`
      );
    } else if (type === 'car') {
      setCustomRequirements(
        `• Required Motif: Specify chosen deity, portrait silhouette, or custom emblem (e.g. Mahadev, Khatu Shyam Ji, Ram Lalla, or personalized silhouette).\n• Optional Custom Text: Vehicle registration number or custom travel blessing engraved on the pedestal base.\n• Custom Instructions: Mention pedestal base type (Standard Clear Acrylic or Warm Sand Wood Base). Heavy-duty reusable non-slip 3M adhesive included.`
      );
    }
  };

  const handleCreateCustomProduct = async (e) => {
    e.preventDefault();
    if (!customName.trim()) {
      setFeedback({ type: 'error', message: 'Product Name is required.' });
      return;
    }
    if (!customRequirements.trim()) {
      setFeedback({ type: 'error', message: 'Product Requirements instruction is required.' });
      return;
    }

    const imageList = customImages
      .map((img) => (typeof img === 'string' ? img : img.url))
      .filter((url) => typeof url === 'string' && url.trim().length > 0);

    if (imageList.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Please provide at least one product photo (upload file or add image URL).',
      });
      return;
    }

    try {
      setIsSubmittingCustom(true);
      const payload = {
        name: customName.trim(),
        requirements: customRequirements.trim(),
        images: imageList,
        category: customCategory.trim() || 'Personalized Decor',
        price: customPrice ? Number(customPrice) : 0,
        originalPrice: customOriginalPrice ? Number(customOriginalPrice) : null,
        whatsappNumber: customWhatsAppNumber.trim() || '917014945523',
        description: customDescription.trim(),
      };

      const created = await createCustomProduct(payload);

      setFeedback({
        type: 'success',
        message: `Customization product "${created?.name || customName}" was created successfully!`,
      });

      // Reset form
      setCustomName('');
      setCustomRequirements('');
      setCustomCategory('Custom Frames');
      setCustomPrice('');
      setCustomOriginalPrice('');
      setCustomWhatsAppNumber('917014945523');
      setCustomDescription('');
      setCustomImages([]);
      setCustomManualUrl('');
      setCustomUploadError(null);

      // Refresh list
      await loadCustomProducts();

      // Switch to custom catalog list view
      setCustomSubTab('list');
    } catch (err) {
      const msg =
        err.data?.errors?.length
          ? err.data.errors.map((e) => e.message).join('. ')
          : err.data?.message || err.message || 'Failed to create customization product.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  const handleDeleteCustomProduct = async (id, prodName) => {
    if (
      !window.confirm(
        `Are you sure you want to delete customization product "${prodName}"? Customers will no longer be able to view or order it.`
      )
    ) {
      return;
    }

    try {
      await deleteCustomProduct(id);
      setCustomProducts((prev) => prev.filter((p) => p._id !== id && p.id !== id));
      setFeedback({
        type: 'success',
        message: `Customization product "${prodName}" was removed successfully.`,
      });
      await loadCustomProducts();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: `Delete failed: ${err.data?.message || err.message}`,
      });
    }
  };

  const filteredCustomProducts = useMemo(() => {
    return customProducts.filter((p) => {
      const q = customSearchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.requirements && p.requirements.toLowerCase().includes(q))
      );
    });
  }, [customProducts, customSearchQuery]);

  // ── Load Categories ──
  useEffect(() => {
    let isMounted = true;
    async function loadCategories() {
      try {
        setIsLoadingCategories(true);
        const res = await api.get('/categories');
        const list = res.data?.categories || [];
        if (isMounted) {
          const flattened = [];
          list.forEach((parent) => {
            flattened.push({ _id: parent._id, name: parent.name, isParent: true });
            if (parent.subcategories && parent.subcategories.length > 0) {
              parent.subcategories.forEach((sub) => {
                flattened.push({
                  _id: sub._id,
                  name: `— ${sub.name} (${parent.name})`,
                  isParent: false,
                });
              });
            }
          });
          setCategoriesList(flattened);
          if (flattened.length > 0 && !category) {
            setCategory(flattened[0]._id);
          }
        }
      } catch (err) {
        console.warn('Could not fetch categories from server:', err.message);
      } finally {
        if (isMounted) setIsLoadingCategories(false);
      }
    }
    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // ── Filtered Products for Catalog Table ──
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.slug && p.slug.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));

      const matchesCat =
        categoryFilter === 'All' ||
        p.category === categoryFilter ||
        p.categorySlug === categoryFilter;

      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, categoryFilter]);

  // Unique category names for table filter
  const distinctCategoryNames = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Total inventory units
  const totalStockUnits = useMemo(() => {
    return products.reduce((sum, p) => sum + (Number(p.stockCount ?? p.stock ?? 10) || 0), 0);
  }, [products]);

  // ── File Upload to Cloudinary ──
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setIsUploadingImages(true);
      setUploadError(null);
      const formData = new FormData();
      files.forEach((file) => formData.append('images', file));

      const res = await api.post('/media/upload-multiple', formData);
      const newAssets = (res.data?.assets || []).map((a) => ({
        url: a.url,
        publicId: a.publicId,
      }));
      setImages((prev) => [...prev, ...newAssets]);
    } catch (err) {
      setUploadError(
        err.data?.message || err.message || 'Image upload failed. You can paste an image URL directly.'
      );
    } finally {
      setIsUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddManualUrl = () => {
    const trimmed = manualImageUrl.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/')) {
      setUploadError('Please enter a valid HTTP/HTTPS or local image URL.');
      return;
    }
    const match = trimmed.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
    const publicId = match ? match[1] : null;
    setImages((prev) => [...prev, { url: trimmed, publicId }]);
    setManualImageUrl('');
    setUploadError(null);
  };

  const removeImage = async (index) => {
    const target = images[index];
    if (!target) return;
    const url = typeof target === 'string' ? target : target.url;
    const publicId = typeof target === 'string' ? null : target.publicId;

    setImages((prev) => prev.filter((_, i) => i !== index));

    if (publicId || (url && url.includes('cloudinary.com'))) {
      try {
        const query = publicId
          ? `publicId=${encodeURIComponent(publicId)}`
          : `url=${encodeURIComponent(url)}`;
        await api.delete(`/media?${query}`);
      } catch (err) {
        console.warn('[Media] Cloudinary cleanup notice:', err.message);
      }
    }
  };

  // ── Variants Handlers ──
  const addVariantRow = () => {
    setVariants([
      ...variants,
      {
        name: '',
        size: '',
        material: '',
        price: basePrice || '',
        originalPrice: originalPrice || '',
        stock: '10',
      },
    ]);
  };

  const updateVariantRow = (index, field, value) => {
    const copy = [...variants];
    copy[index][field] = value;
    setVariants(copy);
  };

  const removeVariantRow = (index) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  // ── Badge Handlers ──
  const toggleBadge = (badgeName) => {
    if (badges.includes(badgeName)) {
      setBadges(badges.filter((b) => b !== badgeName));
    } else {
      setBadges([...badges, badgeName]);
    }
  };

  const addCustomBadge = () => {
    const trimmed = customBadge.trim();
    if (!trimmed) return;
    if (!badges.includes(trimmed)) {
      setBadges([...badges, trimmed]);
    }
    setCustomBadge('');
  };

  // ── Submit New Product ──
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!name.trim()) {
      setFeedback({ type: 'error', message: 'Product title is required.' });
      return;
    }
    if (!category) {
      setFeedback({ type: 'error', message: 'Please select a category.' });
      return;
    }
    if (!basePrice || isNaN(Number(basePrice)) || Number(basePrice) < 0) {
      setFeedback({ type: 'error', message: 'Please specify a valid base price.' });
      return;
    }
    if (!description.trim()) {
      setFeedback({ type: 'error', message: 'Product description is required.' });
      return;
    }
    if (images.length === 0) {
      setFeedback({
        type: 'error',
        message: 'At least one product photo is required. Please upload or paste an image URL.',
      });
      return;
    }

    const formattedVariants = hasVariants
      ? variants
        .filter((v) => v.name && v.name.trim())
        .map((v) => ({
          name: v.name.trim(),
          label: v.name.trim(),
          attributes: {
            size: v.size?.trim() || undefined,
            material: v.material?.trim() || undefined,
          },
          price: Number(v.price) || Number(basePrice),
          originalPrice: v.originalPrice ? Number(v.originalPrice) : null,
          stock: Number(v.stock) || 10,
          inStock: (Number(v.stock) || 10) > 0,
        }))
      : [];

    const finalImageUrls = images.map((img) => (typeof img === 'string' ? img : img.url));

    const payload = {
      name: name.trim(),
      description: description.trim(),
      category,
      basePrice: Number(basePrice),
      originalPrice: originalPrice ? Number(originalPrice) : null,
      stock: Number(stock) || 10,
      inStock,
      isTrending,
      trending: isTrending,
      dispatchTimeInfo: dispatchTimeInfo.trim(),
      badges,
      tag: badges[0] || '',
      images: finalImageUrls,
      hasVariants: Boolean(hasVariants && formattedVariants.length > 0),
      variants: formattedVariants,
    };

    try {
      setIsSubmitting(true);
      const res = await api.post('/products', payload);
      const newProduct = res.data?.product;

      setFeedback({
        type: 'success',
        message: `Product "${name}" was published successfully to the live storefront!`,
      });

      // Reset form
      handleResetForm();

      // Refresh list
      await loadProducts();

      if (onProductCreated && newProduct) {
        onProductCreated(newProduct);
      }

      // Switch to products catalog list
      setRetailSubTab('list');
      setActiveTab('products');
    } catch (err) {
      const detailed = err.data?.errors?.length
        ? err.data.errors.map((e) => e.message).join('. ')
        : err.data?.message || err.message || 'Failed to create product.';
      setFeedback({ type: 'error', message: detailed });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setName('');
    setDescription('');
    setBasePrice('');
    setOriginalPrice('');
    setStock('10');
    setInStock(true);
    setIsTrending(false);
    setBadges(['Devotional']);
    setImages([]);
    setManualImageUrl('');
    setHasVariants(false);
    setVariants([
      {
        name: '12x18 inches / Rolled Canvas',
        size: '12x18 in',
        material: 'Canvas',
        price: '',
        originalPrice: '',
        stock: '10',
      },
    ]);
  };

  // ── Delete Product from Catalog Table ──
  const handleDeleteProduct = async (id, prodName) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete "${prodName}" from the storefront catalog?`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/products/${id}?hard=true`);
      setProducts((prev) => prev.filter((p) => p.id !== id && p._id !== id));
      setFeedback({
        type: 'success',
        message: `Product "${prodName}" deleted successfully from database.`,
      });
      if (onProductDeleted) onProductDeleted(id);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: `Delete failed: ${err.data?.message || err.message}`,
      });
    }
  };

  return (
    <div className="admin-product-page">
      {/* ── Top Header ── */}
      <header className="admin-product-header">
        <div className="admin-product-header-wrap">
          <div className="admin-product-breadcrumbs">
            <button
              type="button"
              onClick={handleHome}
              className="admin-product-crumb-btn"
            >
              <ArrowLeft size={14} /> Main Store
            </button>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">Retail Products Manager</span>
          </div>

          <div className="admin-product-header-main">
            <div>
              <span className="admin-product-tag">RETAIL CATALOG MANAGEMENT</span>
              <h1 className="admin-product-title">Retail Products Manager</h1>
              <p className="admin-product-sub">
                Manage all customer-facing products in the storefront catalog (`/shop`). Add new creations, update pricing, upload photos, or remove items.
              </p>
            </div>

            <div className="admin-product-header-actions">
              <button
                type="button"
                className="admin-product-btn-b2b"
                onClick={handleB2B}
                title="Go to Wholesale Store Manager"
              >
                <Building2 size={14} /> Wholesale Manager →
              </button>
              <button
                type="button"
                className="admin-product-btn-secondary"
                onClick={handleShop}
                title="View Live Storefront"
              >
                <ExternalLink size={14} /> View Storefront
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <div className="admin-product-container">
        {/* ── Stats Strip ── */}
        <div className="admin-product-stats-grid">
          <div className="admin-product-stat-card">
            <span className="admin-product-stat-label">Active Retail Products</span>
            <span className="admin-product-stat-value">{products.length}</span>
            <span className="admin-product-stat-sub">Live in storefront catalog</span>
          </div>

          <div className="admin-product-stat-card">
            <span className="admin-product-stat-label">Customization Products</span>
            <span className="admin-product-stat-value">{customProducts.length}</span>
            <span className="admin-product-stat-sub">Bespoke WhatsApp-ordered products</span>
          </div>

          <div className="admin-product-stat-card">
            <span className="admin-product-stat-label">Total Inventory Units</span>
            <span className="admin-product-stat-value">
              {totalStockUnits.toLocaleString('en-IN')}
            </span>
            <span className="admin-product-stat-sub">Units available across variants</span>
          </div>

          <div className="admin-product-stat-card">
            <span className="admin-product-stat-label">Customer Orders</span>
            <span className="admin-product-stat-value">{orders.length}</span>
            <span className="admin-product-stat-sub">
              {orders.filter((o) => (o.status || '').toLowerCase() === 'pending' || (o.status || '').toLowerCase() === 'confirmed').length} pending fulfillment
            </span>
          </div>
        </div>

        {/* ── Tabs Navigation ── */}
        <div className="admin-product-tabs">
          <button
            type="button"
            className={`admin-product-tab ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            Retail Products ({products.length})
          </button>
          <button
            type="button"
            className={`admin-product-tab ${activeTab === 'custom' ? 'active' : ''}`}
            onClick={() => setActiveTab('custom')}
          >
            Customization Products ({customProducts.length})
          </button>
          <button
            type="button"
            className={`admin-product-tab ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Customer Orders ({orders.length})
          </button>
        </div>

        {/* ── Feedback Banner ── */}
        {feedback && (
          <div className={`admin-product-feedback ${feedback.type}`}>
            {feedback.type === 'success' ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <span>{feedback.message}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="feedback-close"
              aria-label="Dismiss feedback"
            >
              ×
            </button>
          </div>
        )}

        {/* ════ TAB 1: RETAIL PRODUCTS (CATALOG & ADD PRODUCT) ════ */}
        {activeTab === 'products' && (
          <div className="admin-custom-products-wrapper">
            {/* ── Retail Sub Navigation ── */}
            <div className="admin-custom-subnav">
              <div className="admin-custom-subtabs">
                <button
                  type="button"
                  className={`admin-custom-subtab ${retailSubTab === 'list' ? 'active' : ''}`}
                  onClick={() => setRetailSubTab('list')}
                >
                  <Layers size={15} />
                  Retail Catalog ({products.length})
                </button>
                <button
                  type="button"
                  className={`admin-custom-subtab ${retailSubTab === 'add' ? 'active' : ''}`}
                  onClick={() => setRetailSubTab('add')}
                >
                  <PackagePlus size={15} />
                  + Add New Product
                </button>
              </div>

              {retailSubTab === 'list' && (
                <button
                  type="button"
                  className="admin-btn-primary"
                  style={{ padding: '8px 18px', fontSize: '13px' }}
                  onClick={() => setRetailSubTab('add')}
                >
                  <PackagePlus size={15} />
                  + Add New Product
                </button>
              )}
            </div>

            {/* ── SUB-VIEW 1: Retail Products Catalog Table ── */}
            {retailSubTab === 'list' && (
              <div className="admin-product-card">
            <div className="admin-product-card-header">
              <div className="admin-product-card-title-group">
                <h2>Active Storefront Catalog ({products.length})</h2>
                <p>
                  Browse all active retail products. Click Edit to modify photos, prices, badges, and variants, or Delete to remove an item.
                </p>
              </div>

              <button
                type="button"
                className="admin-product-refresh-btn"
                onClick={loadProducts}
                title="Refresh product list from server"
              >
                <RefreshCw size={14} className={isLoadingProducts ? 'spin-anim' : ''} />
                Refresh
              </button>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="admin-product-toolbar">
              <div className="admin-product-search-box">
                <Search size={16} style={{ color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search products by title, slug, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="admin-product-search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="admin-product-search-clear"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="admin-product-filter-group">
                <label>Filter Category:</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="admin-product-filter-select"
                >
                  <option value="All">All Categories ({products.length})</option>
                  {distinctCategoryNames.map((catName) => (
                    <option key={catName} value={catName}>
                      {catName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table Content */}
            {isLoadingProducts ? (
              <div className="admin-product-loading">
                <Loader2 size={24} className="spin-anim" style={{ color: 'var(--gold, #D2B98C)' }} />
                <span>Loading retail catalog from server...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="admin-product-empty">
                <Box size={40} strokeWidth={1.5} style={{ color: '#94a3b8', marginBottom: '8px' }} />
                <strong>No products matched your criteria</strong>
                <p>
                  {searchQuery || categoryFilter !== 'All'
                    ? 'Try adjusting your search query or category filter.'
                    : 'Your catalog is empty. Click "+ Add New Product" above to publish your first artwork!'}
                </p>
                {searchQuery || categoryFilter !== 'All' ? (
                  <button
                    type="button"
                    className="admin-btn-secondary"
                    onClick={() => {
                      setSearchQuery('');
                      setCategoryFilter('All');
                    }}
                  >
                    Clear Filters
                  </button>
                ) : (
                  <button
                    type="button"
                    className="admin-btn-primary"
                    style={{ marginTop: '14px' }}
                    onClick={() => setRetailSubTab('add')}
                  >
                    <PackagePlus size={16} />
                    + Add First Product
                  </button>
                )}
              </div>
            ) : (
              <div className="admin-product-table-wrap">
                <table className="admin-product-table">
                  <thead>
                    <tr>
                      <th style={{ width: '38%' }}>Product</th>
                      <th style={{ width: '18%' }}>Category</th>
                      <th style={{ width: '14%' }}>Price</th>
                      <th style={{ width: '12%' }}>Stock</th>
                      <th style={{ width: '10%' }}>Variants</th>
                      <th style={{ width: '8%', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p) => {
                      const img =
                        (p.images && p.images[0]) ||
                        p.image ||
                        '/new-images/product-placeholder.jpg';
                      const currentPrice = Number(p.price || p.basePrice || 0);
                      const origPrice = p.originalPrice ? Number(p.originalPrice) : null;
                      const hasVar = Array.isArray(p.variants) && p.variants.length > 0;
                      const isOutOfStock = p.availability === 'out_of_stock' || p.inStock === false;

                      return (
                        <tr key={p.id || p._id}>
                          <td className="product-col">
                            <img
                              src={img}
                              alt={p.name}
                              className="table-thumb"
                              onError={(e) => {
                                e.currentTarget.src = '/new-images/product-placeholder.jpg';
                              }}
                            />
                            <div className="product-info-cell">
                              <strong className="product-cell-name">{p.name}</strong>
                              <div className="product-cell-sub">
                                <span className="product-cell-slug">{p.slug || p._id}</span>
                                {p.tag && <span className="table-tag-chip">{p.tag}</span>}
                                {(p.isTrending || p.trending) && (
                                  <span className="table-trending-chip">🔥 Trending</span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="admin-cat-pill">{p.category || 'Artwork'}</span>
                          </td>

                          <td>
                            <div className="table-price-cell">
                              <strong>₹{currentPrice.toLocaleString('en-IN')}</strong>
                              {origPrice && origPrice > currentPrice && (
                                <span className="table-mrp">₹{origPrice.toLocaleString('en-IN')}</span>
                              )}
                            </div>
                          </td>

                          <td>
                            {isOutOfStock ? (
                              <span className="stock-pill out-of-stock">● Out of Stock</span>
                            ) : (
                              <span className="stock-pill in-stock">
                                ● {p.stockCount ?? p.stock ?? 10} in stock
                              </span>
                            )}
                          </td>

                          <td>
                            {hasVar ? (
                              <span className="variant-chip multi">
                                {p.variants.length} Variants
                              </span>
                            ) : (
                              <span className="variant-chip single">Single</span>
                            )}
                          </td>

                          <td>
                            <div className="table-actions-cell">
                              <button
                                type="button"
                                className="admin-action-btn edit"
                                onClick={() => setEditingProduct(p)}
                                title={`Edit "${p.name}"`}
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                type="button"
                                className="admin-action-btn delete"
                                onClick={() => handleDeleteProduct(p._id || p.id, p.name)}
                                title={`Delete "${p.name}"`}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

            {/* ── SUB-VIEW 2: Add Product Form ── */}
            {retailSubTab === 'add' && (
              <div className="admin-product-card">
                <div className="admin-product-card-header">
                  <div className="admin-product-card-title-group">
                    <h2>+ Add New Product to Store</h2>
                    <p>
                      Fill in product details, upload high-resolution images, and configure pricing and variants.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="admin-btn-secondary"
                    onClick={() => setRetailSubTab('list')}
                  >
                    View Catalog ({products.length})
                  </button>
                </div>

            <form onSubmit={handleCreateProduct} className="admin-product-form">
              {/* ── Card Section 1: General Info ── */}
              <div className="form-section-box">
                <h3 className="form-section-title">📦 General Information</h3>

                <div className="form-grid-2">
                  <div className="form-field full-width">
                    <label>
                      Product Title <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Lord Shiva Meditating Backlit LED Frame"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>
                      Category <span className="req">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      disabled={isLoadingCategories}
                      required
                    >
                      {categoriesList.length === 0 ? (
                        <option value="">Loading categories...</option>
                      ) : (
                        categoriesList.map((cat) => (
                          <option key={cat._id} value={cat._id}>
                            {cat.name}
                          </option>
                        ))
                      )}
                    </select>
                    <small className="field-hint">Controls storefront navigation and filters</small>
                  </div>

                  <div className="form-field">
                    <label>Dispatch Timeline</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ready to Dispatch within 24-48 Hours"
                      value={dispatchTimeInfo}
                      onChange={(e) => setDispatchTimeInfo(e.target.value)}
                    />
                    <small className="field-hint">Displayed on the product detail page</small>
                  </div>

                  <div className="form-field full-width">
                    <label>
                      Description <span className="req">*</span>
                    </label>
                    <textarea
                      className="form-textarea"
                      placeholder="Detailed description of craftsmanship, dimensions, LED adapter specifications, and wall mounting features..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* ── Card Section 2: Pricing & Inventory ── */}
              <div className="form-section-box">
                <h3 className="form-section-title">💰 Pricing &amp; Stock</h3>

                <div className="form-grid-3">
                  <div className="form-field">
                    <label>
                      Selling Price (₹) <span className="req">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="form-input"
                      placeholder="1499"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>Original MRP (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="form-input"
                      placeholder="2499 (Displays strikethrough)"
                      value={originalPrice}
                      onChange={(e) => setOriginalPrice(e.target.value)}
                    />
                  </div>

                  <div className="form-field">
                    <label>Stock Quantity</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      placeholder="10"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-field-checkbox">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={inStock}
                      onChange={(e) => setInStock(e.target.checked)}
                    />
                    <span>Mark as In Stock immediately for customer orders</span>
                  </label>
                </div>

                <div className="form-field-checkbox" style={{ marginTop: '10px' }}>
                  <label
                    className="checkbox-label"
                    style={{
                      background: isTrending ? 'rgba(217, 119, 6, 0.08)' : '#f8fafc',
                      border: isTrending ? '1.5px solid #d97706' : '1px solid #cbd5e1',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isTrending}
                      onChange={(e) => setIsTrending(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#d97706', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: 600, color: isTrending ? '#b45309' : '#334155' }}>
                      🔥 Mark as Trending (will be featured in Homepage "Trending Now" section)
                    </span>
                  </label>
                </div>
              </div>

              {/* ── Card Section 3: Badges & Tags ── */}
              <div className="form-section-box">
                <h3 className="form-section-title">🏷️ Badges &amp; Highlights</h3>
                <p className="field-hint" style={{ marginBottom: '12px' }}>
                  Select badge tags to feature on the product card in catalog lists.
                </p>

                <div className="badges-chips-wrap">
                  {PRESET_BADGES.map((b) => {
                    const isSelected = badges.includes(b);
                    return (
                      <button
                        key={b}
                        type="button"
                        className={`badge-chip-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleBadge(b)}
                      >
                        {isSelected && <Sparkles size={13} />}
                        {b}
                      </button>
                    );
                  })}
                </div>

              </div>

              {/* ── Card Section 4: Media & Photos ── */}
              <div className="form-section-box">
                <h3 className="form-section-title">🖼️ Product Media &amp; Gallery</h3>
                <p className="field-hint" style={{ marginBottom: '14px' }}>
                  Upload high-resolution images to Cloudinary, or paste direct image URLs. The first image serves as the main catalog cover.
                </p>

                {/* Upload Drag & Drop Zone */}
                <div
                  className="upload-dropzone"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                >
                  {isUploadingImages ? (
                    <div className="upload-dropzone-content">
                      <Loader2 size={28} className="spin-anim" style={{ color: 'var(--gold, #D2B98C)' }} />
                      <strong>Uploading photos to Cloudinary CDN...</strong>
                      <small>Generating optimized assets</small>
                    </div>
                  ) : (
                    <div className="upload-dropzone-content">
                      <div className="upload-icon-circle">
                        <UploadCloud size={24} style={{ color: 'var(--gold, #D2B98C)' }} />
                      </div>
                      <strong>Click to upload product photos</strong>
                      <small>Supports PNG, JPG, WEBP up to 10MB each</small>
                      <span className="upload-btn-chip">Choose Files</span>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                    disabled={isUploadingImages}
                  />
                </div>

                {uploadError && (
                  <div className="upload-error-banner">
                    <AlertCircle size={15} />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Manual URL Input */}
                <div className="manual-url-row">
                  <input
                    type="url"
                    className="form-input"
                    placeholder="Or paste direct image URL (https://... or /new-images/...)"
                    value={manualImageUrl}
                    onChange={(e) => setManualImageUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddManualUrl();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="admin-btn-secondary"
                    onClick={handleAddManualUrl}
                  >
                    Add URL
                  </button>
                </div>

                {/* Thumbnails Gallery */}
                {images.length > 0 && (
                  <div className="thumbnails-preview-wrap">
                    <label className="thumbnails-preview-label">
                      Product Gallery ({images.length} {images.length === 1 ? 'photo' : 'photos'})
                    </label>
                    <div className="thumbnails-grid">
                      {images.map((item, idx) => {
                        const imgUrl = typeof item === 'string' ? item : item.url;
                        return (
                          <div key={idx} className="thumbnail-card">
                            <img src={imgUrl} alt={`Product ${idx + 1}`} />
                            {idx === 0 && <span className="thumb-cover-tag">COVER</span>}
                            <button
                              type="button"
                              className="thumb-delete-btn"
                              onClick={() => removeImage(idx)}
                              title="Remove photo"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Card Section 5: Variants ── */}
              <div className="form-section-box">
                <div className="variant-toggle-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={hasVariants}
                      onChange={(e) => setHasVariants(e.target.checked)}
                    />
                    <strong style={{ fontSize: '15px' }}>
                      This product has multiple sizes, framing options, or finishes (Variants)
                    </strong>
                  </label>
                </div>

                {hasVariants && (
                  <div className="variants-editor-wrap">
                    <p className="field-hint" style={{ marginBottom: '14px' }}>
                      Configure dimensions, materials, and specific prices for customer selection.
                    </p>

                    <div className="variants-table-wrap">
                      <table className="variants-table">
                        <thead>
                          <tr>
                            <th style={{ width: '32%' }}>Variant Name *</th>
                            <th style={{ width: '18%' }}>Size</th>
                            <th style={{ width: '18%' }}>Material</th>
                            <th style={{ width: '16%' }}>Price (₹) *</th>
                            <th style={{ width: '12%' }}>Stock</th>
                            <th style={{ width: '4%' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {variants.map((v, i) => (
                            <tr key={i}>
                              <td>
                                <input
                                  type="text"
                                  className="form-input table-input"
                                  placeholder="e.g. 18x24 inches / Teak Frame"
                                  value={v.name}
                                  onChange={(e) => updateVariantRow(i, 'name', e.target.value)}
                                  required
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-input table-input"
                                  placeholder="18x24 in"
                                  value={v.size}
                                  onChange={(e) => updateVariantRow(i, 'size', e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-input table-input"
                                  placeholder="Teak Wood"
                                  value={v.material}
                                  onChange={(e) => updateVariantRow(i, 'material', e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-input table-input"
                                  placeholder={basePrice || '1499'}
                                  value={v.price}
                                  onChange={(e) => updateVariantRow(i, 'price', e.target.value)}
                                  required
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-input table-input"
                                  placeholder="10"
                                  value={v.stock}
                                  onChange={(e) => updateVariantRow(i, 'stock', e.target.value)}
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  className="variant-del-btn"
                                  onClick={() => removeVariantRow(i)}
                                  title="Delete variant"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <button
                      type="button"
                      className="admin-btn-secondary"
                      style={{ marginTop: '14px' }}
                      onClick={addVariantRow}
                    >
                      + Add Another Variant
                    </button>
                  </div>
                )}
              </div>

              {/* ── Form Submit Actions ── */}
              <div className="form-submit-actions">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setRetailSubTab('list')}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={isSubmitting || isUploadingImages}
                >
                  {isSubmitting ? 'Publishing Product...' : 'Publish Product to Store'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    )}

        {/* ════ TAB 3: CUSTOMIZATION PRODUCTS (WHATSAPP ORDERING) ════ */}
        {activeTab === 'custom' && (
          <div className="admin-custom-products-wrapper">
            {/* ── Sub Navigation ── */}
            <div className="admin-custom-subnav">
              <div className="admin-custom-subtabs">
                <button
                  type="button"
                  className={`admin-custom-subtab ${customSubTab === 'list' ? 'active' : ''}`}
                  onClick={() => setCustomSubTab('list')}
                >
                  <Layers size={15} />
                  Custom Catalog ({customProducts.length})
                </button>
                <button
                  type="button"
                  className={`admin-custom-subtab ${customSubTab === 'add' ? 'active' : ''}`}
                  onClick={() => setCustomSubTab('add')}
                >
                  <PackagePlus size={15} />
                  + Add Custom Product
                </button>
              </div>

              {customSubTab === 'list' && (
                <button
                  type="button"
                  className="admin-btn-primary"
                  style={{ padding: '8px 18px', fontSize: '13px' }}
                  onClick={() => setCustomSubTab('add')}
                >
                  <PackagePlus size={15} />
                  + Add Custom Product
                </button>
              )}
            </div>

            {/* ── SUB-VIEW 1: Custom Products Table ── */}
            {customSubTab === 'list' && (
              <div className="admin-product-card">
                <div className="admin-product-card-header">
                  <div className="admin-product-card-title-group">
                    <h2>Customization Products Catalog ({customProducts.length})</h2>
                    <p>
                      Personalized items where customers provide custom photos, text, or instructions, ordered directly via WhatsApp.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="admin-product-refresh-btn"
                    onClick={loadCustomProducts}
                    title="Refresh list from server"
                  >
                    <RefreshCw size={14} className={isLoadingCustomProducts ? 'spin-anim' : ''} />
                    Refresh
                  </button>
                </div>

                {/* Search Bar */}
                <div className="admin-product-toolbar">
                  <div className="admin-product-search-box" style={{ maxWidth: '440px' }}>
                    <Search size={16} style={{ color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="Search by name, category, or requirement keywords..."
                      value={customSearchQuery}
                      onChange={(e) => setCustomSearchQuery(e.target.value)}
                      className="admin-product-search-input"
                    />
                    {customSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setCustomSearchQuery('')}
                        className="admin-product-search-clear"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Table Content */}
                {isLoadingCustomProducts ? (
                  <div className="admin-product-loading">
                    <Loader2 size={24} className="spin-anim" style={{ color: 'var(--gold, #D2B98C)' }} />
                    <span>Loading customization products...</span>
                  </div>
                ) : filteredCustomProducts.length === 0 ? (
                  <div className="admin-product-empty">
                    <Sparkles size={40} strokeWidth={1.5} style={{ color: '#94a3b8', marginBottom: '8px' }} />
                    <strong>No customization products found</strong>
                    <p>
                      {customSearchQuery
                        ? 'No custom products matched your search keyword.'
                        : 'No custom products have been published yet.'}
                    </p>
                    <button
                      type="button"
                      className="admin-btn-primary"
                      style={{ marginTop: '14px' }}
                      onClick={() => setCustomSubTab('add')}
                    >
                      <PackagePlus size={16} />
                      + Add First Custom Product
                    </button>
                  </div>
                ) : (
                  <div className="admin-product-table-wrap">
                    <table className="admin-product-table">
                      <thead>
                        <tr>
                          <th style={{ width: '32%' }}>Product</th>
                          <th style={{ width: '15%' }}>Category</th>
                          <th style={{ width: '13%' }}>Price</th>
                          <th style={{ width: '25%' }}>Admin Requirements</th>
                          <th style={{ width: '15%', textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCustomProducts.map((p) => {
                          const img =
                            (Array.isArray(p.images) && p.images[0]) ||
                            p.image ||
                            '/new-images/product-placeholder.jpg';
                          const priceVal = Number(p.price || 0);
                          const origVal = p.originalPrice ? Number(p.originalPrice) : null;

                          return (
                            <tr key={p._id || p.id || p.slug}>
                              <td className="product-col">
                                <img
                                  src={img}
                                  alt={p.name}
                                  className="table-thumb"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/new-images/product-placeholder.jpg';
                                  }}
                                />
                                <div className="product-info-cell">
                                  <span className="product-cell-name">{p.name}</span>
                                  <div className="product-cell-sub">
                                    <span className="product-cell-slug">/{p.slug}</span>
                                    {p.whatsappNumber && (
                                      <span className="custom-wa-pill">
                                        <MessageSquare size={11} /> +{p.whatsappNumber}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td>
                                <span className="admin-cat-pill">
                                  {p.category || 'Personalized Decor'}
                                </span>
                              </td>

                              <td>
                                <div className="table-price-cell">
                                  <strong>₹{priceVal.toLocaleString('en-IN')}</strong>
                                  {origVal && origVal > priceVal && (
                                    <span className="table-mrp">
                                      ₹{origVal.toLocaleString('en-IN')}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td>
                                <div className="custom-req-preview" title={p.requirements}>
                                  {p.requirements || '—'}
                                </div>
                              </td>

                              <td>
                                <div className="table-actions-cell">
                                  <a
                                    href={`/custom/${p.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="admin-action-btn edit"
                                    title="View live product on storefront"
                                  >
                                    <ExternalLink size={15} />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCustomProduct(p._id || p.id, p.name)}
                                    className="admin-action-btn delete"
                                    title="Delete customization product"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── SUB-VIEW 2: Add Custom Product Form ── */}
            {customSubTab === 'add' && (
              <div className="admin-product-card">
                <div className="admin-product-card-header">
                  <div className="admin-product-card-title-group">
                    <h2>+ Add New Customization Product</h2>
                    <p>
                      Enter product name, photos, pricing, and requirement instructions. Customers will order this item directly via WhatsApp.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="admin-btn-secondary"
                    onClick={() => setCustomSubTab('list')}
                  >
                    View All ({customProducts.length})
                  </button>
                </div>

                <form onSubmit={handleCreateCustomProduct} className="admin-product-form">
                  {/* Section 1: Basic Information */}
                  <div className="form-section-box">
                    <h3 className="form-section-title">
                      <Sparkles size={18} style={{ color: 'var(--gold, #D2B98C)' }} />
                      Product Information
                    </h3>

                    <div className="form-grid-2">
                      <div className="form-field full-width">
                        <label>
                          Product Name <span className="req">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Custom Backlit Acrylic LED Wall Frame"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          className="form-input"
                        />
                        <p className="field-hint">
                          The prominent headline displayed on the customization page and catalog.
                        </p>
                      </div>

                      <div className="form-field">
                        <label>
                          Category <span className="req">*</span>
                        </label>
                        <select
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                          className="form-select"
                        >
                          <option value="Custom Frames">Custom Frames</option>
                          <option value="Custom Clocks">Custom Clocks</option>
                          <option value="Custom Car Decor">Custom Car Decor</option>
                          <option value="Personalized Decor">Personalized Decor</option>
                          <option value="Acrylic Art">Acrylic Art</option>
                          <option value="Devotional Gifts">Devotional Gifts</option>
                        </select>
                        <p className="field-hint">Category grouping for the customization hub.</p>
                      </div>

                      <div className="form-field">
                        <label>
                          WhatsApp Order Number <span className="req">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="917014945523"
                          value={customWhatsAppNumber}
                          onChange={(e) => setCustomWhatsAppNumber(e.target.value)}
                          className="form-input"
                        />
                        <p className="field-hint">
                          Country code + phone (without +). Customers will be transferred to this WhatsApp.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Pricing */}
                  <div className="form-section-box">
                    <h3 className="form-section-title">
                      <Tag size={18} style={{ color: 'var(--gold, #D2B98C)' }} />
                      Pricing & Quotation
                    </h3>

                    <div className="form-grid-2">
                      <div className="form-field">
                        <label>
                          Selling Price (₹) <span className="req">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          required
                          placeholder="e.g. 1499"
                          value={customPrice}
                          onChange={(e) => setCustomPrice(e.target.value)}
                          className="form-input"
                        />
                        <p className="field-hint">Base starting price displayed on the product card.</p>
                      </div>

                      <div className="form-field">
                        <label>Original / MRP Price (₹) (Optional)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="e.g. 2499"
                          value={customOriginalPrice}
                          onChange={(e) => setCustomOriginalPrice(e.target.value)}
                          className="form-input"
                        />
                        <p className="field-hint">Strikethrough reference price to indicate discount.</p>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Product Requirement (The Core Field) */}
                  <div className="form-section-box">
                    <h3 className="form-section-title">
                      <FileText size={18} style={{ color: 'var(--gold, #D2B98C)' }} />
                      Product Requirement (Customer Guidance) <span className="req">*</span>
                    </h3>
                    <p className="field-hint" style={{ marginBottom: '10px' }}>
                      This text field will be shown directly to the customer on the product page to tell them exactly what details, photos, or text they need to provide when ordering via WhatsApp.
                    </p>

                    {/* Quick Template Inserters */}
                    <div style={{ marginBottom: '12px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginRight: '8px' }}>
                        Quick Presets:
                      </span>
                      <div className="custom-req-templates" style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="custom-template-btn"
                          onClick={() => insertRequirementsTemplate('frame')}
                        >
                          + Frame Preset
                        </button>
                        <button
                          type="button"
                          className="custom-template-btn"
                          onClick={() => insertRequirementsTemplate('clock')}
                        >
                          + Clock Preset
                        </button>
                        <button
                          type="button"
                          className="custom-template-btn"
                          onClick={() => insertRequirementsTemplate('car')}
                        >
                          + Car Decor Preset
                        </button>
                      </div>
                    </div>

                    <textarea
                      required
                      rows={6}
                      value={customRequirements}
                      onChange={(e) => setCustomRequirements(e.target.value)}
                      placeholder={`e.g.\n• Required Photo: 1 or 2 high-resolution photos (portrait/landscape, min 1080p).\n• Optional Custom Text: Family name, anniversary date, or sacred mantra.\n• Custom Instructions: Choose LED backlighting tone (Warm Amber Gold or Ice Blue).`}
                      className="form-textarea"
                      style={{ fontFamily: 'inherit', fontSize: '13px', lineHeight: 1.6 }}
                    />
                  </div>

                  {/* Section 4: Product Photos */}
                  <div className="form-section-box">
                    <h3 className="form-section-title">
                      <UploadCloud size={18} style={{ color: 'var(--gold, #D2B98C)' }} />
                      Product Photos <span className="req">*</span>
                    </h3>
                    <p className="field-hint" style={{ marginBottom: '14px' }}>
                      Upload high-quality sample photos of the custom product. At least 1 photo is required.
                    </p>

                    {/* Upload Dropzone */}
                    <div
                      className="upload-dropzone"
                      onClick={() => customFileInputRef.current && customFileInputRef.current.click()}
                    >
                      <input
                        type="file"
                        ref={customFileInputRef}
                        multiple
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleCustomFileUpload}
                      />
                      <div className="upload-dropzone-content">
                        <div className="upload-icon-circle">
                          {isUploadingCustomImages ? (
                            <Loader2 size={24} className="spin-anim" style={{ color: 'var(--gold, #D2B98C)' }} />
                          ) : (
                            <UploadCloud size={24} style={{ color: 'var(--gold, #D2B98C)' }} />
                          )}
                        </div>
                        <strong style={{ fontSize: '14px', color: '#1e293b' }}>
                          {isUploadingCustomImages ? 'Uploading images to cloud...' : 'Click to upload photos'}
                        </strong>
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                          PNG, JPG, WEBP up to 10MB each
                        </p>
                        <span className="upload-btn-chip">Browse Computer</span>
                      </div>
                    </div>

                    {/* Manual Image URL */}
                    <div className="manual-url-row">
                      <input
                        type="url"
                        placeholder="Or paste an image URL (e.g. /new-images/cat-backlit-led-frames.jpg or https://...)"
                        value={customManualUrl}
                        onChange={(e) => setCustomManualUrl(e.target.value)}
                        className="form-input"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomManualUrl();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomManualUrl}
                        className="admin-btn-secondary"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        Add URL
                      </button>
                    </div>

                    {customUploadError && (
                      <div className="upload-error-banner">
                        <AlertCircle size={16} />
                        <span>{customUploadError}</span>
                      </div>
                    )}

                    {/* Thumbnails Preview */}
                    {customImages.length > 0 && (
                      <div className="thumbnails-preview-wrap">
                        <span className="thumbnails-preview-label">
                          Selected Photos ({customImages.length})
                        </span>
                        <div className="thumbnails-grid">
                          {customImages.map((img, idx) => {
                            const url = typeof img === 'string' ? img : img.url;
                            return (
                              <div key={idx} className="thumbnail-item">
                                <img src={url} alt={`Custom Product ${idx + 1}`} />
                                <button
                                  type="button"
                                  onClick={() => removeCustomImage(idx)}
                                  className="thumbnail-remove-btn"
                                  title="Remove image"
                                >
                                  <X size={12} />
                                </button>
                                {idx === 0 && <span className="primary-thumb-badge">Cover</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 5: Description (Optional) */}
                  <div className="form-section-box">
                    <h3 className="form-section-title">
                      <Box size={18} style={{ color: 'var(--gold, #D2B98C)' }} />
                      Description (Optional)
                    </h3>
                    <textarea
                      rows={3}
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      placeholder="High-grade imported acrylic backlit frame with brilliant LED luminescence. Handcrafted to order..."
                      className="form-textarea"
                    />
                  </div>

                  {/* Submit Actions */}
                  <div className="form-submit-actions">
                    <button
                      type="button"
                      className="admin-btn-secondary"
                      onClick={() => setCustomSubTab('list')}
                      disabled={isSubmittingCustom}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="admin-btn-primary"
                      disabled={isSubmittingCustom || isUploadingCustomImages}
                    >
                      {isSubmittingCustom ? (
                        <>
                          <Loader2 size={16} className="spin-anim" /> Publishing Custom Product...
                        </>
                      ) : (
                        'Publish Customization Product'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ════ TAB 3: CUSTOMER ORDERS & FULFILLMENT ════ */}
        {activeTab === 'orders' && (
          <div className="admin-orders-wrapper">
            {/* Filter and Search Bar */}
            <div className="admin-orders-filter-bar">
              <div className="admin-orders-status-filters">
                {['All', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      className={`admin-orders-status-btn ${orderStatusFilter.toLowerCase() === st.toLowerCase() ? 'active' : ''}`}
                      onClick={() => setOrderStatusFilter(st)}
                    >
                      {st === 'All' ? 'All Orders' : st.charAt(0).toUpperCase() + st.slice(1)}
                    </button>
                  )
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative', width: '260px' }}>
                  <Search
                    size={15}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search by Order #, Name, Phone..."
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 34px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12.5px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <button
                  type="button"
                  className="admin-product-crumb-btn"
                  onClick={loadOrders}
                  style={{ background: '#39332E', color: '#fff', border: 'none', padding: '8px 14px' }}
                  title="Refresh orders from server"
                >
                  <RefreshCw size={13} className={isLoadingOrders ? 'spin-anim' : ''} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Orders Table Card */}
            <div className="admin-product-table-card">
              <div className="admin-product-table-header">
                <div className="admin-product-table-title">
                  <ShoppingBag size={18} style={{ color: 'var(--gold)' }} />
                  <div>
                    <h3>Customer Order Fulfillment Log</h3>
                    <p>
                      Showing {filteredOrders.length} of {orders.length} order{orders.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
              </div>

              {isLoadingOrders ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                  <Loader2 size={28} className="spin-anim" style={{ margin: '0 auto 12px', display: 'block' }} />
                  <p style={{ margin: 0, fontWeight: 500 }}>Fetching live orders from database...</p>
                </div>
              ) : filteredOrders.length > 0 ? (
                <div className="admin-product-table-wrap">
                  <table className="admin-product-table">
                    <thead>
                      <tr>
                        <th style={{ width: '140px' }}>Order &amp; Date</th>
                        <th style={{ width: '240px' }}>Customer &amp; Shipping Address</th>
                        <th>Ordered Items</th>
                        <th style={{ width: '130px' }}>Total &amp; Payment</th>
                        <th style={{ width: '150px' }}>Fulfillment Status</th>
                        <th style={{ width: '220px' }}>Admin Update Note</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((ord) => {
                        const orderNum = ord.orderNumber || ord._id;
                        const dateStr = ord.createdAt || ord.orderDate
                          ? new Date(ord.createdAt || ord.orderDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—';
                        const timeStr = ord.createdAt
                          ? new Date(ord.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '';
                        const status = (ord.status || 'pending').toLowerCase();
                        const paymentStatus = (ord.paymentStatus || 'pending').toLowerCase();
                        const addr = ord.shippingAddress || {};
                        const customerName = addr.fullName || ord.user?.name || 'Guest Customer';
                        const customerPhone = addr.phone || ord.user?.phone || '—';
                        const customerEmail = addr.email || ord.user?.email || '—';
                        const total = ord.pricing?.total != null ? ord.pricing.total : (ord.totalAmount || 0);

                        return (
                          <tr key={ord._id || orderNum}>
                            <td>
                              <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                                #{orderNum}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                {dateStr} {timeStr}
                              </div>
                              {ord.shippingMethod && (
                                <span style={{ fontSize: '10.5px', color: '#0369a1', fontWeight: 600, textTransform: 'uppercase' }}>
                                  {ord.shippingMethod} delivery
                                </span>
                              )}
                            </td>

                            <td>
                              <div className="admin-order-customer-info">
                                <span className="admin-order-customer-name">{customerName}</span>
                                <span className="admin-order-customer-contact">
                                  <Phone size={11} /> +91 {customerPhone}
                                </span>
                                {customerEmail !== '—' && (
                                  <span className="admin-order-customer-contact">
                                    <Mail size={11} /> {customerEmail}
                                  </span>
                                )}
                                {(addr.street || addr.city) && (
                                  <div className="admin-order-customer-address">
                                    <MapPin size={11} style={{ display: 'inline', marginRight: '3px' }} />
                                    {addr.street ? `${addr.street}, ` : ''}
                                    {addr.landmark ? `${addr.landmark}, ` : ''}
                                    {addr.city ? `${addr.city}, ` : ''}
                                    {addr.state ? `${addr.state} ` : ''}
                                    {addr.postalCode ? `— ${addr.postalCode}` : ''}
                                  </div>
                                )}
                              </div>
                            </td>

                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {(ord.items || []).map((it, idx) => (
                                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                                    <span style={{ fontWeight: 600, color: '#334155' }}>
                                      {it.quantity || 1}x {it.name || it.product?.name || 'Art Print'}
                                    </span>
                                    {it.variantName && (
                                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                                        ({it.variantName})
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </td>

                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <strong style={{ color: '#0f172a', fontSize: '14px' }}>
                                  ₹{Number(total).toLocaleString('en-IN')}
                                </strong>
                                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>
                                  {ord.paymentMethod || 'COD'}
                                </span>
                                <span className={`admin-order-payment-badge ${paymentStatus}`}>
                                  {paymentStatus}
                                </span>
                              </div>
                            </td>

                            <td>
                              <span className={`admin-order-status-badge ${status}`}>
                                {status}
                              </span>
                            </td>

                            <td>
                              {ord.adminMessage ? (
                                <div className="admin-order-msg-preview">
                                  <MessageSquare size={12} style={{ flexShrink: 0, marginTop: '2px', color: '#b45309' }} />
                                  <span>{ord.adminMessage}</span>
                                </div>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>
                                  No message attached
                                </span>
                              )}
                            </td>

                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className="action-btn edit"
                                onClick={() => handleOpenUpdateOrder(ord)}
                                title="Update Status & Message"
                              >
                                <Pencil size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                  <ShoppingBag size={32} style={{ margin: '0 auto 12px', display: 'block', color: '#94a3b8' }} />
                  <h4 style={{ margin: '0 0 6px', color: '#1e293b' }}>No orders found</h4>
                  <p style={{ margin: 0, fontSize: '13px' }}>
                    {orderSearchQuery || orderStatusFilter !== 'All'
                      ? 'No orders match your filter criteria. Try resetting filters.'
                      : 'Orders placed on the storefront will appear here for fulfillment tracking.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ════ UPDATE ORDER STATUS & ADMIN MESSAGE MODAL ════ */}
      {editingOrder && (
        <div className="admin-order-modal-backdrop" onClick={() => setEditingOrder(null)}>
          <div className="admin-order-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-order-modal-header">
              <h3>Update Order #{editingOrder.orderNumber || editingOrder._id}</h3>
              <button
                type="button"
                className="admin-product-crumb-btn"
                onClick={() => setEditingOrder(null)}
                style={{ padding: '6px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveOrderUpdate}>
              <div className="admin-order-modal-body">
                {/* Customer summary card */}
                <div className="admin-order-modal-customer-card">
                  <div>
                    <strong>Customer:</strong> {editingOrder.shippingAddress?.fullName || editingOrder.user?.name || 'Guest'} (+91 {editingOrder.shippingAddress?.phone || editingOrder.user?.phone || '—'})
                  </div>
                  <div>
                    <strong>Destination:</strong> {editingOrder.shippingAddress?.city}, {editingOrder.shippingAddress?.state} — {editingOrder.shippingAddress?.postalCode}
                  </div>
                  <div>
                    <strong>Total Amount:</strong> ₹{Number(editingOrder.pricing?.total || editingOrder.totalAmount || 0).toLocaleString('en-IN')} via {(editingOrder.paymentMethod || 'COD').toUpperCase()}
                  </div>
                </div>

                {/* Fulfillment Status Select */}
                <div className="form-group">
                  <label className="form-label">Order Fulfillment Status *</label>
                  <select
                    className="form-input"
                    value={orderUpdateForm.status}
                    onChange={(e) => setOrderUpdateForm({ ...orderUpdateForm, status: e.target.value })}
                    required
                  >
                    <option value="pending">Pending (Awaiting Confirmation)</option>
                    <option value="confirmed">Confirmed (Order Accepted)</option>
                    <option value="processing">Processing (Under Printing & Framing)</option>
                    <option value="shipped">Shipped (In Transit with Courier)</option>
                    <option value="delivered">Delivered (Handed to Customer)</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Payment Status Select */}
                <div className="form-group">
                  <label className="form-label">Payment Status *</label>
                  <select
                    className="form-input"
                    value={orderUpdateForm.paymentStatus}
                    onChange={(e) => setOrderUpdateForm({ ...orderUpdateForm, paymentStatus: e.target.value })}
                    required
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid (Confirmed by Gateway or Cash)</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>

                {/* Admin Message / Tracking Note Field */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessageSquare size={14} style={{ color: 'var(--gold)' }} />
                    <span>Attach Message / Tracking Note for Customer</span>
                  </label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    placeholder="e.g. Your package has been dispatched via BlueDart AWB #12345678. Expected delivery by Thursday."
                    value={orderUpdateForm.adminMessage}
                    onChange={(e) => setOrderUpdateForm({ ...orderUpdateForm, adminMessage: e.target.value })}
                  />
                  <span style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    This note will be attached to the order update, emailed directly to the customer, and displayed in their account order tracker.
                  </span>
                </div>

                {/* If Cancelled: Cancellation Reason */}
                {orderUpdateForm.status === 'cancelled' && (
                  <div className="form-group">
                    <label className="form-label">Reason for Cancellation</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., Customer requested cancellation / Out of stock"
                      value={orderUpdateForm.cancelReason}
                      onChange={(e) => setOrderUpdateForm({ ...orderUpdateForm, cancelReason: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div className="admin-order-modal-footer">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setEditingOrder(null)}
                  disabled={isUpdatingOrder}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={isUpdatingOrder}
                >
                  {isUpdatingOrder ? (
                    <>
                      <Loader2 size={15} className="spin-anim" /> Updating Order...
                    </>
                  ) : (
                    'Save Order Update & Send Note'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════ EDIT PRODUCT MODAL (Connected via AdminEditProductModal) ════ */}
      {editingProduct && (
        <AdminEditProductModal
          isOpen={Boolean(editingProduct)}
          onClose={() => setEditingProduct(null)}
          product={editingProduct}
          onProductUpdated={(updated) => {
            setFeedback({
              type: 'success',
              message: `Product "${updated.name}" was updated successfully!`,
            });
            setEditingProduct(null);
            loadProducts();
            if (onProductUpdated) onProductUpdated(updated);
          }}
          onProductDeleted={(deletedId) => {
            setFeedback({
              type: 'success',
              message: 'Product was deleted successfully.',
            });
            setEditingProduct(null);
            loadProducts();
            if (onProductDeleted) onProductDeleted(deletedId);
          }}
        />
      )}
    </div>
  );
}
