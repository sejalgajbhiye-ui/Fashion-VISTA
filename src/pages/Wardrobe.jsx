import React, { useState } from 'react';
import { useFashion } from '../context/FashionContext';
import { WardrobeCard } from '../components/WardrobeCard';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { wardrobeCategories } from '../data/wardrobeData';
import { Plus, Search, Filter, Sparkles, Image, Check, AlertCircle, Shirt, Loader2 } from 'lucide-react';
import { classifyWardrobeGarment } from '../services/api';

export const Wardrobe = () => {
  const {
    wardrobe,
    wardrobeStats,
    addWardrobeItem,
    deleteWardrobeItem,
    updateWardrobeItem,
    showToast
  } = useFashion();

  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);

  // Form State for Add / Edit
  const initialForm = {
    name: '',
    category: 'Tops',
    colour: 'Black',
    style: 'Casual',
    season: 'All Season',
    brand: '',
    description: '',
    image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=700&q=80',
    predicted_category: null,
    confidence: null,
    model_used: null
  };

  const [formData, setFormData] = useState(initialForm);
  const [customImageFile, setCustomImageFile] = useState(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [aiPrediction, setAiPrediction] = useState(null);
  const [classifyError, setClassifyError] = useState(null);

  // Quick preset sample images to choose from if no camera/file upload is selected
  const presetImages = [
    { label: "Black Top", url: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=700&q=80" },
    { label: "White Shirt", url: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=700&q=80" },
    { label: "Blue Jeans", url: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=700&q=80" },
    { label: "Beige Pants", url: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=700&q=80" },
    { label: "Sneakers", url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=700&q=80" },
    { label: "Jacket", url: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=700&q=80" }
  ];

  const runClassification = async (imageInput) => {
    const target = imageInput || customImageFile || formData.image;
    if (!target) return;
    setIsClassifying(true);
    setClassifyError(null);
    try {
      const res = await classifyWardrobeGarment(target);
      if (res && res.status === 'success') {
        setAiPrediction(res);
        setFormData(prev => ({
          ...prev,
          category: res.mapped_category || prev.category,
          name: prev.name.trim() ? prev.name : res.predicted_category,
          image: res.image_url || prev.image,
          predicted_category: res.predicted_category,
          confidence: res.confidence,
          model_used: res.model_used
        }));
        showToast(`AI Detected: ${res.predicted_category} (${res.confidence_pct}% confidence)`, 'success');
      } else {
        throw new Error(res?.error || 'Classification returned no results');
      }
    } catch (err) {
      const msg = err.message || 'AI Classification failed';
      setClassifyError(msg);
      showToast(msg, 'error');
    } finally {
      setIsClassifying(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCustomImageFile(file);
      setAiPrediction(null);
      setClassifyError(null);
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setFormData(prev => ({ ...prev, image: uploadEvent.target.result }));
      };
      reader.readAsDataURL(file);
      // Automatically trigger AI classification for uploaded photo
      runClassification(file);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    await addWardrobeItem({
      ...formData,
      image: formData.image || presetImages[0].url
    });

    setIsAddModalOpen(false);
    setFormData(initialForm);
    setCustomImageFile(null);
    setAiPrediction(null);
    setClassifyError(null);
  };

  const handleEditClick = (item) => {
    setItemToEdit(item);
    setFormData({
      name: item.name,
      category: item.category,
      colour: item.colour,
      style: item.style,
      season: item.season || 'All Season',
      brand: item.brand || '',
      description: item.description || '',
      image: item.image
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!itemToEdit || !formData.name.trim()) return;

    updateWardrobeItem(itemToEdit.id, formData);
    setIsEditModalOpen(false);
    setItemToEdit(null);
    setFormData(initialForm);
  };

  // Filter items
  const filteredWardrobe = wardrobe.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.colour.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.style.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.brand && item.brand.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-taupe-200">
        <div>
          <span className="text-[11px] uppercase font-bold tracking-widest text-charcoal-500 bg-white px-3 py-1 rounded-full border border-taupe-200">
            Digital Wardrobe Closet
          </span>
          <h1 className="editorial-heading text-3xl sm:text-4xl md:text-5xl font-semibold text-charcoal-900 mt-2">
            My Wardrobe
          </h1>
          <p className="text-sm sm:text-base text-charcoal-500 mt-1">
            Everything you own, ready to style.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => {
            setFormData(initialForm);
            setIsAddModalOpen(true);
          }}
          iconLeft={<Plus className="w-4 h-4" />}
          className="shadow-card"
        >
          + Add Clothing
        </Button>
      </div>

      {/* STATS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl p-4 border border-taupe-200 text-center shadow-subtle">
          <div className="editorial-heading text-2xl font-bold text-charcoal-900">
            {wardrobeStats.total}
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-500 mt-0.5">
            Total Items
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-taupe-200 text-center shadow-subtle">
          <div className="editorial-heading text-2xl font-bold text-charcoal-900">
            {wardrobeStats.tops}
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-500 mt-0.5">
            Tops
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-taupe-200 text-center shadow-subtle">
          <div className="editorial-heading text-2xl font-bold text-charcoal-900">
            {wardrobeStats.bottoms}
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-500 mt-0.5">
            Bottoms
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-taupe-200 text-center shadow-subtle">
          <div className="editorial-heading text-2xl font-bold text-charcoal-900">
            {wardrobeStats.dresses}
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-500 mt-0.5">
            Dresses
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-taupe-200 text-center shadow-subtle">
          <div className="editorial-heading text-2xl font-bold text-charcoal-900">
            {wardrobeStats.shoes}
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-500 mt-0.5">
            Shoes
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-taupe-200 text-center shadow-subtle">
          <div className="editorial-heading text-2xl font-bold text-charcoal-900">
            {wardrobeStats.accessories + wardrobeStats.others}
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-500 mt-0.5">
            Others
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-taupe-200 shadow-subtle">
        
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {wardrobeCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-charcoal-900 text-white shadow-sm'
                  : 'bg-[#FAF8F5] text-charcoal-600 hover:text-black hover:bg-taupe-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search wardrobe..."
            className="w-full pl-9 pr-4 py-2 text-xs font-medium text-charcoal-900 bg-[#FAF8F5] border border-taupe-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-charcoal-900 focus:bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-charcoal-400 hover:text-charcoal-900"
            >
              ✕
            </button>
          )}
        </div>

      </div>

      {/* CLOTHING GRID */}
      {filteredWardrobe.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredWardrobe.map((item) => (
            <WardrobeCard
              key={item.id}
              item={item}
              onEdit={handleEditClick}
              onDelete={deleteWardrobeItem}
            />
          ))}
        </div>
      ) : wardrobe.length === 0 ? (
        <EmptyState
          icon={Shirt}
          title="Your wardrobe is currently empty"
          description="You haven't added any clothes to your personal wardrobe yet. Click '+ Add Clothing' to photograph or catalog garments you own and unlock personalized AI styling."
          actionLabel="+ Add Your First Clothing Item"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <EmptyState
          icon={Shirt}
          title="No garments match your filter"
          description={`No items match "${searchQuery || selectedCategory}". Reset your search or category filter to see your cataloged clothes.`}
          actionLabel="Show All Garments"
          onAction={() => {
            setSelectedCategory("All");
            setSearchQuery("");
          }}
        />
      )}

      {/* ADD CLOTHING MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add to your wardrobe"
        subtitle="Catalog a garment you already own to unlock smart outfit curation."
      >
        <form onSubmit={handleAddSubmit} className="space-y-5">
          
          {/* Image Upload / Preview Area */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-2">
              Garment Photo
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-dashed border-taupe-300 rounded-xl bg-[#FAF8F5]">
              <div className="w-24 h-28 rounded-lg overflow-hidden bg-taupe-200 shrink-0 border border-taupe-300">
                <img
                  src={formData.image}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  <label className="inline-flex cursor-pointer">
                    <span className="px-3 py-1.5 text-xs font-semibold bg-white border border-taupe-300 rounded-md hover:bg-taupe-100 text-charcoal-800">
                      Upload Local File
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => runClassification()}
                    disabled={isClassifying}
                    className="px-3 py-1.5 text-xs font-semibold bg-taupe-100 border border-taupe-300 rounded-md hover:bg-taupe-200 text-charcoal-900 inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {isClassifying ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {isClassifying ? "Analyzing..." : "AI Auto-Detect"}
                  </button>
                </div>
                <p className="text-[11px] text-charcoal-500">
                  Or pick from curated sample garment presets below:
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                  {presetImages.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, image: preset.url });
                        setCustomImageFile(null);
                        setAiPrediction(null);
                        setClassifyError(null);
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                        formData.image === preset.url
                          ? 'bg-charcoal-900 text-white border-charcoal-900'
                          : 'bg-white text-charcoal-600 border-taupe-200 hover:bg-taupe-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Loading State */}
            {isClassifying && (
              <div className="mt-3 flex items-center gap-2.5 p-3 bg-taupe-100 border border-taupe-300 rounded-xl text-xs text-charcoal-800 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-charcoal-900 shrink-0" />
                <div>
                  <p className="font-semibold">AI Analyzing Garment...</p>
                  <p className="text-[11px] text-charcoal-600">Running deep clothing classifier to detect category and features.</p>
                </div>
              </div>
            )}

            {/* AI Prediction Result Card */}
            {aiPrediction && !isClassifying && (
              <div className="mt-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>AI Detected: {aiPrediction.predicted_category}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {aiPrediction.confidence_pct}% confidence
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Auto-mapped to <strong className="font-bold underline">{aiPrediction.mapped_category}</strong> in the category dropdown below. You can change it manually if desired.
                </p>
                {aiPrediction.top_candidates && aiPrediction.top_candidates.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-emerald-200/60">
                    <span className="text-[10px] font-semibold text-emerald-900">Alternative candidates:</span>
                    {aiPrediction.top_candidates.slice(1, 3).map((cand, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            category: cand.mapped_category || prev.category,
                            name: prev.name === aiPrediction.predicted_category ? cand.category : prev.name
                          }));
                          showToast(`Category updated to ${cand.mapped_category}`, 'info');
                        }}
                        className="text-[10px] bg-white border border-emerald-200 px-2 py-0.5 rounded-md text-emerald-900 hover:bg-emerald-100 transition-colors font-medium shadow-2xs"
                      >
                        {cand.category} ({Math.round(cand.probability * 100)}%)
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {classifyError && !isClassifying && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold">Classification Warning</p>
                  <p className="text-[11px] text-rose-700">{classifyError}</p>
                </div>
              </div>
            )}
          </div>

          {/* Item Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
              Item Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Linen Relaxed Overshirt"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2 text-sm text-charcoal-900 bg-[#FAF8F5] border border-taupe-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-charcoal-900 focus:bg-white"
            />
          </div>

          {/* Category & Colour */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-xs font-medium text-charcoal-900 bg-[#FAF8F5] border border-taupe-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-charcoal-900"
              >
                <option value="Tops">Tops</option>
                <option value="Bottoms">Bottoms</option>
                <option value="Dresses">Dresses</option>
                <option value="Shoes">Shoes</option>
                <option value="Accessories">Accessories</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                Colour
              </label>
              <input
                type="text"
                placeholder="e.g. Black, Navy, Beige"
                value={formData.colour}
                onChange={(e) => setFormData({ ...formData, colour: e.target.value })}
                className="w-full px-3.5 py-2 text-xs text-charcoal-900 bg-[#FAF8F5] border border-taupe-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-charcoal-900 focus:bg-white"
              />
            </div>
          </div>

          {/* Style & Season */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                Style
              </label>
              <select
                value={formData.style}
                onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                className="w-full px-3 py-2 text-xs font-medium text-charcoal-900 bg-[#FAF8F5] border border-taupe-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-charcoal-900"
              >
                <option value="Casual">Casual</option>
                <option value="Formal">Formal</option>
                <option value="Traditional">Traditional</option>
                <option value="Western">Western</option>
                <option value="Streetwear">Streetwear</option>
                <option value="Minimal">Minimal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                Season
              </label>
              <select
                value={formData.season}
                onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                className="w-full px-3 py-2 text-xs font-medium text-charcoal-900 bg-[#FAF8F5] border border-taupe-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-charcoal-900"
              >
                <option value="All Season">All Season</option>
                <option value="Summer">Summer</option>
                <option value="Winter">Winter</option>
                <option value="Monsoon">Monsoon</option>
                <option value="Spring / Autumn">Spring / Autumn</option>
              </select>
            </div>
          </div>

          {/* Brand */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
              Brand (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Zara, COS, Levi's, Thrifted"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="w-full px-3.5 py-2 text-xs text-charcoal-900 bg-[#FAF8F5] border border-taupe-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-charcoal-900 focus:bg-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Fabric details, fit notes, silhouette notes..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2 text-xs text-charcoal-900 bg-[#FAF8F5] border border-taupe-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-charcoal-900 focus:bg-white resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-taupe-200">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
            >
              Add to Wardrobe
            </Button>
          </div>

        </form>
      </Modal>

      {/* EDIT CLOTHING MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit garment details"
        subtitle={`Updating "${formData.name}"`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
              Item Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2 text-sm text-charcoal-900 bg-[#FAF8F5] border border-taupe-300 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-xs font-medium text-charcoal-900 bg-[#FAF8F5] border border-taupe-300 rounded-lg"
              >
                <option value="Tops">Tops</option>
                <option value="Bottoms">Bottoms</option>
                <option value="Dresses">Dresses</option>
                <option value="Shoes">Shoes</option>
                <option value="Accessories">Accessories</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                Colour
              </label>
              <input
                type="text"
                value={formData.colour}
                onChange={(e) => setFormData({ ...formData, colour: e.target.value })}
                className="w-full px-3.5 py-2 text-xs text-charcoal-900 bg-[#FAF8F5] border border-taupe-300 rounded-lg"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                Style
              </label>
              <select
                value={formData.style}
                onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                className="w-full px-3 py-2 text-xs font-medium text-charcoal-900 bg-[#FAF8F5] border border-taupe-300 rounded-lg"
              >
                <option value="Casual">Casual</option>
                <option value="Formal">Formal</option>
                <option value="Traditional">Traditional</option>
                <option value="Western">Western</option>
                <option value="Streetwear">Streetwear</option>
                <option value="Minimal">Minimal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                Season
              </label>
              <input
                type="text"
                value={formData.season}
                onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                className="w-full px-3.5 py-2 text-xs text-charcoal-900 bg-[#FAF8F5] border border-taupe-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
              Brand
            </label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="w-full px-3.5 py-2 text-xs text-charcoal-900 bg-[#FAF8F5] border border-taupe-300 rounded-lg"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-taupe-200">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
