/**
 * Oriental v3.0 - Login Page Logic
 * Offline-first authentication
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize local database
    await localDB.init();
    
    // Initialize offline auth
    await offlineAuth.init();
    
    // Initialize network manager
    networkManager.init();
    
    // Setup UI
    setupTabs();
    setupForms();
    setupGoogleAuth();
    setupNetworkListeners();
    
    // Show dashboard link if already logged in
    checkExistingAuth();
    
    console.log('🚀 Oriental Login Ready');
});

// Tab Switching
function setupTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            document.getElementById(`${tabName}-form`).classList.add('active');
            
            clearErrors();
            hideStatus();
        });
    });
}

// Form Setup
function setupForms() {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleLogin();
    });

    document.getElementById('signup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleSignup();
    });
}

// Handle Login
async function handleLogin() {
    clearErrors();
    hideStatus();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');
    
    if (!email) { showError('login-email-error', 'Please enter your email'); return; }
    if (!password) { showError('login-password-error', 'Please enter your password'); return; }

    setButtonLoading(btn, true);

    try {
        const result = await auth.signInWithEmailAndPassword(email, password);
        
        if (result.user) {
            showStatus('Login successful! Redirecting...', 'success');
            sessionStorage.setItem('oriental_just_logged_in', 'true');
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
        }
    } catch (firebaseError) {
        try {
            const offlineResult = await offlineAuth.login(email, password);
            
            if (offlineResult.success) {
                showStatus('Signed in offline! Redirecting...', 'success');
                sessionStorage.setItem('oriental_just_logged_in', 'true');
                setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
            } else {
                showStatus(firebaseError.message || 'Login failed', 'error');
            }
        } catch (e) {
            showStatus('Login failed. Please check your credentials.', 'error');
        }
    } finally {
        setButtonLoading(btn, false);
    }
}

// Handle Signup
async function handleSignup() {
    clearErrors();
    hideStatus();
    
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    const btn = document.getElementById('signup-btn');
    
    if (!name) { showError('signup-name-error', 'Please enter your name'); return; }
    if (!email) { showError('signup-email-error', 'Please enter your email'); return; }
    if (password.length < 6) { showError('signup-password-error', 'Password must be at least 6 characters'); return; }
    if (password !== confirm) { showError('signup-confirm-error', 'Passwords do not match'); return; }
    if (!navigator.onLine) { showStatus('Signup requires internet connection.', 'error'); return; }

    setButtonLoading(btn, true);

    try {
        const result = await auth.createUserWithEmailAndPassword(email, password);
        await result.user.updateProfile({ displayName: name });
        
        await db.collection('users').doc(result.user.uid).set({
            name, email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            organizations: [],
            currentOrganization: null,
            preferences: {
                theme: 'system', language: 'en',
                notifications: { email: true, taskAssigned: true, commentMention: true }
            }
        });

        showStatus('Account created! Redirecting...', 'success');
        sessionStorage.setItem('oriental_just_logged_in', 'true');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
    } catch (error) {
        showStatus(error.message || 'Signup failed', 'error');
    } finally {
        setButtonLoading(btn, false);
    }
}

// Google Auth
function setupGoogleAuth() {
    document.getElementById('google-btn').addEventListener('click', handleGoogleLogin);
    document.getElementById('google-signup-btn').addEventListener('click', handleGoogleLogin);
}

async function handleGoogleLogin() {
    if (!navigator.onLine) {
        showStatus('Google sign-in requires internet connection.', 'error');
        return;
    }

    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        
        if (result.user) {
            showStatus('Login successful!', 'success');
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 500);
        }
    } catch (error) {
        if (error.code !== 'auth/popup-closed-by-user') {
            showStatus('Google sign-in failed.', 'error');
        }
    }
}

// Network Listeners
function setupNetworkListeners() {
    networkManager.subscribe((status) => {
        const offlineBar = document.getElementById('offline-bar');
        const offlineNotice = document.getElementById('offline-notice');
        
        if (!status.isOnline) {
            offlineBar?.classList.add('show');
            offlineNotice?.classList.add('show');
        } else {
            offlineBar?.classList.remove('show');
            offlineNotice?.classList.remove('show');
        }
    });
    
    if (!navigator.onLine) {
        document.getElementById('offline-bar')?.classList.add('show');
        document.getElementById('offline-notice')?.classList.add('show');
    }
}

// Check Existing Auth
async function checkExistingAuth() {
    const user = offlineAuth.getCurrentUser() || auth.currentUser;
    if (user) {
        const el = document.getElementById('already-logged-in');
        const emailEl = document.getElementById('logged-in-email');
        if (el) el.style.display = 'block';
        if (emailEl) emailEl.textContent = user.email;
    }
}

// Helper Functions
function setButtonLoading(btn, isLoading) {
    if (isLoading) {
        btn.classList.add('loading');
        btn.disabled = true;
    } else {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

function showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.classList.add('show');
    }
}

function clearErrors() {
    document.querySelectorAll('.error-message').forEach(el => {
        el.textContent = '';
        el.classList.remove('show');
    });
}

function showStatus(message, type) {
    const el = document.getElementById('status-message');
    el.textContent = message;
    el.className = `status-message ${type} show`;
    if (type === 'success' || type === 'info') {
        setTimeout(() => el.classList.remove('show'), 3000);
    }
}

function hideStatus() {
    document.getElementById('status-message').classList.remove('show');
}

function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);
    const isPassword = input.type === 'password';
    
    input.type = isPassword ? 'text' : 'password';
    
    button.innerHTML = isPassword ? 
        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>` :
        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        </svg>`;
}