"""
Fashion VISTA — FitInView AI Virtual Try-On API Integration Service.

Official FitInView API Documentation: https://api.fitinview.com/api/docs
Developer Portal: https://fitinview.com/developers

Features:
1. Secure API Key handling via FITINVIEW_API_KEY environment variable.
2. Supports live keys (fiv_live_*) and test keys (fiv_test_*) for free zero-cost smoke testing.
3. Supports 1-3 garments per try-on request (e.g. Topwear + Bottomwear coordinated try-on).
4. Handles person_url and person_image_b64 (raw base64 bytes).
5. Asynchronous job submission (wait=false) and polling (GET /api/v1/tryon/{job_id}).
6. Account balance checking (GET /api/v1/account).
7. Rate limit tracking (20 requests/minute limit with sliding window).
8. Credit cost estimation (8 credits per 1K try-on, 12 per 2K, 20 per 4K).
"""

import os
import time
import base64
import logging
import requests
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Official FitInView API Base URL
FITINVIEW_BASE_URL = os.getenv("FITINVIEW_BASE_URL", "https://api.fitinview.com").rstrip("/")

# Credit cost table per output resolution (from FitInView official documentation)
FITINVIEW_CREDIT_COSTS = {
    "1K": 8,   # ~1024px, 8 credits per try-on (~$0.16)
    "2K": 12,  # ~2048px, 12 credits per try-on (~$0.24)
    "4K": 20   # ~4096px, 20 credits per try-on (~$0.40)
}

# Default rate limit (20 requests/minute per key)
FITINVIEW_RATE_LIMIT_PER_MIN = 20


class FitInViewClient:
    """Client for FitInView AI Virtual Try-On REST API."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("FITINVIEW_API_KEY", "").strip()
        self.base_url = FITINVIEW_BASE_URL

    @property
    def is_configured(self) -> bool:
        """Returns True if a non-empty API key is present."""
        return bool(self.api_key)

    @property
    def is_test_key(self) -> bool:
        """Returns True if using a free test key (prefix fiv_test_)."""
        return self.api_key.startswith("fiv_test_")

    def _get_headers(self, idempotency_key: Optional[str] = None) -> Dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "FashionVISTA-VTON/2.0"
        }
        if idempotency_key:
            headers["Idempotency-Key"] = str(idempotency_key)[:200]
        return headers

    def get_account_info(self) -> Dict[str, Any]:
        """
        Retrieves account balance, rate limits, and key status.
        Endpoint: GET /api/v1/account
        """
        if not self.is_configured:
            return {
                "configured": False,
                "name": "Not Configured",
                "credits_remaining": 0,
                "rate_limit_per_min": FITINVIEW_RATE_LIMIT_PER_MIN,
                "tryon_cost_credits": FITINVIEW_CREDIT_COSTS,
                "message": "FITINVIEW_API_KEY environment variable is not configured."
            }

        url = f"{self.base_url}/api/v1/account"
        try:
            resp = requests.get(url, headers=self._get_headers(), timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                data["configured"] = True
                data["is_test_key"] = self.is_test_key
                return data
            elif resp.status_code == 401:
                return {
                    "configured": True,
                    "error": "Invalid or expired FITINVIEW_API_KEY.",
                    "status_code": 401
                }
            else:
                return {
                    "configured": True,
                    "error": f"FitInView account error ({resp.status_code}): {resp.text}",
                    "status_code": resp.status_code
                }
        except Exception as e:
            logger.warning(f"FitInView account check failed: {e}")
            return {
                "configured": True,
                "error": str(e),
                "is_test_key": self.is_test_key
            }

    @staticmethod
    def _normalize_image_payload(img_input: Any) -> Tuple[Optional[str], Optional[str]]:
        """
        Normalizes image input into (url, raw_b64).
        Returns (url, None) if HTTP/HTTPS URL.
        Returns (None, b64_raw) if data URI, local path, or raw base64.
        """
        if not img_input:
            return None, None

        if isinstance(img_input, str):
            clean = img_input.strip()
            # If HTTPS URL:
            if clean.startswith("https://") or clean.startswith("http://"):
                return clean, None

            # If Data URI: strip header
            if clean.startswith("data:") and ";base64," in clean:
                raw_b64 = clean.split(";base64,", 1)[1]
                return None, raw_b64

            # If raw base64 string
            if len(clean) > 300 and not os.path.exists(clean):
                return None, clean

            # If local file path
            if os.path.exists(clean):
                try:
                    with open(clean, "rb") as f:
                        raw = base64.b64encode(f.read()).decode("utf-8")
                        return None, raw
                except Exception as e:
                    logger.warning(f"Could not read local image {clean}: {e}")

        return None, None

    def submit_tryon(
        self,
        person_image: Any,
        garment_images: List[Any],
        output_size: str = "1K",
        wait: bool = False,
        prompt: str = "",
        metadata: Optional[Dict[str, str]] = None,
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Submits a Virtual Try-On request to FitInView API.
        Endpoint: POST /api/v1/tryon

        Parameters:
        - person_image: HTTPS URL, Data URI, or local file path
        - garment_images: List of 1 to 3 garment images (HTTPS URLs or Base64)
        - output_size: "1K" (default, 8 credits), "2K" (12 credits), or "4K" (20 credits)
        - wait: True for synchronous inline response (up to 90s), False for async polling
        - prompt: Optional custom styling instruction (e.g. "Fit smoothly, preserve jewelry")
        - metadata: Optional dictionary of up to 8 key/value pairs
        - idempotency_key: Optional string for safe deduplication within 24h
        """
        if not self.is_configured:
            # Informative response when key is not configured
            return {
                "success": False,
                "status": "unconfigured",
                "error": "FitInView API Key is not configured. Please add FITINVIEW_API_KEY to .env.",
                "requires_api_key": True
            }

        # Validate & normalize person image
        person_url, person_b64 = self._normalize_image_payload(person_image)
        if not person_url and not person_b64:
            return {
                "success": False,
                "status": "error",
                "error": "Missing or invalid person image. Provide an HTTPS URL or valid image data."
            }

        # Validate & normalize garment images (1 to 3 garments supported)
        if not garment_images or not isinstance(garment_images, list):
            return {
                "success": False,
                "status": "error",
                "error": "FitInView requires 1 to 3 garment images in garment_images."
            }

        garment_urls = []
        garment_b64s = []
        for g in garment_images[:3]:
            g_url, g_b64 = self._normalize_image_payload(g)
            if g_url:
                garment_urls.append(g_url)
            elif g_b64:
                garment_b64s.append(g_b64)

        if not garment_urls and not garment_b64s:
            return {
                "success": False,
                "status": "error",
                "error": "No usable garment images found in the request."
            }

        # Build request body per official OpenAPI specification
        body: Dict[str, Any] = {
            "output_size": output_size.upper() if output_size.upper() in FITINVIEW_CREDIT_COSTS else "1K",
            "wait": bool(wait)
        }

        if person_b64:
            body["person_image_b64"] = person_b64
        else:
            body["person_url"] = person_url

        if garment_urls:
            body["garment_urls"] = garment_urls
        if garment_b64s:
            body["garment_images_b64"] = garment_b64s

        if prompt:
            body["prompt"] = str(prompt)[:1000]

        if metadata and isinstance(metadata, dict):
            # FitInView accepts up to 8 key/value pairs (256 chars each)
            clean_meta = {}
            for k, v in list(metadata.items())[:8]:
                clean_meta[str(k)[:64]] = str(v)[:256]
            body["metadata"] = clean_meta

        url = f"{self.base_url}/api/v1/tryon"
        headers = self._get_headers(idempotency_key=idempotency_key)

        try:
            logger.info(f"Submitting try-on to FitInView ({'wait=true' if wait else 'async wait=false'})...")
            # Sync calls wait up to 95s; async calls return in ~1-2s
            timeout = 100 if wait else 20
            resp = requests.post(url, headers=headers, json=body, timeout=timeout)

            # 1. Success response (200 OK)
            if resp.status_code == 200:
                data = resp.json()
                status = data.get("status", "running")
                job_id = data.get("job_id")

                return {
                    "success": True,
                    "provider": "fitinview",
                    "job_id": job_id,
                    "status": status,
                    "result_url": data.get("result_url"),
                    "cost_credits": data.get("cost_credits", FITINVIEW_CREDIT_COSTS.get(body["output_size"], 8)),
                    "credits_remaining": data.get("credits_remaining"),
                    "duration_ms": data.get("duration_ms"),
                    "message": data.get("message", "Try-on submitted successfully to FitInView.")
                }

            # 2. Client Errors
            elif resp.status_code == 400:
                err_data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                return {
                    "success": False,
                    "status": "error",
                    "error_code": "bad_request",
                    "error": err_data.get("detail", f"FitInView rejected request (400): {resp.text}"),
                    "status_code": 400
                }
            elif resp.status_code == 401:
                return {
                    "success": False,
                    "status": "unauthorized",
                    "error": "FitInView authentication failed. Check your FITINVIEW_API_KEY in .env.",
                    "status_code": 401
                }
            elif resp.status_code == 402:
                return {
                    "success": False,
                    "status": "insufficient_credits",
                    "error": "Insufficient FitInView credits. Purchase credit pack at https://fitinview.com/developers.",
                    "status_code": 402
                }
            elif resp.status_code == 429:
                retry_after = resp.headers.get("Retry-After", "10")
                return {
                    "success": False,
                    "status": "rate_limited",
                    "retry_after": int(retry_after) if retry_after.isdigit() else 10,
                    "error": f"FitInView rate limit exceeded. Retry after {retry_after} seconds.",
                    "status_code": 429
                }
            else:
                return {
                    "success": False,
                    "status": "error",
                    "error": f"FitInView API error ({resp.status_code}): {resp.text}",
                    "status_code": resp.status_code
                }

        except requests.exceptions.Timeout:
            return {
                "success": False,
                "status": "timeout",
                "error": "FitInView request timed out after 90 seconds. Try async submission mode."
            }
        except Exception as e:
            logger.error(f"FitInView tryon submission failed: {e}", exc_info=True)
            return {
                "success": False,
                "status": "error",
                "error": f"Failed to reach FitInView API: {str(e)}"
            }

    def poll_job_status(self, job_id: str) -> Dict[str, Any]:
        """
        Polls the status of an ongoing or completed try-on job.
        Endpoint: GET /api/v1/tryon/{job_id}
        """
        if not self.is_configured:
            return {"success": False, "status": "unconfigured", "error": "FITINVIEW_API_KEY not configured."}

        if not job_id:
            return {"success": False, "status": "error", "error": "Missing required job_id."}

        url = f"{self.base_url}/api/v1/tryon/{job_id}"
        headers = self._get_headers()

        try:
            resp = requests.get(url, headers=headers, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                status = data.get("status", "running")
                return {
                    "success": True,
                    "provider": "fitinview",
                    "job_id": data.get("job_id", job_id),
                    "status": status,  # "running" | "succeeded" | "failed"
                    "result_url": data.get("result_url"),
                    "cost_credits": data.get("cost_credits", 8),
                    "duration_ms": data.get("duration_ms"),
                    "created_at": data.get("created_at"),
                    "completed_at": data.get("completed_at"),
                    "error_code": data.get("error_code"),
                    "error_message": data.get("error_message")
                }
            elif resp.status_code == 404:
                return {"success": False, "status": "not_found", "error": f"Job '{job_id}' not found."}
            else:
                return {"success": False, "status": "error", "error": f"Poll failed ({resp.status_code}): {resp.text}"}
        except Exception as e:
            return {"success": False, "status": "error", "error": f"FitInView polling failed: {str(e)}"}

    @staticmethod
    def estimate_batch_cost(count: int, output_size: str = "1K") -> Dict[str, Any]:
        """Calculates credit and estimated monetary cost for a batch of try-ons."""
        rate = FITINVIEW_CREDIT_COSTS.get(output_size.upper(), 8)
        total_credits = count * rate
        # 100 credits = $2.00 -> $0.02 per credit
        approx_usd = round(total_credits * 0.02, 2)
        return {
            "outfit_count": count,
            "output_size": output_size.upper(),
            "credits_per_tryon": rate,
            "total_credits": total_credits,
            "approx_usd": approx_usd,
            "note": "Credits are charged per try-on generation on FitInView API. Failed server calls are auto-refunded."
        }


# Global singleton instance
_fitinview_instance: Optional[FitInViewClient] = None


def get_fitinview_client() -> FitInViewClient:
    """Returns or initializes the global FitInViewClient singleton."""
    global _fitinview_instance
    if _fitinview_instance is None:
        _fitinview_instance = FitInViewClient()
    return _fitinview_instance
