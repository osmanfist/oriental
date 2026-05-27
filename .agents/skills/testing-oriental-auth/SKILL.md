# Testing Oriental Authentication Module

## Overview
Oriental is a static HTML/JS task management app using Firebase Auth + Firestore. There is no build step, no test framework, and no CI configured.

## Local Dev Server
```bash
cd /home/ubuntu/repos/oriental
python3 -m http.server 8080
```
App is then available at `http://localhost:8080/login.html` and `http://localhost:8080/dashboard.html`.

## Testing Approach
Since there's no live Firebase backend available, tests use **Playwright with Firebase stubs**:

1. Create a standalone test HTML page (e.g., `/tmp/test-auth.html`) with:
   - Minimal DOM elements required by `auth.js` (form divs, buttons)
   - Firebase stub objects (`window.firebase`, `window.auth`, `window.db`)
   - Test infrastructure (`_testLog`, `_firestoreWrites`, `_signOutCalled`, `_redirectTarget`)

2. Create a test copy of the JS file under test:
   - Copy the source file (e.g., `js/auth.js`) to `/tmp/auth-under-test.js`
   - Replace `window.location.href = X` with `window._navigateTo(X)` to intercept redirects:
     ```bash
     cp js/auth.js /tmp/auth-under-test.js
     sed -i "s|window\.location\.href = \(.*\);|window._navigateTo(\1);|g" /tmp/auth-under-test.js
     ```
   - This is necessary because `window.location.href` cannot be redefined via `Object.defineProperty` due to browser security

3. Serve test files via a separate HTTP server:
   ```bash
   python3 -m http.server 8081 --directory /tmp &
   ```

4. Run Playwright tests against `http://localhost:8081/test-auth.html`

## Key Patterns

### Firebase Auth Stub
```javascript
window.auth = {
    signInWithPopup: async function(provider) { /* return mock user */ },
    onAuthStateChanged: function(cb) { _authCallbacks.push(cb); },
    signOut: async function() { window._signOutCalled = true; }
};
```

### Firestore Stub
```javascript
window.db = {
    collection: function(name) {
        return {
            doc: function(id) {
                return {
                    get: function() { return Promise.resolve({ exists: config.userExists }); },
                    set: function(data) { /* track writes */ }
                };
            },
            add: function(data) { /* track writes with optional delay */ }
        };
    }
};
```

### Simulating Race Conditions
To test auth race conditions, fire `onAuthStateChanged` callbacks inside `signInWithPopup` before it returns:
```javascript
signInWithPopup: async function(provider) {
    const user = { uid: '...', email: '...' };
    _authCallbacks.forEach(cb => cb(user));  // Fire immediately = race
    return { user: user };
}
```

### Verifying Behavior via Log Ordering
Since `let` variables in auth.js aren't accessible via `window.`, verify behavior through log entry ordering rather than flag values:
```python
log = state['log']
redirect_idx = next((i for i, e in enumerate(log) if 'REDIRECT' in e), -1)
write_idx = next((i for i, e in enumerate(log) if 'Firestore set' in e), -1)
assert redirect_idx > write_idx  # Redirect must come after write
```

## Known Issues
- `window.location.href` cannot be overridden via `Object.defineProperty` — use the `_navigateTo` wrapper approach
- `add_init_script` stubs get overwritten when CDN Firebase scripts load — use a standalone test page instead
- Variables declared with `let` in auth.js are not accessible as `window.varName` — verify behavior through side effects

## Devin Secrets Needed
None — testing uses Firebase stubs, no live credentials required.

For live Firebase testing, would need:
- Firebase project credentials (API key, project ID)
- A Google OAuth test account
