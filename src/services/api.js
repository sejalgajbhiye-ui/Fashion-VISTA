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
export async function fetchRecommendations(preferences, wardrobe = [], limit = 8) {
  try {
    const res = await fetch(`${API_BASE_URL}/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences, wardrobe, limit })
    });
    if (!res.ok) throw new Error(`Recommendation error (${res.status})`);
    return await res.json();
  } catch (err) {
    console.warn('Backend recommendations endpoint unavailable, falling back:', err.message);
    return null;
  }
}

/**
 * Generate outfit recommendation
 * @param {Object} preferences
 * @param {Array} wardrobe
 */
export async function generateMLRecommendation(preferences, wardrobe = []) {
  try {
    // Try primary recommendations endpoint first with full limit of 8 outfits
    const multiRes = await fetchRecommendations(preferences, wardrobe, 8);
    if (multiRes && multiRes.primary_recommendation) {
      return {
        ...multiRes.primary_recommendation,
        alternatives: multiRes.alternatives || [],
        recommendations: multiRes.recommendations || []
      };
    }

    // Fallback to /ml/recommend endpoint
    const res = await fetch(`${API_BASE_URL}/ml/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences, wardrobe })
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
 * Virtual Try-On endpoint
 */
export async function requestVirtualTryOn(payload = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}/ml/try-on`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Try-on error ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      success: false,
      status: 'offline',
      message: 'Backend server not responding.'
    };
  }
}
