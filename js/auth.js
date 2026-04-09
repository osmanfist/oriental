/**
 * Oriental - Authentication Module
 * Version: 1.0.0
 * 
 * Handles user registration, login, and session management
 */

// ============================================
// DOM Element References
// ============================================
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignup = document.getElementById('show-signup');
const showLogin = document.getElementById('show-login');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const googleLoginBtn = document.getElementById('google-login-btn');
const googleSignupBtn = document.getElementById('google-signup-btn');

// Flag to prevent onAuthStateChanged from redirecting during Google auth flow
let isGoogleAuthInProgress = false;

// ============================================
// UI Toggle Functions
// ============================================

/**
 * Toggle between login and signup forms
 */
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
// Email/Password Authentication
// ============================================

/**
 * Handle email/password login
 */
if (loginBtn) {
    loginBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        
        // Validate input
        if (!email || !password) {
            showError('Please fill in all fields');
            return;
        }
        
        // Show loading state
        const originalText = loginBtn.innerHTML;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
        loginBtn.disabled = true;
        
        try {
            // Attempt sign in
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Store user info in localStorage for quick access
            localStorage.setItem('oriental_user', JSON.stringify({
                uid: user.uid,
                email: user.email,
                name: user.displayName
            }));
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
            
        } catch (error) {
            console.error('Login error:', error);
            showError(getErrorMessage(error.code));
            
            // Reset button
            loginBtn.innerHTML = originalText;
            loginBtn.disabled = false;
        }
    });
}

/**
 * Handle email/password signup
 */
if (signupBtn) {
    signupBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const orgName = document.getElementById('organization-name').value.trim();
        
        // Validate input
        if (!name || !email || !password || !orgName) {
            showError('Please fill in all fields');
            return;
        }
        
        if (password.length < 6) {
            showError('Password must be at least 6 characters');
            return;
        }
        
        // Show loading state
        const originalText = signupBtn.innerHTML;
        signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
        signupBtn.disabled = true;
        
        try {
            // 1. Create user in Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // 2. Update user profile with display name
            await user.updateProfile({ displayName: name });
            
            // 3. Create organization document
            const orgRef = await db.collection('organizations').add({
                name: orgName,
                slug: generateSlug(orgName),
                createdBy: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                members: [user.uid],
                settings: {
                    defaultView: 'board',
                    theme: 'light'
                }
            });
            
            // 4. Create user document
            await db.collection('users').doc(user.uid).set({
                name: name,
                email: email,
                currentOrganization: orgRef.id,
                organizations: [orgRef.id],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                preferences: {
                    notifications: true,
                    emailDigest: 'daily'
                }
            });
            
            // 5. Create default project
            await db.collection('projects').add({
                name: 'Getting Started',
                description: 'Welcome to Oriental! This is your first project.',
                organizationId: orgRef.id,
                createdBy: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                isArchived: false,
                color: '#6366f1'
            });
            
            // 6. Store user info
            localStorage.setItem('oriental_user', JSON.stringify({
                uid: user.uid,
                email: user.email,
                name: name
            }));
            
            // 7. Redirect to dashboard
            window.location.href = 'dashboard.html';
            
        } catch (error) {
            console.error('Signup error:', error);
            showError(getErrorMessage(error.code));
            
            // Reset button
            signupBtn.innerHTML = originalText;
            signupBtn.disabled = false;
        }
    });
}

// ============================================
// Google OAuth Authentication
// ============================================

/**
 * Handle Google login (reusable for both buttons)
 */
const handleGoogleAuth = async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({
        prompt: 'select_account'
    });
    
    // Prevent onAuthStateChanged from redirecting before we finish setup
    isGoogleAuthInProgress = true;
    
    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        
        // Check if user document exists
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            // New user - need to create organization
            const orgName = prompt('Welcome! Please enter your organization name:', 'My Team');
            
            if (orgName) {
                // Create organization
                const orgRef = await db.collection('organizations').add({
                    name: orgName,
                    slug: generateSlug(orgName),
                    createdBy: user.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    members: [user.uid],
                    settings: {
                        defaultView: 'board',
                        theme: 'light'
                    }
                });
                
                // Create user document
                await db.collection('users').doc(user.uid).set({
                    name: user.displayName,
                    email: user.email,
                    currentOrganization: orgRef.id,
                    organizations: [orgRef.id],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    preferences: {
                        notifications: true,
                        emailDigest: 'daily'
                    }
                });
                
                // Create default project
                await db.collection('projects').add({
                    name: 'Getting Started',
                    description: 'Welcome to Oriental! This is your first project.',
                    organizationId: orgRef.id,
                    createdBy: user.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    isArchived: false,
                    color: '#6366f1'
                });
            } else {
                // User cancelled - sign out and reset flag
                isGoogleAuthInProgress = false;
                await auth.signOut();
                return;
            }
        }
        
        // Store user info
        localStorage.setItem('oriental_user', JSON.stringify({
            uid: user.uid,
            email: user.email,
            name: user.displayName
        }));
        
        // Setup complete, allow future auth state changes to redirect
        isGoogleAuthInProgress = false;
        
        // Redirect to dashboard
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        isGoogleAuthInProgress = false;
        console.error('Google auth error:', error);
        showError(getErrorMessage(error.code));
    }
};

if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', handleGoogleAuth);
}

if (googleSignupBtn) {
    googleSignupBtn.addEventListener('click', handleGoogleAuth);
}

// ============================================
// Helper Functions
// ============================================

/**
 * Display error message to user
 * @param {string} message - Error message to display
 */
function showError(message) {
    // Remove any existing error messages
    const existingError = document.querySelector('.error-message');
    if (existingError) existingError.remove();
    
    // Create new error element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    // Insert at top of active form
    const activeForm = document.querySelector('.auth-form.active');
    activeForm.insertBefore(errorDiv, activeForm.firstChild);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

/**
 * Convert error code to user-friendly message
 * @param {string} code - Firebase error code
 * @returns {string} User-friendly error message
 */
function getErrorMessage(code) {
    const errorMessages = {
        // Auth errors
        'auth/invalid-email': 'Invalid email address format',
        'auth/user-disabled': 'This account has been disabled',
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/email-already-in-use': 'An account already exists with this email',
        'auth/weak-password': 'Password should be at least 6 characters',
        'auth/operation-not-allowed': 'Email/password accounts are not enabled',
        'auth/network-request-failed': 'Network error. Please check your connection',
        'auth/popup-closed-by-user': 'Sign in popup was closed',
        'auth/popup-blocked': 'Popup was blocked by browser',
        'auth/unauthorized-domain': 'Domain not authorized for OAuth operations',
        
        // Default fallback
        'default': 'An error occurred. Please try again.'
    };
    
    return errorMessages[code] || errorMessages.default;
}

/**
 * Generate URL-friendly slug from string
 * @param {string} text - Text to convert to slug
 * @returns {string} URL-friendly slug
 */
function generateSlug(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

// ============================================
// Session Management
// ============================================

/**
 * Check authentication state on page load
 * Redirect to dashboard if already logged in
 */
auth.onAuthStateChanged((user) => {
    if (user && window.location.pathname.includes('login.html') && !isGoogleAuthInProgress) {
        // User is logged in but on login page, redirect to dashboard
        // Skip redirect if Google auth is in progress (it handles its own redirect
        // after creating the user document)
        window.location.href = 'dashboard.html';
    }
});
