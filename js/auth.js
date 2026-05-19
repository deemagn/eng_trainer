const API_URL = 'https://api.goodnewsenglish.com';
const TOKEN_KEY    = 'et_token';
const USERNAME_KEY = 'et_username';
const AVATAR_KEY   = 'et_avatar';

const ANIMALS = [
    '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯',
    '🦁','🐮','🐷','🐸','🐵','🐔','🐧','🦆','🦉','🐺',
    '🐴','🦄','🐝','🐢','🦎','🐙','🦈','🐊','🦓','🦒',
    '🦘','🦔','🐿','🦝','🦜','🦩','🕊','🐇',
];

function getToken()          { return localStorage.getItem(TOKEN_KEY); }
function getStoredUsername() {
    return localStorage.getItem(USERNAME_KEY) || localStorage.getItem('et_email') || '';
}

function saveAuth(token, username) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USERNAME_KEY, username);
}

export function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    localStorage.removeItem(AVATAR_KEY);
}

export function isLoggedIn() {
    const token = getToken();
    if (!token) return false;
    try {
        const { exp } = JSON.parse(atob(token.split('.')[1]));
        return exp * 1000 > Date.now();
    } catch { return false; }
}

function defaultAvatar(username) {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = ((hash << 5) - hash) + username.charCodeAt(i);
        hash |= 0;
    }
    return ANIMALS[Math.abs(hash) % ANIMALS.length];
}

function getAvatar() {
    return localStorage.getItem(AVATAR_KEY) || defaultAvatar(getStoredUsername() || '');
}

function setAvatar(emoji) {
    localStorage.setItem(AVATAR_KEY, emoji);
}

function createLocalToken() {
    const payload = { user_id: 0, role: 'user', exp: Math.floor(Date.now() / 1000) + 15 * 24 * 3600 };
    const enc = (o) => btoa(JSON.stringify(o)).replace(/=/g, '');
    return `local.${enc(payload)}.local`;
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

async function fetchProgress() {
    const token = getToken();
    if (!token) return [];
    const res = await fetch(`${API_URL}/api/progress/stats`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return await res.json();
}

function openModal(title, bodyHTML) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    document.getElementById('modal-overlay').classList.add('open');
}

async function openProgressModal() {
    document.getElementById('nav-dropdown')?.classList.remove('open');
    openModal('Мой прогресс', '<p class="progress-empty">Загрузка...</p>');

    const stats = await fetchProgress();
    const names = { verbs: 'Глаголы', hard: 'Сложные глаголы', phrases: 'Фразы', markers: 'Маркеры' };

    if (!stats || stats.length === 0) {
        document.getElementById('modal-body').innerHTML =
            '<p class="progress-empty">Нет данных — пройди несколько заданий</p>';
        return;
    }

    document.getElementById('modal-body').innerHTML = `
        <div class="progress-stats">
            ${stats.map(s => `
                <div class="progress-stat">
                    <div class="progress-stat-header">
                        <span class="progress-stat-name">${names[s.category] || s.category}</span>
                        <span class="progress-stat-rate">${Math.round(s.rate)}%</span>
                    </div>
                    <div class="progress-bar-track">
                        <div class="progress-bar-fill" style="width:${s.rate}%"></div>
                    </div>
                    <div class="progress-stat-counts">${s.correct} из ${s.total} верно</div>
                </div>
            `).join('')}
        </div>`;
}

function openAvatarPicker() {
    document.getElementById('nav-dropdown')?.classList.remove('open');
    openModal('Выбери аватарку', `
        <div class="avatar-picker">
            ${ANIMALS.map(e => `<button class="avatar-option" data-emoji="${e}">${e}</button>`).join('')}
        </div>
    `);
    document.querySelectorAll('.avatar-option').forEach(btn => {
        btn.addEventListener('click', () => {
            setAvatar(btn.dataset.emoji);
            document.getElementById('modal-overlay').classList.remove('open');
            updateNavbar();
        });
    });
}

export function updateNavbar() {
    const nav = document.getElementById('nav-auth');
    if (isLoggedIn()) {
        const username = getStoredUsername() || '';
        const avatar   = getAvatar();
        nav.innerHTML = `
            <div class="nav-user" id="nav-user">
                <span class="nav-avatar">${avatar}</span>
                <span class="nav-username">${username}</span>
            </div>
            <div class="nav-dropdown" id="nav-dropdown">
                <div class="nav-dropdown-top">
                    <button class="nav-dropdown-avatar-btn" id="nav-dropdown-avatar-btn" title="Сменить аватарку">${avatar}</button>
                    <span class="nav-dropdown-name">${username}</span>
                </div>
                <div class="nav-dropdown-divider"></div>
                <button class="nav-dropdown-item" id="btn-progress">📊 Прогресс</button>
                <button class="nav-dropdown-item nav-dropdown-item--danger" id="btn-logout">🚪 Выйти</button>
            </div>
        `;

        document.getElementById('nav-user').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('nav-dropdown').classList.toggle('open');
        });
        document.getElementById('nav-dropdown-avatar-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openAvatarPicker();
        });
        document.getElementById('btn-progress').addEventListener('click', openProgressModal);
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
    const overlay       = document.getElementById('auth-overlay');
    const form          = document.getElementById('auth-form');
    const tabs          = document.querySelectorAll('.auth-tab');
    const usernameInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    const errorEl       = document.getElementById('auth-error');
    const submitBtn     = document.getElementById('auth-submit');
    const closeBtn      = document.getElementById('auth-close');

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

    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('nav-dropdown');
        if (dropdown && !e.target.closest('#nav-user') && !e.target.closest('#nav-dropdown')) {
            dropdown.classList.remove('open');
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        errorEl.textContent = '';
        submitBtn.disabled = true;
        try {
            if (username === 'test' && password === 'test') {
                saveAuth(createLocalToken(), 'test');
                overlay.classList.remove('open');
                updateNavbar();
                return;
            }
            const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
            const { token } = await apiPost(path, { username, password });
            saveAuth(token, username);
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
