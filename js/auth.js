const API_URL = 'http://178.105.169.98';
const TOKEN_KEY = 'et_token';
const EMAIL_KEY = 'et_email';

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function getStoredEmail() { return localStorage.getItem(EMAIL_KEY); }

function saveAuth(token, email) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EMAIL_KEY, email);
}

export function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
}

export function isLoggedIn() {
    const token = getToken();
    if (!token) return false;
    try {
        const { exp } = JSON.parse(atob(token.split('.')[1]));
        return exp * 1000 > Date.now();
    } catch { return false; }
}

async function apiPost(path, body) {
    const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка');
    return data;
}

export function updateNavbar() {
    const nav = document.getElementById('nav-auth');
    if (isLoggedIn()) {
        const email = getStoredEmail() || '';
        nav.innerHTML = `
            <span class="nav-user-email">${email}</span>
            <button class="nav-logout-btn" id="btn-logout">Выйти</button>
        `;
        document.getElementById('btn-logout').addEventListener('click', () => {
            clearAuth();
            updateNavbar();
        });
    } else {
        nav.innerHTML = `<button class="nav-login-btn" id="btn-login">Войти</button>`;
        document.getElementById('btn-login').addEventListener('click', openAuthModal);
    }
}

export function openAuthModal() {
    document.getElementById('auth-overlay').classList.add('open');
}

export function initAuth() {
    const overlay   = document.getElementById('auth-overlay');
    const form      = document.getElementById('auth-form');
    const tabs      = document.querySelectorAll('.auth-tab');
    const emailInput    = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    const errorEl   = document.getElementById('auth-error');
    const submitBtn = document.getElementById('auth-submit');
    const closeBtn  = document.getElementById('auth-close');

    let mode = 'login';

    tabs.forEach(tab => tab.addEventListener('click', () => {
        mode = tab.dataset.mode;
        tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
        submitBtn.textContent = mode === 'login' ? 'Войти' : 'Зарегистрироваться';
        errorEl.textContent = '';
    }));

    closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('open');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email    = emailInput.value.trim();
        const password = passwordInput.value;
        errorEl.textContent = '';
        submitBtn.disabled = true;

        try {
            const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
            const { token } = await apiPost(path, { email, password });
            saveAuth(token, email);
            overlay.classList.remove('open');
            updateNavbar();
        } catch (err) {
            errorEl.textContent = err.message;
        } finally {
            submitBtn.disabled = false;
        }
    });

    updateNavbar();
}
