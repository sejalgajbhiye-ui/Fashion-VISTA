/**
 * Fashion VISTA — AI/ML Backend Service Client.
 *
 * Provides API communication with the Flask ML backend (http://localhost:5000/api).
 * Includes seamless fallback to local calculation if backend is unreachable,
 * guaranteeing zero downtime or frontend regressions.
 */

import { supabase } from './supabaseClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Returns Authorization header with Supabase session JWT if user is signed in
 */
export async function getAuthHeaders() {
  const headers = {};
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      headers['Authorization'] = `Bearer ${data.session.access_token}`;
    }
  } catch (err) {
    // Graceful fallback if offline or supabase not configured
  }
  return headers;
}

/**
 * Health check
 */
export async function getHealthStatus() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { method: 'GET' });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return await res.json();
  } catch (err) {
    return { status: 'offline', error: err.message };
  }
}

/**
 * Fetch Model Registry and capabilities
 */
export async function getMLSystemStatus() {
  try {
    const res = await fetch(`${API_BASE_URL}/ml/status`, { method: 'GET' });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return await res.json();
  } catch (err) {
    return { status: 'offline', error: err.message };
  }
}

/**
 * Classify a garment photo using FashionCNN
 * @param {string|File} imageSource - Base64 data URL or File object
 */
export async function classifyGarment(imageSource) {
  try {
    let body;
    let headers = {};

    if (imageSource instanceof File) {
      body = new FormData();
      body.append('image', imageSource);
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({ image_base64: imageSource });
    }

    const res = await fetch(`${API_BASE_URL}/ml/classify`, {
      method: 'POST',
      headers,
      body
    });

    if (!res.ok) throw new Error(`Classification error ${res.status}`);
    const data = await res.json();
    return data.prediction;
  } catch (err) {
    console.warn('Backend classification unavailable, using local fallback:', err.message);
    return null;
  }
}

/**
 * Functionality 1: AI Clothing Recognition Endpoint
 * Classify image and receive mapped wardrobe category + confidence + saved image URL
 * @param {string|File} imageSource
 */
export async function classifyWardrobeGarment(imageSource) {
  try {
    let body;
    let headers = {};

    if (imageSource instanceof File) {
      body = new FormData();
      body.append('image', imageSource);
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({ image_base64: imageSource });
    }

    const res = await fetch(`${API_BASE_URL}/wardrobe/classify`, {
      method: 'POST',
      headers,
      body
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Classification failed (${res.status})`);
    }

    return await res.json();
  } catch (err) {
    console.warn('Wardrobe AI classification error:', err.message);
    throw err;
  }
}

/**
 * Fetch all persistent wardrobe items from backend
 */
export async function fetchWardrobeItems() {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/wardrobe/items`, {
      method: 'GET',
      headers: { ...authHeaders }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.warn('Backend wardrobe fetch failed, falling back to local cache:', err.message);
    return null;
  }
}

/**
 * Save new wardrobe item to persistent backend
 * @param {Object} itemData
 */
export async function createWardrobeItem(itemData) {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/wardrobe/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify(itemData)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Creation failed (${res.status})`);
    }
    const data = await res.json();
    return data.item;
  } catch (err) {
    console.warn('Backend wardrobe creation failed:', err.message);
    throw err;
  }
}

/**
 * Update an existing wardrobe item
 * @param {string} id
 * @param {Object} updateFields
 */
export async function updateWardrobeItemAPI(id, updateFields) {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/wardrobe/items/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify(updateFields)
    });
    if (!res.ok) throw new Error(`Update failed (${res.status})`);
    const data = await res.json();
    return data.item;
  } catch (err) {
    console.warn('Backend wardrobe update failed:', err.message);
    throw err;
  }
}

/**
 * Delete a wardrobe item
 * @param {string} id
 */
export async function deleteWardrobeItemAPI(id) {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/wardrobe/items/${id}`, {
      method: 'DELETE',
      headers: { ...authHeaders }
    });
    if (!res.ok) throw new Error(`Delete failed (${res.status})`);
    return true;
  } catch (err) {
    console.warn('Backend wardrobe deletion failed:', err.message);
    throw err;
  }
}

/**
 * Extract or predict garment attributes from product text
 * @param {string} text
 */
export async function predictProductAttributes(text) {
  try {
    const res = await fetch(`${API_BASE_URL}/ml/attributes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_name: text })
    });
    if (!res.ok) throw new Error(`Attributes error ${res.status}`);
    const data = await res.json();
    return data.predicted_attributes;
  } catch (err) {
    console.warn('Backend attributes unavailable:', err.message);
    return null;
  }
}

/**
 * Functionality 2: AI-Powered Outfit Recommendations Endpoint
 * Generates ranked primary outfit curation plus diverse alternative combinations
 * @param {Object} preferences
 * @param {Array} wardrobe
 * @param {number} limit
 */
export async function fetchRecommendations(preferences, wardrobe = [], limit = 8, userPhoto = null) {
  try {
    const cappedLimit = Math.max(5, Math.min(10, limit || 8));
    const res = await fetch(`${API_BASE_URL}/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences, wardrobe, limit: cappedLimit, user_photo: userPhoto })
    });
    if (!res.ok) throw new Error(`Recommendation error (${res.status})`);
    return await res.json();
  } catch (err) {
    console.warn('Backend recommendations endpoint unavailable, falling back:', err.message);
    return null;
  }
}

/**
 * Generate 360° Occasion Outfit recommendations (5 to 10 diverse looks)
 * @param {Object} preferences
 * @param {Array} wardrobe
 * @param {number} limit
 */
export async function generateMLRecommendation(preferences, wardrobe = [], limit = 8) {
  try {
    const multiRes = await fetchRecommendations(preferences, wardrobe, limit);
    if (multiRes && multiRes.primary_recommendation) {
      return {
        ...multiRes.primary_recommendation,
        total_looks: multiRes.total_looks,
        alternatives: multiRes.alternatives || [],
        recommendations: multiRes.recommendations || []
      };
    }

    // Fallback to /ml/recommend endpoint
    const res = await fetch(`${API_BASE_URL}/ml/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences, wardrobe, user_photo: userPhoto })
    });
    if (!res.ok) throw new Error(`Recommendation error ${res.status}`);
    const data = await res.json();
    return data.recommendation;
  } catch (err) {
    console.warn('Backend recommender unavailable, falling back to local curation:', err.message);
    return null;
  }
}

/**
 * Check wardrobe overlap and missing items
 * @param {Array} outfitItems
 * @param {Array} wardrobe
 */
export async function checkWardrobeMatch(outfitItems, wardrobe = []) {
  try {
    const res = await fetch(`${API_BASE_URL}/ml/wardrobe-match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outfit_items: outfitItems, wardrobe })
    });
    if (!res.ok) throw new Error(`Wardrobe match error ${res.status}`);
    const data = await res.json();
    return data.result;
  } catch (err) {
    console.warn('Backend wardrobe match unavailable:', err.message);
    return null;
  }
}

/**
 * Functionality 4: AI Virtual Try-On System Status
 * Checks neural engine readiness, cached models, and hardware capabilities
 */
export async function getVTOStatus() {
  try {
    const res = await fetch(`${API_BASE_URL}/try-on/status`, { method: 'GET' });
    if (!res.ok) throw new Error(`Status check failed (${res.status})`);
    return await res.json();
  } catch (err) {
    console.warn('VTO status check unavailable:', err.message);
    return { status: 'offline', error: err.message };
  }
}

/**
 * Functionality 4: AI Virtual Try-On Execution Endpoint
 * Synthesizes neural geometric cloth warping and silhouette blending
 * @param {Object} payload - { person_image, garment_image, category, blend_mode, items }
 */
export async function requestVirtualTryOn(payload = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}/try-on`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Virtual Try-On error (${res.status})`);
    }
    return data;
  } catch (err) {
    console.warn('Virtual Try-On request failed:', err.message);
    return {
      status: 'error',
      error: err.message || 'Virtual Try-On service unavailable'
    };
  }
}

/**
 * Genuine Multi-Garment Outfit Virtual Try-On Endpoint
 * Synthesizes mixed outfits combining wardrobe items and online shopping items
 * @param {Object} payload - { user_photo, garments }
 */
export async function requestOutfitTryOn(payload = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}/try-on/outfit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Outfit Try-On error (${res.status})`);
    }
    return data;
  } catch (err) {
    console.warn('Outfit Try-On request failed:', err.message);
    return {
      status: 'error',
      error: err.message || 'Outfit Try-On service unavailable'
    };
  }
}

/**
 * Dynamic live retail product search (Myntra) without persistent catalog databases
 * @param {Object} params - { q, slot, colour, limit }
 */
export async function searchOnlineProducts(params = {}) {
  try {
    const searchParams = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/shopping/search?${searchParams}`, {
      method: 'GET'
    });
    if (!res.ok) throw new Error(`Search error (${res.status})`);
    return await res.json();
  } catch (err) {
    console.warn('Online product search unavailable:', err.message);
    return { status: 'error', products: [] };
  }
}

/**
 * FitInView Virtual Try-On API Integration
 */

/**
 * Fetch FitInView account credit balance, key configuration, and limits
 */
export async function getFitInViewAccount() {
  try {
    const res = await fetch(`${API_BASE_URL}/tryon/fitinview/account`, {
      method: 'GET'
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('FitInView account check notice:', err.message);
    return { configured: false, error: err.message };
  }
}

/**
 * Dispatches an automated batch try-on workflow for top-ranked recommendations.
 * @param {Object} payload - { user_photo, preferences, recommendations, limit, output_size }
 */
export async function startFitInViewBatchTryOn(payload = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}/tryon/fitinview/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Batch try-on dispatch error (${res.status})`);
    }
    return data;
  } catch (err) {
    console.error('FitInView batch try-on dispatch failed:', err);
    throw err;
  }
}

/**
 * Polls progress and retrieves generated try-on results for a batch
 * @param {string} batchId
 */
export async function getFitInViewBatchStatus(batchId) {
  try {
    const res = await fetch(`${API_BASE_URL}/tryon/fitinview/batch/${batchId}`, {
      method: 'GET'
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`FitInView batch poll error for ${batchId}:`, err.message);
    return { success: false, status: 'error', error: err.message };
  }
}

/**
 * Retries an individual failed try-on job within a batch
 * @param {string} batchId
 * @param {string} jobId
 * @param {string} userPhoto
 */
export async function retryFitInViewJob(batchId, jobId, userPhoto) {
  try {
    const res = await fetch(`${API_BASE_URL}/tryon/fitinview/batch/${batchId}/retry/${jobId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_photo: userPhoto })
    });
    return await res.json();
  } catch (err) {
    console.warn(`FitInView retry error for ${jobId}:`, err.message);
    return { success: false, error: err.message };
  }
}


