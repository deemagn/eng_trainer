import { fetchLearnedWords } from './api.js';
import { verbs }             from '../data/verbs.js';

const API_URL      = 'https://api.goodnewsenglish.com';
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
function isLocalToken() {
    const t = getToken();
    return !t || t.startsWith('local.');
}

function saveAuth(token, username, avatar = '') {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USERNAME_KEY, username);
    if (avatar) localStorage.setItem(AVATAR_KEY, avatar);
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

function setAvatar(value) {
    localStorage.setItem(AVATAR_KEY, value);
}

function renderAvatar(avatar) {
    if (avatar.startsWith('data:')) {
        return `<img src="${avatar}" class="avatar-img" alt="">`;
    }
    return avatar;
}

async function openCropModal(file) {
    const objectUrl = URL.createObjectURL(file);
    const VP = 240;

    openModal('Выбери область', `
        <div class="crop-wrap">
            <div class="crop-viewport" id="crop-viewport">
                <img id="crop-img" src="${objectUrl}" draggable="false">
            </div>
            <p class="crop-hint">Перетащи фото чтобы выбрать область</p>
            <button class="auth-submit" id="crop-confirm">Применить</button>
        </div>
    `);

    const viewport = document.getElementById('crop-viewport');
    const img      = document.getElementById('crop-img');

    await new Promise(resolve => img.addEventListener('load', resolve, { once: true }));

    const scale  = VP / Math.min(img.naturalWidth, img.naturalHeight);
    const dispW  = img.naturalWidth  * scale;
    const dispH  = img.naturalHeight * scale;
    img.style.width  = dispW + 'px';
    img.style.height = dispH + 'px';

    let x = (VP - dispW) / 2;
    let y = (VP - dispH) / 2;

    function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }
    function setPos(nx, ny) {
        x = clamp(nx, VP - dispW, 0);
        y = clamp(ny, VP - dispH, 0);
        img.style.transform = `translate(${x}px, ${y}px)`;
    }
    setPos(x, y);

    let dragging = false, sx, sy, ix, iy;

    viewport.addEventListener('mousedown', (e) => {
        dragging = true; sx = e.clientX; sy = e.clientY; ix = x; iy = y;
        e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
        if (dragging) setPos(ix + e.clientX - sx, iy + e.clientY - sy);
    });
    window.addEventListener('mouseup', () => { dragging = false; });

    viewport.addEventListener('touchstart', (e) => {
        const t = e.touches[0];
        dragging = true; sx = t.clientX; sy = t.clientY; ix = x; iy = y;
        e.preventDefault();
    }, { passive: false });
    window.addEventListener('touchmove', (e) => {
        if (!dragging) return;
        const t = e.touches[0];
        setPos(ix + t.clientX - sx, iy + t.clientY - sy);
    });
    window.addEventListener('touchend', () => { dragging = false; });

    document.getElementById('crop-confirm').addEventListener('click', () => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 200;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, -x / scale, -y / scale, VP / scale, VP / scale, 0, 0, 200, 200);
        const base64 = canvas.toDataURL('image/jpeg', 0.82);
        URL.revokeObjectURL(objectUrl);
        setAvatar(base64);
        saveAvatarToServer(base64);
        closeModal();
        updateNavbar();
    });
}

async function saveAvatarToServer(value) {
    if (isLocalToken()) return;
    await fetch(`${API_URL}/api/user/avatar`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ avatar: value }),
    }).catch(() => {});
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


function openModal(title, bodyHTML) {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    overlay.classList.add('open', 'modal-centered');
}

function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('open', 'modal-centered');
}

async function openProgressModal() {
    document.getElementById('nav-dropdown')?.classList.remove('open');
    openModal('Мой прогресс', '<p class="progress-empty">Загрузка...</p>');

    const learnedSet = await fetchLearnedWords('verbs');
    const n   = learnedSet.size;
    const N   = verbs.length;
    const pct = N > 0 ? Math.round(n / N * 100) : 0;

    document.getElementById('modal-body').innerHTML = `
        <div class="progress-section">
            <div class="progress-section-header">
                <span class="progress-section-label">Выучено глаголов</span>
                <span class="progress-section-count">${n} / ${N}</span>
            </div>
            <div class="progress-bar-track">
                <div class="progress-bar-fill" style="width:${pct}%"></div>
            </div>
            <div class="progress-section-pct">${pct}%</div>
        </div>
    `;
}

function openAvatarPicker() {
    document.getElementById('nav-dropdown')?.classList.remove('open');
    openModal('Аватарка', `
        <div class="avatar-upload-section">
            <label class="avatar-upload-btn" id="avatar-upload-label">
                📷 Загрузить фото
                <input type="file" id="avatar-file-input" accept="image/*" style="display:none">
            </label>
        </div>
        <div class="avatar-picker-divider">или выбери эмодзи</div>
        <div class="avatar-picker">
            ${ANIMALS.map(e => `<button class="avatar-option" data-emoji="${e}">${e}</button>`).join('')}
        </div>
    `);

    document.getElementById('avatar-file-input').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        await openCropModal(file);
    });

    document.querySelectorAll('.avatar-option').forEach(btn => {
        btn.addEventListener('click', async () => {
            setAvatar(btn.dataset.emoji);
            await saveAvatarToServer(btn.dataset.emoji);
            closeModal();
            updateNavbar();
        });
    });
}

async function openApiKeyModal() {
    document.getElementById('nav-dropdown')?.classList.remove('open');

    // Проверяем, есть ли уже ключ
    let hasKey = false;
    try {
        const res = await fetch(`${API_URL}/api/user/me`, {
            headers: { 'Authorization': `Bearer ${getToken()}` },
        });
        const data = await res.json();
        hasKey = !!data.has_api_key;
    } catch {}

    openModal('Claude API ключ', `
        <div style="display:flex;flex-direction:column;gap:12px">
            <p style="color:#94a3b8;font-size:14px;line-height:1.5">
                Нужен для раздела Phrasal Verbs.<br>
                Хранится на сервере, не передаётся третьим лицам.<br>
                Получить ключ: <a href="https://console.anthropic.com/" target="_blank" style="color:#818cf8">console.anthropic.com</a>
            </p>
            <input class="auth-input" id="apikey-input" type="password"
                placeholder="${hasKey ? '••••••••••••••• (ключ уже сохранён)' : 'sk-ant-api03-...'}">
            <p class="auth-error" id="apikey-msg"></p>
            <button class="auth-submit" id="apikey-save">Сохранить</button>
            ${hasKey ? '<button class="auth-submit" id="apikey-delete" style="background:linear-gradient(135deg,#ef4444,#dc2626);margin-top:4px">Удалить ключ</button>' : ''}
        </div>
    `);

    document.getElementById('apikey-save').addEventListener('click', async () => {
        const val = document.getElementById('apikey-input').value.trim();
        const msg = document.getElementById('apikey-msg');
        if (!val) { msg.textContent = 'Введите ключ'; return; }
        try {
            const res = await fetch(`${API_URL}/api/user/apikey`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify({ api_key: val }),
            });
            if (!res.ok) throw new Error();
            msg.style.color = '#4ade80';
            msg.textContent = 'Ключ сохранён ✓';
            document.getElementById('apikey-input').value = '';
            document.getElementById('apikey-input').placeholder = '••••••••••••••• (ключ сохранён)';
        } catch {
            msg.style.color = '';
            msg.textContent = 'Ошибка сохранения';
        }
    });

    document.getElementById('apikey-delete')?.addEventListener('click', async () => {
        await fetch(`${API_URL}/api/user/apikey`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
            body: JSON.stringify({ api_key: '' }),
        });
        closeModal();
    });
}

export function updateNavbar() {
    const nav = document.getElementById('nav-auth');
    if (isLoggedIn()) {
        const username = getStoredUsername() || '';
        const avatar   = getAvatar();
        const avatarHTML = renderAvatar(avatar);
        nav.innerHTML = `
            <div class="nav-user" id="nav-user">
                <span class="nav-username">${username}</span>
                <span class="nav-avatar">${avatarHTML}</span>
            </div>
            <div class="nav-dropdown" id="nav-dropdown">
                <div class="nav-dropdown-top">
                    <button class="nav-dropdown-avatar-btn" id="nav-dropdown-avatar-btn" title="Сменить аватарку">${avatarHTML}</button>
                    <span class="nav-dropdown-name">${username}</span>
                </div>
                <div class="nav-dropdown-divider"></div>
                <button class="nav-dropdown-item" id="btn-progress">📊 Прогресс</button>
                <button class="nav-dropdown-item" id="btn-apikey">🔑 Claude API ключ</button>
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
        document.getElementById('btn-apikey').addEventListener('click', openApiKeyModal);
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
            const { token, avatar } = await apiPost(path, { username, password });
            saveAuth(token, username, avatar);
            overlay.classList.remove('open');
            updateNavbar();
        } catch (err) {
            errorEl.textContent = err.message;
        } finally {
            submitBtn.disabled = false;
        }
    });

    // Синхронизируем аватарку с сервером при старте
    if (isLoggedIn() && !isLocalToken()) {
        fetch(`${API_URL}/api/user/me`, {
            headers: { 'Authorization': `Bearer ${getToken()}` },
        }).then(r => r.json()).then(data => {
            if (data.avatar) {
                localStorage.setItem(AVATAR_KEY, data.avatar);
                updateNavbar();
            }
        }).catch(() => {});
    }

    updateNavbar();
}
