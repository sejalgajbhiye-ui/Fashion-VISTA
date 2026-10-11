/**
 * Fashion VISTA — Supabase PostgreSQL Wardrobe Service.
 *
 * Provides cloud persistence for wardrobe items when Supabase is configured.
 * Seamlessly pairs with local SQLite backend for hybrid reliability.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Fetch wardrobe items for the authenticated user and public sample items
 * @param {string} userId
 */
export async function fetchSupabaseWardrobeItems(userId = null) {
  if (!isSupabaseConfigured) return null;

  try {
    if (!userId) {
      return []; // Never show dummy clothes to unauthenticated guests
    }

    const { data, error } = await supabase
      .from('wardrobe_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase wardrobe items fetch note:', error.message);
      return null;
    }
    return data || [];
  } catch (err) {
    console.warn('Supabase wardrobe items fetch exception:', err);
    return null;
  }
}

/**
 * Insert a wardrobe item into Supabase PostgreSQL
 * @param {Object} item
 * @param {string} userId
 */
export async function insertSupabaseWardrobeItem(item, userId = null) {
  if (!isSupabaseConfigured) return null;

  try {
    const record = {
      id: item.id,
      user_id: userId || null,
      is_sample: !userId,
      name: item.name,
      category: item.category,
      colour: item.colour || null,
      style: item.style || null,
      season: item.season || null,
      brand: item.brand || null,
      description: item.description || null,
      image: item.image || null,
      predicted_category: item.predicted_category || null,
      confidence: item.confidence || null,
      model_used: item.model_used || null,
    };

    const { data, error } = await supabase
      .from('wardrobe_items')
      .upsert(record)
      .select()
      .single();

    if (error) {
      console.warn('Supabase wardrobe item insert error:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('Supabase wardrobe item insert exception:', err);
    return null;
  }
}

/**
 * Update an existing item in Supabase PostgreSQL
 * @param {string} itemId
 * @param {Object} updates
 */
export async function updateSupabaseWardrobeItem(itemId, updates) {
  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from('wardrobe_items')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      console.warn('Supabase wardrobe item update error:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('Supabase wardrobe item update exception:', err);
    return null;
  }
}

/**
 * Delete an item from Supabase PostgreSQL
 * @param {string} itemId
 */
export async function deleteSupabaseWardrobeItem(itemId) {
  if (!isSupabaseConfigured) return false;

  try {
    const { error } = await supabase
      .from('wardrobe_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.warn('Supabase wardrobe item delete error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase wardrobe item delete exception:', err);
    return false;
  }
}
