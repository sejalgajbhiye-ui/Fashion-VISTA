/**
 * Fashion VISTA — Supabase PostgreSQL Weekly Outfit Planner Service.
 *
 * Provides cloud persistence for weekly outfit plans when Supabase is configured
 * and the user is authenticated. Strictly enforces user ownership and RLS policies.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Fetch outfit plans for the authenticated user
 * @param {string} userId
 * @param {string} startDate - Optional YYYY-MM-DD
 * @param {string} endDate - Optional YYYY-MM-DD
 */
export async function fetchSupabaseOutfitPlans(userId, startDate = null, endDate = null) {
  if (!isSupabaseConfigured || !userId) return null;

  try {
    let query = supabase
      .from('outfit_plans')
      .select('*')
      .eq('user_id', userId)
      .order('planned_date', { ascending: true });

    if (startDate) {
      query = query.gte('planned_date', startDate);
    }
    if (endDate) {
      query = query.lte('planned_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Supabase outfit plans fetch error:', error.message);
      return null;
    }
    return data || [];
  } catch (err) {
    console.warn('Supabase outfit plans fetch exception:', err);
    return null;
  }
}

/**
 * Insert an outfit plan into Supabase PostgreSQL
 * @param {Object} plan
 * @param {string} userId
 */
export async function insertSupabaseOutfitPlan(plan, userId) {
  if (!isSupabaseConfigured || !userId) return null;

  try {
    const record = {
      id: plan.id,
      user_id: userId,
      planned_date: plan.planned_date,
      occasion: plan.occasion || 'Casual',
      outfit_name: plan.outfit_name || 'Curated Look',
      items: plan.items || [],
      wardrobe_item_ids: plan.wardrobe_item_ids || [],
      note: plan.note || '',
      status: plan.status || 'planned',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('outfit_plans')
      .upsert(record)
      .select()
      .single();

    if (error) {
      console.warn('Supabase outfit plan insert error:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('Supabase outfit plan insert exception:', err);
    return null;
  }
}

/**
 * Update an existing outfit plan in Supabase
 * @param {string} planId
 * @param {Object} updates
 * @param {string} userId
 */
export async function updateSupabaseOutfitPlan(planId, updates, userId) {
  if (!isSupabaseConfigured || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('outfit_plans')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', planId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.warn('Supabase outfit plan update error:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('Supabase outfit plan update exception:', err);
    return null;
  }
}

/**
 * Delete an outfit plan in Supabase
 * @param {string} planId
 * @param {string} userId
 */
export async function deleteSupabaseOutfitPlan(planId, userId) {
  if (!isSupabaseConfigured || !userId) return false;

  try {
    const { error } = await supabase
      .from('outfit_plans')
      .delete()
      .eq('id', planId)
      .eq('user_id', userId);

    if (error) {
      console.warn('Supabase outfit plan delete error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase outfit plan delete exception:', err);
    return false;
  }
}
