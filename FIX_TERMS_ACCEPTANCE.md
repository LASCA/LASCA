# Fix: "No connection to server" ERROR ON TERMS ACCEPTANCE

## Problem
When a new Clerk-authenticated user tries to accept the Terms of Use by clicking "Αποδοχή και συνέχεια" (Accept and Continue), the request fails with "No connection to server" error because:

1. The frontend was not calling any `acceptTerms` function
2. The `acceptTerms` function was not defined in AuthContext
3. The backend `/api/me/accept-terms` endpoint only supported Flask-Login authentication (using `@login_required`), not Clerk's Bearer token authentication

## Solution

### 1. Frontend Changes (`frontend/src/auth/AuthContext.jsx`)

**Added `acceptTerms` function:**
```javascript
const acceptTerms = useCallback(async () => {
  const token = await getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const { data } = await axios.post(`${API_BASE_URL}/api/me/accept-terms`, { accept: true }, { headers });
  setUser(data);
  return data;
}, [getToken]);
```

**Key changes:**
- Explicitly extracts the Clerk Bearer token via `getToken()`
- Constructs Authorization header with proper `Bearer ${token}` format
- Makes POST request to `/api/me/accept-terms` with the header
- Updates local user state with response data

**Added `acceptTerms` to context value:**
- Included in the `useMemo` dependencies and object so it's accessible to components via `useAuth().acceptTerms`
- Added to dependency arrays: `[user, loading, refresh, acceptTerms, config]`

**Fixed other Bearer token headers:**
- Ensured all other Authorization headers use proper template literal format: `` `Bearer ${token}` ``

### 2. Backend Changes (`code/auth_security.py`)

**Removed `@login_required` decorator from `/api/me/accept-terms`:**
- The decorator enforced Flask-Login session authentication only
- Clerk uses JWT Bearer token authentication (stateless)

**Added Clerk Bearer token support:**
```python
# Try to get user from Clerk Bearer token (new auth method)
user = None
auth_header = request.headers.get('Authorization', '')
if auth_header.startswith('Bearer '):
    token_str = auth_header[7:].strip()
    claims, error = verify_clerk_token(token_str)
    if not error:
        clerk_user_id = claims.get('sub')
        if clerk_user_id:
            user = A.User.query.filter_by(clerk_user_id=clerk_user_id).first()
            # ... create user if first login
```

**Maintained Flask-Login fallback:**
```python
# Fallback to Flask-Login (old auth method)
if not user and current_user.is_authenticated:
    user = current_user._get_current_object()
```

**Key features:**
- Extracts Bearer token from Authorization header
- Verifies token using `verify_clerk_token()` from `clerk_auth.py`
- Finds or creates user based on Clerk user ID
- Supports both new Clerk auth and legacy Flask-Login auth
- Returns 401 Unauthorized if no valid auth provided

## Files Modified

1. **`frontend/src/auth/AuthContext.jsx`**
   - Added `acceptTerms` callback function
   - Added `acceptTerms` to context value
   - Fixed Bearer token headers in `refresh` and axios interceptor

2. **`code/auth_security.py`**
   - Modified `/api/me/accept-terms` endpoint (line 1443+)
   - Removed `@login_required` decorator
   - Added Clerk Bearer token authentication support
   - Maintained Flask-Login fallback

## Testing

After these changes:
1. New Clerk users can successfully accept Terms of Use
2. The POST request to `/api/me/accept-terms` now receives proper `Authorization: Bearer <token>` header
3. The endpoint authenticates against Clerk JWT token
4. Legacy Flask-Login users still work (backward compatible)
5. User state is properly updated after acceptance

## CORS Notes

Existing CORS configuration should allow:
- POST requests from `http://localhost:5173` (dev frontend)
- Credentials are sent via `axios.defaults.withCredentials = true`
- The endpoint follows standard HTTP authentication patterns
