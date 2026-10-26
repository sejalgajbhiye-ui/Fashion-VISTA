import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFashion, checkOutfitRepetition } from '../context/FashionContext';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  Shirt,
  AlertTriangle,
  RotateCcw,
  Check,
  ArrowRight,
  FileText,
  Search,
  X
} from 'lucide-react';

const OCCASIONS = [
  { id: 'College', label: 'College', icon: '🎓' },
  { id: 'Casual', label: 'Casual', icon: '☕' },
  { id: 'Office', label: 'Office', icon: '💼' },
  { id: 'Party', label: 'Party', icon: '🎉' },
  { id: 'Festive', label: 'Festive', icon: '✨' },
  { id: 'Formal', label: 'Formal', icon: '👔' },
];

const CATEGORY_CHIPS = ['All', 'Tops', 'Bottoms', 'Dresses', 'Shoes', 'Outerwear', 'Accessories'];

// Helper to get Monday of a given date
const getMonday = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

// Format date helper: YYYY-MM-DD
const formatDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const WeeklyPlanner = () => {
  const navigate = useNavigate();
  const fashionContext = useFashion();

  const wardrobe = Array.isArray(fashionContext?.wardrobe) ? fashionContext.wardrobe : [];
  const weeklyPlans = Array.isArray(fashionContext?.weeklyPlans) ? fashionContext.weeklyPlans : [];
  const addOutfitPlan = fashionContext?.addOutfitPlan || (async () => {});
  const updateOutfitPlan = fashionContext?.updateOutfitPlan || (async () => {});
  const deleteOutfitPlan = fashionContext?.deleteOutfitPlan || (async () => {});
  const togglePlanStatus = fashionContext?.togglePlanStatus || (async () => {});

  // Current selected week anchor (defaults to current week's Monday)
  const [currentWeekMonday, setCurrentWeekMonday] = useState(() => getMonday(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState(() => formatDateKey(new Date()));

  // Modal States
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [deleteConfirmPlan, setDeleteConfirmPlan] = useState(null);

  // Form State in Modal (Exclusively "Assemble from Wardrobe")
  const [formDate, setFormDate] = useState(formatDateKey(new Date()));
  const [formOccasion, setFormOccasion] = useState('Casual');
  const [formOutfitName, setFormOutfitName] = useState('');
  const [formNote, setFormNote] = useState('');
  const [selectedItems, setSelectedItems] = useState([]); // array of garment objects
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Compute the 7 days (Monday to Sunday) for currentWeekMonday
  const weekDays = useMemo(() => {
    const days = [];
    const mon = new Date(currentWeekMonday);
    const plansList = Array.isArray(weeklyPlans) ? weeklyPlans : [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      const dateKey = formatDateKey(d);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const fullDayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      const dayNumber = d.getDate();
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });

      // Find saved plan for this date
      const plan = plansList.find(p => p && p.planned_date === dateKey) || null;

      days.push({
        date: d,
        dateKey,
        dayName,
        fullDayName,
        dayNumber,
        monthName,
        isToday: dateKey === formatDateKey(new Date()),
        isSelected: dateKey === selectedDateKey,
        plan
      });
    }
    return days;
  }, [currentWeekMonday, selectedDateKey, weeklyPlans]);

  // Week range label (e.g. "Oct 26 – Nov 01, 2026")
  const weekRangeLabel = useMemo(() => {
    const start = weekDays[0]?.date;
    const end = weekDays[6]?.date;
    if (!start || !end) return '';
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} – ${endStr}`;
  }, [weekDays]);

  // Navigation handlers
  const handlePrevWeek = () => {
    setCurrentWeekMonday(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setCurrentWeekMonday(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleTodayWeek = () => {
    const today = new Date();
    setCurrentWeekMonday(getMonday(today));
    setSelectedDateKey(formatDateKey(today));
  };

  // Open Modal to Assemble from Wardrobe
  const openAddModal = (dateKey, existingPlan = null) => {
    const targetDate = dateKey || selectedDateKey;
    setFormDate(targetDate);
    setCategoryFilter('All');
    setSearchQuery('');
    if (existingPlan) {
      setEditingPlan(existingPlan);
      setFormOccasion(existingPlan.occasion || 'Casual');
      setFormOutfitName(existingPlan.outfit_name || '');
      setFormNote(existingPlan.note || '');
      setSelectedItems(Array.isArray(existingPlan.items) ? existingPlan.items : []);
    } else {
      setEditingPlan(null);
      setFormOccasion('Casual');
      setFormOutfitName('');
      setFormNote('');
      setSelectedItems([]);
    }
    setIsPlanModalOpen(true);
  };

  // Repetition Reminder check for currently selected items in modal
  // Strictly compares against OTHER days in the same week
  const repetitionCheck = useMemo(() => {
    try {
      if (typeof checkOutfitRepetition === 'function') {
        const itemIds = (selectedItems || []).map(i => i?.matchedWardrobeId || i?.id).filter(Boolean);
        if (itemIds.length === 0) return { isRepeated: false, repeatedOn: null };
        return checkOutfitRepetition(itemIds, formDate, weeklyPlans, editingPlan?.id);
      }
    } catch (e) {
      console.warn('Repetition check note:', e);
    }
    return { isRepeated: false, repeatedOn: null };
  }, [selectedItems, formDate, weeklyPlans, editingPlan]);

  // All clothes from wardrobe, filtered by category chip and search query
  const displayedWardrobe = useMemo(() => {
    let list = Array.isArray(wardrobe) ? wardrobe : [];

    // Filter by search text
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(i =>
        (i?.name || '').toLowerCase().includes(q) ||
        (i?.category || '').toLowerCase().includes(q) ||
        (i?.colour || '').toLowerCase().includes(q) ||
        (i?.brand || '').toLowerCase().includes(q)
      );
    }

    // Filter by category chip
    if (categoryFilter === 'All') {
      return list;
    }

    const catLower = categoryFilter.toLowerCase();
    return list.filter(i => {
      const c = (i?.category || '').toLowerCase();
      const n = (i?.name || '').toLowerCase();
      if (catLower === 'tops') {
        return (c.includes('top') || c.includes('shirt') || c.includes('kurti') || c.includes('kurta') || c.includes('tee') || n.includes('shirt') || n.includes('top')) && !c.includes('dress') && !c.includes('outerwear') && !n.includes('jacket') && !n.includes('coat');
      }
      if (catLower === 'bottoms') {
        return c.includes('bottom') || c.includes('jean') || c.includes('pant') || c.includes('trouser') || c.includes('skirt') || c.includes('palazzo') || n.includes('jean') || n.includes('pant') || n.includes('trouser');
      }
      if (catLower === 'dresses') {
        return c.includes('dress') || c.includes('saree') || c.includes('anarkali') || n.includes('dress') || n.includes('saree') || n.includes('lehenga');
      }
      if (catLower === 'shoes') {
        return c.includes('shoe') || c.includes('footwear') || c.includes('sneaker') || c.includes('sandal') || c.includes('heel') || c.includes('boot') || n.includes('sneaker') || n.includes('sandal') || n.includes('shoe');
      }
      if (catLower === 'outerwear') {
        return c.includes('outerwear') || c.includes('jacket') || c.includes('coat') || c.includes('blazer') || n.includes('coat') || n.includes('jacket') || n.includes('blazer');
      }
      if (catLower === 'accessories') {
        return c.includes('accessories') || c.includes('bag') || c.includes('belt') || n.includes('bag');
      }
      return true;
    });
  }, [wardrobe, categoryFilter, searchQuery]);

  // Toggle garment selection (add/remove from assembled outfit)
  const handleToggleGarment = (item) => {
    if (!item) return;
    setSelectedItems(prev => {
      const current = Array.isArray(prev) ? prev : [];
      const exists = current.some(i => (i.matchedWardrobeId || i.id) === item.id);
      if (exists) {
        return current.filter(i => (i.matchedWardrobeId || i.id) !== item.id);
      } else {
        return [...current, {
          ...item,
          slot: item.category || 'Garment',
          inWardrobe: true,
          matchedWardrobeId: item.id
        }];
      }
    });
  };

  // Save Plan
  const handleSavePlan = async () => {
    if (!selectedItems || selectedItems.length === 0) {
      alert('Please select at least one garment from your wardrobe.');
      return;
    }

    const defaultTitle = selectedItems.map(i => i.name).slice(0, 2).join(' + ') +
      (selectedItems.length > 2 ? ` + ${selectedItems.length - 2} more` : '');

    const finalPlanName = formOutfitName.trim() || defaultTitle;
    const wardrobeItemIds = selectedItems.map(i => i.matchedWardrobeId || i.id).filter(Boolean);

    const planData = {
      id: editingPlan?.id || `plan-${Date.now()}`,
      planned_date: formDate,
      occasion: formOccasion,
      outfit_name: finalPlanName,
      items: selectedItems,
      wardrobe_item_ids: wardrobeItemIds,
      note: formNote.trim(),
      status: editingPlan?.status || 'planned'
    };

    if (editingPlan) {
      await updateOutfitPlan(editingPlan.id, planData);
    } else {
      await addOutfitPlan(planData);
    }

    setIsPlanModalOpen(false);
    setSelectedDateKey(formDate);
  };

  // Week statistics
  const weekStats = useMemo(() => {
    const plannedInWeek = weekDays.filter(d => d.plan);
    const wornInWeek = plannedInWeek.filter(d => d.plan?.status === 'worn');
    const totalDays = 7;
    return {
      plannedCount: plannedInWeek.length,
      wornCount: wornInWeek.length,
      plannedPct: Math.round((plannedInWeek.length / totalDays) * 100),
      wornPct: plannedInWeek.length > 0 ? Math.round((wornInWeek.length / plannedInWeek.length) * 100) : 0
    };
  }, [weekDays]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-taupe-200">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] uppercase font-bold tracking-widest text-charcoal-500 bg-white px-3 py-1 rounded-full border border-taupe-200">
              Wardrobe Weekly Planner
            </span>
            <span className="text-[11px] uppercase font-bold tracking-widest text-charcoal-700 bg-taupe-100 px-3 py-1 rounded-full border border-taupe-200">
              {weekStats.plannedCount} / 7 Days Planned
            </span>
          </div>
          <h1 className="editorial-heading text-3xl sm:text-4xl md:text-5xl font-semibold text-charcoal-900">
            Smart Weekly Outfit Planner
          </h1>
          <p className="text-sm sm:text-base text-charcoal-500 mt-1 max-w-2xl">
            Plan outfits for Monday through Sunday directly from your virtual wardrobe. Select your owned clothes, set the day's occasion, and track your rotation.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTodayWeek}
            iconLeft={<RotateCcw className="w-3.5 h-3.5" />}
          >
            This Week
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => openAddModal(selectedDateKey)}
            iconLeft={<Plus className="w-4 h-4" />}
          >
            Plan for {new Date(selectedDateKey + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
          </Button>
        </div>
      </div>

      {/* 2. Calendar Week Controller */}
      <div className="bg-white rounded-2xl border border-taupe-200 p-4 sm:p-6 shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-taupe-100 flex items-center justify-center text-charcoal-900">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-charcoal-400">
              Selected Week
            </span>
            <h2 className="editorial-heading text-xl font-bold text-charcoal-900">
              {weekRangeLabel}
            </h2>
          </div>
        </div>

        {/* Navigation Arrows */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevWeek}
            className="p-2.5 rounded-xl border border-taupe-300 hover:bg-taupe-100 text-charcoal-700 transition-colors cursor-pointer"
            title="Previous Week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleTodayWeek}
          >
            Today
          </Button>
          <button
            onClick={handleNextWeek}
            className="p-2.5 rounded-xl border border-taupe-300 hover:bg-taupe-100 text-charcoal-700 transition-colors cursor-pointer"
            title="Next Week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. Seven-Day Calendar Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const hasPlan = Boolean(day.plan);
          const isWorn = day.plan?.status === 'worn';
          const items = Array.isArray(day.plan?.items) ? day.plan.items : [];

          // Repetition check strictly against other days in this week
          const itemIds = items.map(i => i?.matchedWardrobeId || i?.id).filter(Boolean);
          const repInfo = (hasPlan && itemIds.length > 0)
            ? checkOutfitRepetition(itemIds, day.dateKey, weeklyPlans, day.plan.id)
            : { isRepeated: false };

          return (
            <div
              key={day.dateKey}
              onClick={() => setSelectedDateKey(day.dateKey)}
              className={`rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer ${
                day.isSelected
                  ? 'border-charcoal-900 shadow-card ring-2 ring-charcoal-900/10 bg-white'
                  : 'border-taupe-200 bg-white hover:border-taupe-400 hover:shadow-subtle'
              }`}
            >
              {/* Day Card Header */}
              <div className={`p-3.5 border-b flex items-center justify-between ${
                day.isToday ? 'bg-taupe-100/60 border-taupe-200' : 'border-taupe-100 bg-[#FAF8F5]'
              }`}>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-600">
                    {day.dayName}
                  </span>
                  <div className="text-base font-extrabold text-charcoal-900 -mt-0.5">
                    {day.dayNumber} {day.monthName}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {day.isToday && (
                    <span className="text-[9px] uppercase font-bold tracking-widest bg-charcoal-900 text-cream-50 px-2 py-0.5 rounded-full">
                      Today
                    </span>
                  )}
                  {hasPlan && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      isWorn
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-taupe-200 text-charcoal-700'
                    }`}>
                      {isWorn ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {isWorn ? 'Worn' : 'Planned'}
                    </span>
                  )}
                </div>
              </div>

              {/* Day Card Body */}
              <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3 min-h-[170px]">
                {hasPlan ? (
                  <>
                    <div className="space-y-2">
                      {/* Thumbnail Strip */}
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        {items.slice(0, 3).map((item, idx) => (
                          <div
                            key={idx}
                            className="w-12 h-14 rounded-lg bg-taupe-100 overflow-hidden border border-taupe-200 shrink-0 relative"
                          >
                            <img
                              src={item?.image || 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=300&q=80'}
                              alt={item?.name || 'Garment'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                        {items.length > 3 && (
                          <div className="w-7 h-14 rounded-lg bg-taupe-100 border border-taupe-200 flex items-center justify-center text-[10px] font-bold text-charcoal-600">
                            +{items.length - 3}
                          </div>
                        )}
                      </div>

                      {/* Outfit Name */}
                      <div>
                        <h4 className="text-xs font-bold text-charcoal-900 line-clamp-2 leading-tight">
                          {day.plan.outfit_name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="text-[10px] font-semibold text-charcoal-600 bg-taupe-100 px-2 py-0.5 rounded">
                            {day.plan.occasion}
                          </span>
                        </div>
                      </div>

                      {/* Genuine Repetition Reminder badge (only if repeated on a DIFFERENT day in the week) */}
                      {repInfo.isRepeated && (
                        <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md flex items-center gap-1.5 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="line-clamp-1">Reminder: Also on {repInfo.repeatedOn}</span>
                        </div>
                      )}

                      {/* Note snippet */}
                      {day.plan.note && (
                        <div className="text-[10px] text-charcoal-500 italic line-clamp-1 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-taupe-400 shrink-0" />
                          <span>{day.plan.note}</span>
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="pt-2 border-t border-taupe-100 flex items-center justify-between gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlanStatus(day.plan.id);
                        }}
                        title={isWorn ? "Mark as planned" : "Mark as worn"}
                        className={`text-[10px] font-semibold px-2 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                          isWorn
                            ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            : 'bg-taupe-100 text-charcoal-700 hover:bg-taupe-200'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        <span>{isWorn ? 'Worn' : 'Mark Worn'}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openAddModal(day.dateKey, day.plan);
                          }}
                          title="Edit outfit"
                          className="p-1.5 rounded-md text-charcoal-500 hover:text-charcoal-900 hover:bg-taupe-100 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const ok = window.confirm(`Remove outfit planned for ${day.dayName} ${day.dayNumber} ${day.monthName}?`);
                            if (ok) {
                              await deleteOutfitPlan(day.plan?.id, day.dateKey);
                            }
                          }}
                          title="Remove outfit"
                          className="p-1.5 rounded-md text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-6 border-2 border-dashed border-taupe-200 rounded-xl hover:border-taupe-400 transition-colors">
                    <span className="text-[10px] text-charcoal-400 font-medium">No outfit set</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openAddModal(day.dateKey);
                      }}
                      className="mt-2 text-xs font-semibold text-charcoal-900 bg-taupe-100 hover:bg-charcoal-900 hover:text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Plan</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. ASSEMBLE FROM WARDROBE OUTFIT MODAL */}
      <Modal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        title={editingPlan ? "Edit Planned Outfit" : "Assemble Outfit from Wardrobe"}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-6">
          
          {/* Top Controls: Date & Occasion */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-taupe-200">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1.5">
                Planned Date
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-taupe-300 text-sm font-medium focus:outline-none focus:border-charcoal-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1.5">
                Occasion
              </label>
              <select
                value={formOccasion}
                onChange={(e) => setFormOccasion(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-taupe-300 text-sm font-medium focus:outline-none focus:border-charcoal-900 bg-white"
              >
                {OCCASIONS.map(occ => (
                  <option key={occ.id} value={occ.id}>
                    {occ.icon} {occ.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Wardrobe Header & Filters */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-charcoal-900">
                  Select Clothes from Your Wardrobe ({wardrobe.length} total)
                </h3>
                <p className="text-xs text-charcoal-500">
                  Click any garment to add or remove it from your outfit combination.
                </p>
              </div>

              {/* Search in Wardrobe */}
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search clothes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-taupe-300 focus:outline-none focus:border-charcoal-900 bg-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {CATEGORY_CHIPS.map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setCategoryFilter(chip)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    categoryFilter === chip
                      ? 'bg-charcoal-900 text-cream-50'
                      : 'bg-taupe-100 text-charcoal-700 hover:bg-taupe-200'
                  }`}
                >
                  {chip === 'All' ? `All (${wardrobe.length})` : chip}
                </button>
              ))}
            </div>
          </div>

          {/* ALL CLOTHES GRID */}
          <div className="max-h-[380px] overflow-y-auto pr-1">
            {displayedWardrobe.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {displayedWardrobe.map(item => {
                  const isSel = (selectedItems || []).some(i => (i.matchedWardrobeId || i.id) === item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleGarment(item)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col justify-between ${
                        isSel
                          ? 'border-charcoal-900 bg-[#FAF6F0] ring-2 ring-charcoal-900/10 shadow-sm'
                          : 'border-taupe-200 bg-white hover:border-taupe-400 hover:shadow-subtle'
                      }`}
                    >
                      <div className="w-full aspect-[4/5] rounded-lg bg-taupe-100 overflow-hidden mb-2 relative">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                        {isSel ? (
                          <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-charcoal-900 text-cream-50 flex items-center justify-center shadow-md">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="absolute top-1.5 right-1.5 text-[10px] font-semibold bg-white/90 text-charcoal-700 px-1.5 py-0.5 rounded shadow-sm">
                            {item.category || 'Piece'}
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-charcoal-900 line-clamp-1 block">
                          {item.name}
                        </span>
                        <div className="flex items-center justify-center gap-1 mt-0.5 text-[10px] text-charcoal-500">
                          {item.colour && <span>{item.colour}</span>}
                          {item.colour && item.category && <span>•</span>}
                          <span>{item.category}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-taupe-300 rounded-xl space-y-3">
                <Shirt className="w-8 h-8 text-taupe-400 mx-auto" />
                <p className="text-xs text-charcoal-600">
                  {wardrobe.length === 0
                    ? 'Your wardrobe has no clothes yet. Add clothes in My Wardrobe first.'
                    : `No items found matching "${searchQuery || categoryFilter}".`}
                </p>
                {wardrobe.length === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/wardrobe')}
                  >
                    Go to My Wardrobe →
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Selected Clothes Live Strip & REPETITION REMINDER */}
          <div className="pt-4 border-t border-taupe-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-charcoal-700">
                Selected Pieces ({selectedItems.length})
              </span>
              {selectedItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedItems([])}
                  className="text-xs text-rose-600 hover:underline cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {selectedItems.length > 0 ? (
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {selectedItems.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-[#FAF8F5] border border-taupe-200 px-2.5 py-1.5 rounded-xl shrink-0">
                    <img src={it?.image} alt={it?.name} className="w-8 h-8 rounded-md object-cover" />
                    <div className="text-left">
                      <span className="text-[10px] font-bold text-charcoal-500 block uppercase">
                        {it?.slot || it?.category}
                      </span>
                      <span className="text-xs font-semibold text-charcoal-900 line-clamp-1 max-w-[130px]">
                        {it?.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-charcoal-400 italic">
                No garments selected yet. Click any items from the wardrobe above to build your outfit.
              </p>
            )}

            {/* GENUINE REPETITION REMINDER NOTICE (Only when combination matches another day in the same week) */}
            {repetitionCheck?.isRepeated && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-3 shadow-sm animate-fadeIn">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-sm block">
                    Reminder: Outfit Combination Repeated This Week
                  </span>
                  <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                    You have already planned this combination on <strong>{repetitionCheck.repeatedOn} ({repetitionCheck.repeatedDate})</strong>.
                    Repeating favorite outfits is completely fine! You can save this plan, or swap an item if you want variety.
                  </p>
                </div>
              </div>
            )}

            {/* Title & Notes Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                  Outfit Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Blue Jeans + White Top"
                  value={formOutfitName}
                  onChange={(e) => setFormOutfitName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-taupe-300 text-sm focus:outline-none focus:border-charcoal-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                  Day Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lab day, presentation, team lunch..."
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-taupe-300 text-sm focus:outline-none focus:border-charcoal-900 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="pt-4 border-t border-taupe-200 flex items-center justify-between gap-3">
            <div>
              {editingPlan && (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = window.confirm('Remove this outfit from your weekly plan?');
                    if (ok) {
                      await deleteOutfitPlan(editingPlan.id, editingPlan.planned_date || formDate);
                      setIsPlanModalOpen(false);
                      setEditingPlan(null);
                    }
                  }}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Outfit</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsPlanModalOpen(false)}
              >
                Cancel
              </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSavePlan}
              disabled={selectedItems.length === 0}
              iconRight={<ArrowRight className="w-4 h-4" />}
            >
              Save Outfit for {new Date(formDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* 5. DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(deleteConfirmPlan)}
        onClose={() => setDeleteConfirmPlan(null)}
        title="Remove Outfit Plan?"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-charcoal-600">
            Are you sure you want to remove the outfit planned for{' '}
            <strong>
              {deleteConfirmPlan && new Date(deleteConfirmPlan.planned_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </strong>?
          </p>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-taupe-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmPlan(null)}
            >
              Keep Plan
            </Button>
            <Button
              variant="accent"
              size="sm"
              onClick={async () => {
                if (deleteConfirmPlan) {
                  await deleteOutfitPlan(deleteConfirmPlan.id, deleteConfirmPlan.planned_date);
                  setDeleteConfirmPlan(null);
                }
              }}
            >
              Remove Plan
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
