/**
 * Oriental - Authentication Module
 * Version: 1.1.0
 *
 * Handles user registration, login, session management,
 * and Firebase authentication integration.
 *
 * Changes from v1.0.0:
 *  - Removed duplicate JSDoc block on createUserDocument
 *  - Replaced window.prompt() with a proper inline org-name modal
 *  - Removed localStorage writes (Firebase Auth already caches the user)
 *  - Tightened up Google auth: sign-out on cancelled org creation
 */

// ============================================
// DOM Element References
// ============================================
const loginForm      = document.getElementById('login-form');
const signupForm     = document.getElementById('signup-form');
const showSignup     = document.getElementById('show-signup');
const showLogin      = document.getElementById('show-login');
const loginBtn       = document.getElementById('login-btn');
const signupBtn      = document.getElementById('signup-btn');
const googleLoginBtn = document.getElementById('google-login-btn');
const googleSignupBtn = document.getElementById('google-signup-btn');

// ============================================
// UI Toggle Functions
// ============================================

if (showSignup) {
    showSignup.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.remove('active');
        signupForm.classList.add('active');
    });
}

if (showLogin) {
    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.classList.remove('active');
        loginForm.classList.add('active');
    });
}

// ============================================
// Helper Functions
// ============================================

/**
 * Display an error message inside the currently active auth form.
 * Any previous error is removed first; the new one auto-dismisses after 5 s.
 * @param {string} message
 */
function showError(message) {
    const existing = document.querySelector('.error-message');
    if (existing) existing.remove();

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;

    const activeForm = document.querySelector('.auth-form.active');
    if (activeForm) {
        activeForm.insertBefore(errorDiv, activeForm.firstChild);
    }

    setTimeout(() => {
        if (errorDiv.parentNode) errorDiv.remove();
    }, 5000);
}

/**
 * Map a Firebase error code to a user-friendly message.
 * @param {string} code - Firebase error code
 * @returns {string}
 */
function getErrorMessage(code) {
    const messages = {
        'auth/invalid-email':                      'Invalid email address format',
        'auth/user-disabled':                      'This account has been disabled',
        'auth/user-not-found':                     'No account found with this email',
        'auth/wrong-password':                     'Incorrect password',
        'auth/email-already-in-use':               'An account already exists with this email',
        'auth/weak-password':                      'Password should be at least 6 characters',
        'auth/operation-not-allowed':              'Email/password accounts are not enabled',
        'auth/network-request-failed':             'Network error. Please check your connection',
        'auth/popup-closed-by-user':               'Sign-in popup was closed',
        'auth/popup-blocked':                      'Popup was blocked by the browser',
        'auth/unauthorized-domain':                'Domain not authorised for OAuth operations',
        'auth/too-many-requests':                  'Too many failed attempts. Please try again later',
        'auth/account-exists-with-different-credential':
            'An account already exists with this email. Please sign in using your original method.',
    };
    return messages[code] || 'An error occurred. Please try again.';
}

/**
 * Generate a URL-friendly slug from a string.
 * @param {string} text
 * @returns {string}
 */
function generateSlug(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Show a small inline modal that asks the user for an organisation name,
 * then resolves with the trimmed string or null if they cancel.
 *
 * Used during Google sign-in for new users — replaces the browser prompt()
 * which is inaccessible, unstyled, and blocked in many contexts.
 *
 * @returns {Promise<string|null>}
 */
function promptOrgName() {
    return new Promise((resolve) => {
        // Build overlay
        const overlay = document.createElement('div');
        overlay.style.cssText =
            'position:fixed;inset:0;background:rgba(0,0,0,.45);' +
            'display:flex;align-items:center;justify-content:center;z-index:9999;';

        overlay.innerHTML = `
            <div style="background:#fff;border-radius:1rem;padding:2rem;width:100%;max-width:400px;box-shadow:0 20px 40px rgba(0,0,0,.2);">
                <h3 style="margin:0 0 .5rem;font-size:1.25rem;">Welcome to Oriental!</h3>
                <p style="margin:0 0 1.25rem;color:#6b7280;font-size:.9rem;">
                    Enter a name for your team's workspace to get started.
                </p>
                <input
                    id="org-name-input"
                    type="text"
                    placeholder="e.g. Acme Inc"
                    style="width:100%;padding:.75rem 1rem;border:2px solid #e5e7eb;border-radius:.5rem;
                           font-size:1rem;font-family:inherit;box-sizing:border-box;margin-bottom:1rem;"
                    autocomplete="organization"
                />
                <div style="display:flex;gap:.75rem;justify-content:flex-end;">
                    <button id="org-cancel-btn"
                        style="padding:.6rem 1.25rem;border:2px solid #e5e7eb;border-radius:.5rem;
                               background:#fff;cursor:pointer;font-size:.9rem;font-family:inherit;">
                        Cancel
                    </button>
                    <button id="org-confirm-btn"
                        style="padding:.6rem 1.25rem;background:#4f46e5;color:#fff;border:none;
                               border-radius:.5rem;cursor:pointer;font-size:.9rem;font-weight:600;
                               font-family:inherit;">
                        Create workspace
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const input      = overlay.querySelector('#org-name-input');
        const cancelBtn  = overlay.querySelector('#org-cancel-btn');
        const confirmBtn = overlay.querySelector('#org-confirm-btn');

        // Auto-focus so the user can start typing immediately
        setTimeout(() => input.focus(), 50);

        const finish = (value) => {
            overlay.remove();
            resolve(value);
        };

        confirmBtn.addEventListener('click', () => {
            const val = input.value.trim();
            if (!val) {
                input.style.borderColor = '#ef4444';
                input.focus();
                return;
            }
            finish(val);
        });

        cancelBtn.addEventListener('click', () => finish(null));

        // Allow Enter key to confirm
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') confirmBtn.click();
            if (e.key === 'Escape') finish(null);
        });
    });
}

/**
 * Create (or update) the user document in Firestore after sign-up.
 * Also creates a default organisation and starter project for new users.
 *
 * @param {import('firebase/auth').User} user - Firebase user object
 * @param {string} name        - User's display name
 * @param {string} orgName     - Organisation name
 * @returns {Promise<string>}  - The organisation ID
 */
async function createUserDocument(user, name, orgName) {
    try {
        console.log('Creating user document for:', user.uid);

        // Check whether the user already belongs to an organisation
        const existingOrgs = await db.collection('organizations')
            .where('members', 'array-contains', user.uid)
            .get();

        let orgId;

        if (!existingOrgs.empty) {
            orgId = existingOrgs.docs[0].id;
            console.log('Found existing organisation:', orgId);
        } else {
            // Create a new organisation
            const orgRef = await db.collection('organizations').add({
                name:      orgName,
                slug:      generateSlug(orgName),
                createdBy: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                members:   [user.uid],
                settings: {
                    defaultView: 'board',
                    theme:       'light',
                },
            });
            orgId = orgRef.id;
            console.log('Created organisation:', orgId);

            // Seed a starter project so the dashboard isn't empty
            await db.collection('projects').add({
                name:           'Getting Started',
                description:    'Welcome to Oriental! This is your first project.',
                organizationId: orgId,
                createdBy:      user.uid,
                createdAt:      firebase.firestore.FieldValue.serverTimestamp(),
                isArchived:     false,
                color:          '#6366f1',
            });
            console.log('Created default project');
        }

        // Create or update the user document
        // merge:true means existing fields (e.g. preferences) are preserved
        await db.collection('users').doc(user.uid).set({
            name,
            email:               user.email,
            currentOrganization: orgId,
            organizations:       [orgId],
            createdAt:           firebase.firestore.FieldValue.serverTimestamp(),
            preferences: {
                notifications: true,
                emailDigest:   'daily',
            },
        }, { merge: true });

        console.log('User document saved');
        return orgId;

    } catch (error) {
        console.error('Error creating user document:', error);
        throw error;
    }
}

// ============================================
// Email / Password Authentication
// ============================================

if (loginBtn) {
    loginBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const email    = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            showError('Please fill in all fields');
            return;
        }

        const originalText  = loginBtn.innerHTML;
        loginBtn.innerHTML  = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
        loginBtn.disabled   = true;

        try {
            await auth.signInWithEmailAndPassword(email, password);
            // onAuthStateChanged in auth.js will handle the redirect
        } catch (error) {
            console.error('Login error:', error);
            showError(getErrorMessage(error.code));
            loginBtn.innerHTML = originalText;
            loginBtn.disabled  = false;
        }
    });
}

if (signupBtn) {
    signupBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const name    = document.getElementById('signup-name').value.trim();
        const email   = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const orgName  = document.getElementById('organization-name').value.trim();

        if (!name || !email || !password || !orgName) {
            showError('Please fill in all fields');
            return;
        }

        if (password.length < 6) {
            showError('Password must be at least 6 characters');
            return;
        }

        const originalText   = signupBtn.innerHTML;
        signupBtn.innerHTML  = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
        signupBtn.disabled   = true;

        try {
            const { user } = await auth.createUserWithEmailAndPassword(email, password);
            await user.updateProfile({ displayName: name });
            await createUserDocument(user, name, orgName);
            window.location.href = 'dashboard.html';
        } catch (error) {
            console.error('Signup error:', error);
            showError(getErrorMessage(error.code));
            signupBtn.innerHTML = originalText;
            signupBtn.disabled  = false;
        }
    });
}

// ============================================
// Google OAuth Authentication
// ============================================

/**
 * Shared handler for both Google login and Google sign-up buttons.
 * For brand-new users, shows an inline modal to collect the org name
 * instead of the inaccessible browser prompt().
 */
const handleGoogleAuth = async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
        const { user } = await auth.signInWithPopup(provider);
        console.log('Google sign-in successful:', user.uid);

        // Ensure display name is set
        let displayName = user.displayName;
        if (!displayName && user.email) {
            displayName = user.email.split('@')[0];
            await user.updateProfile({ displayName });
        }

        // Check whether this user already has a Firestore document
        const userDoc = await db.collection('users').doc(user.uid).get();

        if (!userDoc.exists) {
            console.log('New user — collecting organisation name');

            // Use our custom modal instead of window.prompt()
            const orgName = await promptOrgName();

            if (!orgName) {
                // User cancelled — sign them out and stay on login page
                await auth.signOut();
                return;
            }

            await createUserDocument(user, displayName, orgName);
        } else {
            console.log('Existing user:', userDoc.data().currentOrganization);
        }

        window.location.href = 'dashboard.html';

    } catch (error) {
        console.error('Google auth error:', error);
        showError(getErrorMessage(error.code));
    }
};

if (googleLoginBtn)  googleLoginBtn.addEventListener('click', handleGoogleAuth);
if (googleSignupBtn) googleSignupBtn.addEventListener('click', handleGoogleAuth);

// ============================================
// Session Management
// ============================================

/**
 * If the user is already authenticated when they land on the login page,
 * skip straight to the dashboard.
 */
auth.onAuthStateChanged((user) => {
    if (user && window.location.pathname.includes('login.html')) {
        console.log('Already signed in — redirecting to dashboard');
        window.location.href = 'dashboard.html';
    }
});

// ============================================
// Debug helpers (stripped in production builds)
// ============================================
if (typeof window !== 'undefined') {
    window.debugAuth = {
        currentUser: () => auth.currentUser,
        isLoggedIn:  () => !!auth.currentUser,
    };
}
