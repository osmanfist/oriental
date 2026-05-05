/**
 * Oriental - Login Page
 * Version: 2.1.0
 * Fixed: Form submission redirect, Enter key handling, validation
 */

let currentForm = 'signin';

document.addEventListener('DOMContentLoaded', () => {
    
    // ============================================
    // FORM TOGGLE (Sign In / Sign Up)
    // ============================================
    const toggleLink = document.getElementById('toggle-auth-link');
    const toggleText = document.getElementById('toggle-text');
    
    if (toggleLink) {
        toggleLink.addEventListener('click', (e) => {
            e.preventDefault();
            
            if (currentForm === 'signin') {
                document.getElementById('signin-form').classList.remove('active');
                document.getElementById('signup-form').classList.add('active');
                toggleText.textContent = 'Already have an account?';
                toggleLink.textContent = 'Sign In';
                currentForm = 'signup';
                // Clear any errors
                document.getElementById('signup-error').style.display = 'none';
            } else {
                document.getElementById('signup-form').classList.remove('active');
                document.getElementById('signin-form').classList.add('active');
                toggleText.textContent = "Don't have an account?";
                toggleLink.textContent = 'Sign Up';
                currentForm = 'signin';
                // Clear any errors
                document.getElementById('login-error').style.display = 'none';
            }
        });
    }

    // ============================================
    // PASSWORD VISIBILITY TOGGLE
    // ============================================
    document.querySelectorAll('.password-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent any form interaction
            const input = btn.parentElement.querySelector('input');
            const icon = btn.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye';
            }
        });
    });

    // ============================================
    // SIGN IN - Button Click Handler
    // ============================================
    const loginSubmitBtn = document.getElementById('login-submit-btn');
    if (loginSubmitBtn) {
        loginSubmitBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await handleSignIn();
        });
    }

    // ============================================
    // SIGN UP - Button Click Handler
    // ============================================
    const signupSubmitBtn = document.getElementById('signup-submit-btn');
    if (signupSubmitBtn) {
        signupSubmitBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await handleSignUp();
        });
    }

    // ============================================
    // ENTER KEY HANDLING
    // ============================================
    document.getElementById('login-password')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSignIn();
        }
    });

    document.getElementById('login-email')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('login-password')?.focus();
        }
    });

    document.getElementById('signup-name')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('signup-email')?.focus();
        }
    });

    document.getElementById('signup-email')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('signup-password')?.focus();
        }
    });

    document.getElementById('signup-password')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSignUp();
        }
    });

    // ============================================
    // GOOGLE SIGN IN
    // ============================================
    document.getElementById('google-signin-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        googleSignIn();
    });
    
    document.getElementById('google-signup-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        googleSignIn();
    });

    // ============================================
    // PREVENT FORM SUBMISSION
    // ============================================
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            return false;
        });
    });
});

// ============================================
// SIGN IN HANDLER
// ============================================
async function handleSignIn() {
    const email = document.getElementById('login-email')?.value?.trim();
    const password = document.getElementById('login-password')?.value;
    const submitBtn = document.getElementById('login-submit-btn');
    const errorEl = document.getElementById('login-error');
    
    // Validation
    if (!email) {
        showLoginError(errorEl, 'Please enter your email address.');
        return;
    }
    if (!password) {
        showLoginError(errorEl, 'Please enter your password.');
        return;
    }
    if (!email.includes('@')) {
        showLoginError(errorEl, 'Please enter a valid email address.');
        return;
    }
    
    // Loading state
    setButtonLoading(submitBtn, 'Signing in...');
    hideError(errorEl);
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        window.location.href = 'dashboard.html';
    } catch (error) {
        showLoginError(errorEl, getErrorMessage(error.code));
        resetButton(submitBtn, '<i class="fas fa-sign-in-alt"></i> Sign In');
    }
}

// ============================================
// SIGN UP HANDLER
// ============================================
async function handleSignUp() {
    const name = document.getElementById('signup-name')?.value?.trim();
    const email = document.getElementById('signup-email')?.value?.trim();
    const password = document.getElementById('signup-password')?.value;
    const submitBtn = document.getElementById('signup-submit-btn');
    const errorEl = document.getElementById('signup-error');
    
    // Validation
    if (!name) {
        showLoginError(errorEl, 'Please enter your full name.');
        return;
    }
    if (!email) {
        showLoginError(errorEl, 'Please enter your email address.');
        return;
    }
    if (!email.includes('@')) {
        showLoginError(errorEl, 'Please enter a valid email address.');
        return;
    }
    if (!password) {
        showLoginError(errorEl, 'Please enter a password.');
        return;
    }
    if (password.length < 6) {
        showLoginError(errorEl, 'Password must be at least 6 characters.');
        return;
    }
    
    // Loading state
    setButtonLoading(submitBtn, 'Creating account...');
    hideError(errorEl);
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await userCredential.user.updateProfile({ displayName: name });
        window.location.href = 'dashboard.html';
    } catch (error) {
        showLoginError(errorEl, getErrorMessage(error.code));
        resetButton(submitBtn, '<i class="fas fa-user-plus"></i> Create Account');
    }
}

// ============================================
// GOOGLE SIGN IN
// ============================================
async function googleSignIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await auth.signInWithPopup(provider);
        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error('Google sign in error:', error);
        if (error.code !== 'auth/popup-closed-by-user') {
            alert(getErrorMessage(error.code));
        }
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function showLoginError(errorEl, message) {
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'flex';
    }
}

function hideError(errorEl) {
    if (errorEl) {
        errorEl.style.display = 'none';
        errorEl.textContent = '';
    }
}

function setButtonLoading(btn, text) {
    if (btn) {
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
        btn.disabled = true;
        btn.style.opacity = '0.7';
        btn.style.cursor = 'not-allowed';
    }
}

function resetButton(btn, html) {
    if (btn) {
        btn.innerHTML = html;
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
    }
}

function getErrorMessage(code) {
    const messages = {
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/popup-closed-by-user': 'Sign in cancelled. Please try again.',
        'auth/popup-blocked': 'Pop-up blocked. Please allow pop-ups.',
        'auth/network-request-failed': 'Network error. Check your connection.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/invalid-credential': 'Invalid email or password.'
    };
    return messages[code] || 'An error occurred. Please try again.';
}