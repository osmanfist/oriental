/**
 * Oriental - Authentication Module
 * Version: 1.2.0
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

function showError(message) {
    const existingError = document.querySelector('.error-message');
    if (existingError) existingError.remove();
    
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

function getErrorMessage(code) {
    const errorMessages = {
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
        'auth/too-many-requests': 'Too many failed attempts. Please try again later',
        'default': 'An error occurred. Please try again.'
    };
    return errorMessages[code] || errorMessages.default;
}

function generateSlug(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Create user document in Firestore after signup
 */
async function createUserDocument(user, name, orgName) {
    try {
        console.log('Creating user document for:', user.uid);
        console.log('Organization name:', orgName);
        
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
        
        const orgId = orgRef.id;
        console.log('Organization created:', orgId);
        
        // Create user document
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
        });
        console.log('User document created');
        
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
        console.log('Default project created');
        
        return orgId;
        
    } catch (error) {
        console.error('Error creating user document:', error);
        throw error;
    }
}

// ============================================
// Email/Password Signup (FIXED)
// ============================================

if (signupBtn) {
    signupBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const orgName = document.getElementById('organization-name').value.trim();
        
        console.log('Signup attempt for:', email);
        
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
            // 1. Create user in Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            console.log('User created in Auth:', user.uid);
            
            // 2. Update user profile with display name
            await user.updateProfile({ displayName: name });
            console.log('Profile updated');
            
            // 3. Create user document, organization, and default project
            await createUserDocument(user, name, orgName);
            console.log('User document created successfully');
            
            // 4. Store user info
            localStorage.setItem('oriental_user', JSON.stringify({
                uid: user.uid,
                email: user.email,
                name: name
            }));
            
            // 5. Redirect to dashboard
            console.log('Redirecting to dashboard...');
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
// Email/Password Login
// ============================================

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

// ============================================
// Google OAuth
// ============================================

const handleGoogleAuth = async () => {
    console.log('Starting Google authentication...');
    
    const btns = [googleLoginBtn, googleSignupBtn];
    btns.forEach(btn => {
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
            btn.disabled = true;
        }
    });
    
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        
        console.log('Google sign-in successful:', user.uid);
        
        let displayName = user.displayName;
        if (!displayName && user.email) {
            displayName = user.email.split('@')[0];
            await user.updateProfile({ displayName: displayName });
        }
        
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            console.log('New Google user, creating organization...');
            const orgName = prompt('Welcome to Oriental! Please enter your organization name:', 'My Team');
            
            if (orgName && orgName.trim()) {
                await createUserDocument(user, displayName, orgName.trim());
            } else {
                await auth.signOut();
                btns.forEach(btn => {
                    if (btn) {
                        btn.innerHTML = '<i class="fab fa-google"></i> Google';
                        btn.disabled = false;
                    }
                });
                return;
            }
        }
        
        localStorage.setItem('oriental_user', JSON.stringify({
            uid: user.uid,
            email: user.email,
            name: displayName
        }));
        
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        console.error('Google auth error:', error);
        btns.forEach(btn => {
            if (btn) {
                btn.innerHTML = '<i class="fab fa-google"></i> Google';
                btn.disabled = false;
            }
        });
        
        if (error.code === 'auth/popup-blocked') {
            showError('Popup was blocked. Please allow popups for this site.');
        } else {
            showError(getErrorMessage(error.code));
        }
    }
};

if (googleLoginBtn) googleLoginBtn.addEventListener('click', handleGoogleAuth);
if (googleSignupBtn) googleSignupBtn.addEventListener('click', handleGoogleAuth);

// ============================================
// Session Management
// ============================================

auth.onAuthStateChanged((user) => {
    if (user && window.location.pathname.includes('login.html')) {
        console.log('User already logged in, redirecting to dashboard...');
        window.location.href = 'dashboard.html';
    }
});

// ============================================
// Debug Exports
// ============================================
if (typeof window !== 'undefined') {
    window.debugAuth = {
        currentUser: () => auth.currentUser,
        isLoggedIn: () => !!auth.currentUser
    };
}