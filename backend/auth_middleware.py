"""
Fashion VISTA — Supabase Authentication & Authorization Middleware for Flask.

Provides secure token verification, user identity derivation,
and endpoint decorators:
- @require_auth: strictly requires a valid Supabase JWT Bearer token
- @optional_auth: derives user identity if token is present, allows guest if omitted
"""

import os
from functools import wraps
from flask import request, jsonify, current_app
import requests
from dotenv import load_dotenv

# Load local environment variables
load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL") or ""
SUPABASE_ANON_KEY = (
    os.getenv("VITE_SUPABASE_ANON_KEY")
    or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")
    or os.getenv("SUPABASE_ANON_KEY")
    or ""
)


def get_current_user():
    """
    Derives the verified current user from the incoming request.
    Verifies the JWT Bearer token with Supabase Auth API endpoint:
    GET {SUPABASE_URL}/auth/v1/user
    
    Returns:
        dict: User profile dict containing 'id', 'email', 'user_metadata', etc.
        None: If no token provided or token is invalid/expired.
    """
    auth_header = request.headers.get("Authorization", "")
    token = None

    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()

    # Testing mode bypass if configured
    if not token:
        if current_app and current_app.config.get("TESTING"):
            test_user_id = request.headers.get("X-Test-User-Id")
            if test_user_id:
                return {"id": test_user_id, "email": f"{test_user_id}@test.local"}
        return None

    # Handle synthetic test tokens in test suite
    if current_app and current_app.config.get("TESTING"):
        if token.startswith("test-token-"):
            uid = token.replace("test-token-", "")
            return {"id": uid, "email": f"{uid}@test.local"}

    # Verify with Supabase Auth
    if not SUPABASE_URL or not SUPABASE_ANON_KEY or "your-project-id" in SUPABASE_URL:
        # Supabase not configured locally yet - reject unverified tokens safely
        return None

    verify_url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/user"
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": SUPABASE_ANON_KEY,
    }

    try:
        res = requests.get(verify_url, headers=headers, timeout=5)
        if res.status_code == 200:
            return res.json()
        return None
    except Exception as e:
        # Network or timeout failure during verification
        return None


def require_auth(f):
    """
    Decorator to strictly enforce Supabase authentication.
    Rejects requests with missing, invalid, or expired tokens with 401.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user or not user.get("id"):
            return jsonify({
                "status": "error",
                "error": "Authentication required. Valid Bearer token must be provided."
            }), 401
        return f(*args, current_user=user, **kwargs)
    return decorated_function


def optional_auth(f):
    """
    Decorator to allow both authenticated users and guests.
    Passes current_user (dict or None) to the route function.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        return f(*args, current_user=user, **kwargs)
    return decorated_function
