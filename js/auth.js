/**
 * Oriental - Authentication Module
 * Version: 1.1.0
 * 
 * Handles user registration, login, session management,
 * and Firebase authentication integration.
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
    if (activeForm) {
        activeForm.insertBefore(errorDiv, activeForm.firstChild);
    }
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

/**
 * Convert Firebase error code to user-friendly message
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
        'auth/popup-blocked': 'Popup was blocked by browser. Please allow popups for this site.',
        'auth/unauthorized-domain': 'Domain not authorized for OAuth operations',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later',
        
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

/**
 * Create user document in Firestore after signup
 * @param {Object} user - Firebase user object
 * @param {string} name - User's display name
 * @param {string} orgName - Organization name
 * @returns {Promise<string>} Organization ID
 */
async function createUserDocument(user, name, orgName) {
    try {
        console.log('Creating user document for:', user.uid);
        
        // Check if user already has an organization
        const existingOrgs = await db.collection('organizations')
            .where('members', 'array-contains', user.uid)
            .get();
        
        let orgId;
        
        if (!existingOrgs.empty) {
            orgId = existingOrgs.docs[0].id;
            console.log('Found existing organization:', orgId);
        } else {
            // Create new organization
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
            orgId = orgRef.id;
            console.log('Created new organization:', orgId);
            
            // Create default project
            await db.collection('projects').add({
                name: 'Getting Started',
                description: 'Welcome to Oriental! This is your first project.',
                organizationId: orgId,
                createdBy: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                isArchived: false,
                color: '#16a34a'
            });
            console.log('Created default project');
        }
        
        // Create or update user document
        await db.collection('users').doc(user.uid).set({
            name: name,
            email: user.email,
            currentOrganization: orgId,
            organizations: [orgId],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            preferences: {
                notifications: true,
                emailDigest: 'daily'
            }
        }, { merge: true });
        
        console.log('User document saved');
        return orgId;
        
    } catch (error) {
        console.error('Error creating user document:', error);
        throw error;
    }
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
        
        if (!email || !password) {
            showError('Please fill in all fields');
            return;
        }
        
        const originalText = loginBtn.innerHTML;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
        loginBtn.disabled = true;
        
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            localStorage.setItem('oriental_user', JSON.stringify({
                uid: userCredential.user.uid,
                email: userCredential.user.email,
                name: userCredential.user.displayName
            }));
            window.location.href = 'dashboard.html';
        } catch (error) {
            console.error('Login error:', error);
            showError(getErrorMessage(error.code));
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
        
        if (!name || !email || !password || !orgName) {
            showError('Please fill in all fields');
            return;
        }
        
        if (password.length < 6) {
            showError('Password must be at least 6 characters');
            return;
        }
        
        const originalText = signupBtn.innerHTML;
        signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
        signupBtn.disabled = true;
        
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            await user.updateProfile({ displayName: name });
            await createUserDocument(user, name, orgName);
            
            localStorage.setItem('oriental_user', JSON.stringify({
                uid: user.uid,
                email: user.email,
                name: name
            }));
            
            window.location.href = 'dashboard.html';
        } catch (error) {
            console.error('Signup error:', error);
            showError(getErrorMessage(error.code));
            signupBtn.innerHTML = originalText;
            signupBtn.disabled = false;
        }
    });
}

// ============================================
// Google OAuth Authentication
// ============================================

/**
 * Handle Google authentication (reusable for both buttons)
 */
const handleGoogleAuth = async () => {
    console.log('Starting Google authentication...');
    
    // Show loading state
    const btns = [googleLoginBtn, googleSignupBtn];
    btns.forEach(btn => {
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting to Google...';
            btn.disabled = true;
        }
    });
    
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        
        console.log('Opening Google popup...');
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        
        console.log('Google sign-in successful:', user.uid);
        
        // Ensure display name is set
        let displayName = user.displayName;
        if (!displayName && user.email) {
            displayName = user.email.split('@')[0];
            await user.updateProfile({ displayName: displayName });
        }
        
        // Check if user document exists in Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            console.log('New user, creating organization...');
            const orgName = prompt('Welcome to Oriental! Please enter your organization name:', 'My Team');
            
            if (orgName && orgName.trim()) {
                await createUserDocument(user, displayName, orgName.trim());
            } else {
                console.log('User cancelled organization creation');
                await auth.signOut();
                // Reset buttons
                btns.forEach(btn => {
                    if (btn) {
                        btn.innerHTML = '<i class="fab fa-google"></i> Google';
                        btn.disabled = false;
                    }
                });
                return;
            }
        } else {
            console.log('Existing user found');
            const userData = userDoc.data();
            if (userData.currentOrganization) {
                console.log('User belongs to organization:', userData.currentOrganization);
            }
        }
        
        // Store user info
        localStorage.setItem('oriental_user', JSON.stringify({
            uid: user.uid,
            email: user.email,
            name: displayName
        }));
        
        console.log('Redirecting to dashboard...');
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        console.error('Google auth error:', error);
        
        // Reset buttons
        const btns = [googleLoginBtn, googleSignupBtn];
        btns.forEach(btn => {
            if (btn) {
                btn.innerHTML = '<i class="fab fa-google"></i> Google';
                btn.disabled = false;
            }
        });
        
        // Handle specific errors
        if (error.code === 'auth/popup-blocked') {
            showError('Popup was blocked by your browser. Please allow popups for this site and try again.');
        } else if (error.code === 'auth/popup-closed-by-user') {
            showError('Sign in popup was closed. Please try again.');
        } else if (error.code === 'auth/account-exists-with-different-credential') {
            showError('An account already exists with this email. Please sign in using your existing method.');
        } else if (error.code === 'auth/unauthorized-domain') {
            showError('This domain is not authorized for Google sign-in. Contact the administrator.');
        } else {
            showError(getErrorMessage(error.code));
        }
    }
};

// Attach Google auth handlers
if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleGoogleAuth();
    });
}

if (googleSignupBtn) {
    googleSignupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleGoogleAuth();
    });
}

// ============================================
// Session Management
// ============================================

/**
 * Check authentication state on page load
 * Redirect to dashboard if already logged in
 */
auth.onAuthStateChanged((user) => {
    if (user && window.location.pathname.includes('login.html')) {
        console.log('User already logged in, redirecting to dashboard...');
        window.location.href = 'dashboard.html';
    }
});

// ============================================
// Export for debugging (optional)
// ============================================
if (typeof window !== 'undefined') {
    window.debugAuth = {
        currentUser: () => auth.currentUser,
        isLoggedIn: () => !!auth.currentUser
    };
}