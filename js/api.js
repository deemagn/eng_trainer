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
