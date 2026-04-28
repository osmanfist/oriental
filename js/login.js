/**
 * Oriental - Login Page
 * Version: 2.0.0
 */

let currentForm = 'signin';

document.addEventListener('DOMContentLoaded', () => {
    // Toggle between sign in and sign up
    const toggleLink = document.getElementById('toggle-auth-link');
    const toggleText = document.getElementById('toggle-text');
    
    toggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        
        if (currentForm === 'signin') {
            document.getElementById('signin-form').classList.remove('active');
            document.getElementById('signup-form').classList.add('active');
            toggleText.textContent = 'Already have an account?';
            toggleLink.textContent = 'Sign In';
            currentForm = 'signup';
        } else {
            document.getElementById('signup-form').classList.remove('active');
            document.getElementById('signin-form').classList.add('active');
            toggleText.textContent = "Don't have an account?";
            toggleLink.textContent = 'Sign Up';
            currentForm = 'signin';
        }
    });

    // Password visibility toggle
    document.querySelectorAll('.password-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
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

    // Sign In Form
    document.getElementById('login-form-element').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const submitBtn = document.getElementById('login-submit-btn');
        const errorEl = document.getElementById('login-error');
        
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
        submitBtn.disabled = true;
        errorEl.style.display = 'none';
        
        try {
            await auth.signInWithEmailAndPassword(email, password);
            window.location.href = 'dashboard.html';
        } catch (error) {
            errorEl.textContent = getErrorMessage(error.code);
            errorEl.style.display = 'flex';
            submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
            submitBtn.disabled = false;
        }
    });

    // Sign Up Form
    document.getElementById('signup-form-element').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const submitBtn = document.getElementById('signup-submit-btn');
        const errorEl = document.getElementById('signup-error');
        
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
        submitBtn.disabled = true;
        errorEl.style.display = 'none';
        
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await userCredential.user.updateProfile({ displayName: name });
            window.location.href = 'dashboard.html';
        } catch (error) {
            errorEl.textContent = getErrorMessage(error.code);
            errorEl.style.display = 'flex';
            submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
            submitBtn.disabled = false;
        }
    });

    // Google Sign In
    document.getElementById('google-signin-btn').addEventListener('click', googleSignIn);
    document.getElementById('google-signup-btn').addEventListener('click', googleSignIn);
});

async function googleSignIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await auth.signInWithPopup(provider);
        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error('Google sign in error:', error);
        alert(getErrorMessage(error.code));
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
        'auth/network-request-failed': 'Network error. Check your connection.'
    };
    return messages[code] || 'An error occurred. Please try again.';
}