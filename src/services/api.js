/**
 * Fashion VISTA — AI/ML Backend Service Client.
 *
 * Provides API communication with the Flask ML backend (http://localhost:5000/api).
 * Includes seamless fallback to local calculation if backend is unreachable,
 * guaranteeing zero downtime or frontend regressions.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

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
 * Fetch all persistent wardrobe items from SQLite backend
 */
export async function fetchWardrobeItems() {
  try {
    const res = await fetch(`${API_BASE_URL}/wardrobe/items`, { method: 'GET' });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.warn('Backend wardrobe fetch failed, falling back to local cache:', err.message);
    return null;
  }
}

/**
 * Save new wardrobe item to persistent SQLite backend
 * @param {Object} itemData
 */
export async function createWardrobeItem(itemData) {
  try {
    const res = await fetch(`${API_BASE_URL}/wardrobe/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
 * Update an existing wardrobe item in SQLite
 * @param {string} id
 * @param {Object} updateFields
 */
export async function updateWardrobeItemAPI(id, updateFields) {
  try {
    const res = await fetch(`${API_BASE_URL}/wardrobe/items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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
 * Delete a wardrobe item from SQLite
 * @param {string} id
 */
export async function deleteWardrobeItemAPI(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/wardrobe/items/${id}`, {
      method: 'DELETE'
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
 * @param {Object} payload - { person_image, garment_image, category, blend_mode }
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

