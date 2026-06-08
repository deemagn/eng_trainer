const API_URL   = 'https://api.goodnewsenglish.com';
const TOKEN_KEY = 'et_token';

function getToken() { return localStorage.getItem(TOKEN_KEY); }

function isLocalToken() {
    const t = getToken();
    return !t || t.startsWith('local.');
}

export async function saveTaskProgress(variantId) {
    if (isLocalToken()) return;
    const category = 'task_' + variantId.replace(/-\d+$/, '').replace(/-/g, '_');
    await fetch(`${API_URL}/api/progress`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ category, word_en: variantId, correct: true }),
    }).catch(() => {});
}

export async function fetchLearnedWords(category) {
    const lsKey = `et_learned_${category}`;
    const local = new Set(JSON.parse(localStorage.getItem(lsKey) || '[]'));
    if (isLocalToken()) return local;
    try {
        const res = await fetch(`${API_URL}/api/learned?category=${category}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` },
        });
        if (!res.ok) return local;
        const data = await res.json();
        const remote = new Set(data);
        localStorage.setItem(lsKey, JSON.stringify([...remote]));
        return remote;
    } catch { return local; }
}

export async function addLearnedWord(category, wordEn) {
    const lsKey = `et_learned_${category}`;
    const set = new Set(JSON.parse(localStorage.getItem(lsKey) || '[]'));
    set.add(wordEn);
    localStorage.setItem(lsKey, JSON.stringify([...set]));
    if (isLocalToken()) return;
    await fetch(`${API_URL}/api/learned`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ category, word_en: wordEn }),
    }).catch(() => {});
}

export async function removeLearnedWord(category, wordEn) {
    const lsKey = `et_learned_${category}`;
    const set = new Set(JSON.parse(localStorage.getItem(lsKey) || '[]'));
    set.delete(wordEn);
    localStorage.setItem(lsKey, JSON.stringify([...set]));
    if (isLocalToken()) return;
    await fetch(`${API_URL}/api/learned`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ category, word_en: wordEn }),
    }).catch(() => {});
}

export async function generateLearnedText(words) {
    if (isLocalToken()) return { error: 'Войдите в аккаунт для использования этой функции' };
    try {
        const res = await fetch(`${API_URL}/api/generate-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
            body: JSON.stringify({ words }),
        });
        return res.json();
    } catch {
        return { error: 'Ошибка сети' };
    }
}

export async function fetchCompletedTasks() {
    if (isLocalToken()) return new Set();
    try {
        const res = await fetch(`${API_URL}/api/progress/tasks`, {
            headers: { 'Authorization': `Bearer ${getToken()}` },
        });
        if (!res.ok) return new Set();
        const data = await res.json();
        return new Set(data.map(d => d.variant_id));
    } catch {
        return new Set();
    }
}
