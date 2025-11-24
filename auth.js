// Authentication Logic
import { supabase } from './config.js';
import { showToast, isValidEmail, getPasswordStrength } from './utils.js';

// Check if user is already logged in
async function checkAuthStatus() {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        // User is logged in, redirect to dashboard
        window.location.href = 'dashboard.html';
    }
}

// Login Form Handler
if (document.getElementById('loginForm')) {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const errorMessage = document.getElementById('errorMessage');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Validate email
        if (!isValidEmail(email)) {
            errorMessage.textContent = 'Please enter a valid email address';
            errorMessage.style.display = 'block';
            return;
        }

        // Show loading state
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;
        errorMessage.style.display = 'none';

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // Check if email is verified
            if (!data.user.email_confirmed_at) {
                errorMessage.textContent = 'Please verify your email before logging in';
                errorMessage.style.display = 'block';
                loginBtn.classList.remove('loading');
                loginBtn.disabled = false;
                return;
            }

            showToast('Login successful!', 'success');

            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 500);

        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = error.message || 'Invalid email or password';
            errorMessage.style.display = 'block';
            loginBtn.classList.remove('loading');
            loginBtn.disabled = false;
        }
    });

    // Check auth status on page load
    checkAuthStatus();
}

// Signup Form Handler
if (document.getElementById('signupForm')) {
    const signupForm = document.getElementById('signupForm');
    const signupBtn = document.getElementById('signupBtn');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const passwordInput = document.getElementById('password');
    const passwordStrengthEl = document.getElementById('passwordStrength');

    // Password strength indicator
    passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        if (password.length === 0) {
            passwordStrengthEl.style.display = 'none';
            return;
        }

        const strength = getPasswordStrength(password);
        passwordStrengthEl.style.display = 'block';

        const fill = passwordStrengthEl.querySelector('.strength-fill');
        const text = passwordStrengthEl.querySelector('.strength-text');

        fill.className = `strength-fill ${strength.class}`;
        text.textContent = strength.label;

        if (strength.level === 'weak') {
            fill.style.width = '33%';
        } else if (strength.level === 'medium') {
            fill.style.width = '66%';
        } else {
            fill.style.width = '100%';
        }
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validate inputs
        if (!name) {
            errorMessage.textContent = 'Please enter your name';
            errorMessage.style.display = 'block';
            return;
        }

        if (!isValidEmail(email)) {
            errorMessage.textContent = 'Please enter a valid email address';
            errorMessage.style.display = 'block';
            return;
        }

        if (password.length < 8) {
            errorMessage.textContent = 'Password must be at least 8 characters';
            errorMessage.style.display = 'block';
            return;
        }

        if (password !== confirmPassword) {
            errorMessage.textContent = 'Passwords do not match';
            errorMessage.style.display = 'block';
            return;
        }

        // Show loading state
        signupBtn.classList.add('loading');
        signupBtn.disabled = true;
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: name
                    },
                    emailRedirectTo: `${window.location.origin}/login.html`
                }
            });

            if (error) throw error;

            // Show success message
            successMessage.textContent = 'Account created! Please check your email to verify your account.';
            successMessage.style.display = 'block';
            signupForm.reset();
            passwordStrengthEl.style.display = 'none';

            showToast('Verification email sent!', 'success');

            // Redirect to login after 3 seconds
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);

        } catch (error) {
            console.error('Signup error:', error);
            errorMessage.textContent = error.message || 'Failed to create account';
            errorMessage.style.display = 'block';
        } finally {
            signupBtn.classList.remove('loading');
            signupBtn.disabled = false;
        }
    });

    // Check auth status on page load
    checkAuthStatus();
}

// Logout function (used in dashboard)
export async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        showToast('Logged out successfully', 'success');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Failed to logout', 'error');
    }
}

// Check if user is authenticated (used in dashboard and profile)
export async function requireAuth() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        window.location.href = 'login.html';
        return null;
    }

    return session.user;
}
