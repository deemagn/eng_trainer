import { phrasalVerbs } from '../../data/phrasal-verbs.js';
import { fetchLearnedWords, addLearnedWord, removeLearnedWord } from '../api.js';

const API_URL   = 'https://api.goodnewsenglish.com';
const TOKEN_KEY = 'et_token';

function getToken() { return localStorage.getItem(TOKEN_KEY); }

let preferredVoice = null;
function loadVoice() {
    const voices = speechSynthesis.getVoices();
    preferredVoice =
        voices.find(v => v.name === 'Google US English') ||
        voices.find(v => v.lang === 'en-US' && !v.localService) ||
        voices.find(v => v.lang === 'en-US') ||
        voices.find(v => v.lang.startsWith('en')) || null;
}
speechSynthesis.addEventListener('voiceschanged', loadVoice);
loadVoice();

function speakSentence(rawText, btn) {
    if (!window.speechSynthesis) return;
    const plain = rawText.replace(/\*\*(.*?)\*\*/g, '$1');
    speechSynthesis.cancel();
    document.querySelectorAll('.pv-speak-btn.speaking').forEach(b => b.classList.remove('speaking'));
    const utt = new SpeechSynthesisUtterance(plain);
    utt.lang = 'en-US';
    utt.rate = 0.85;
    if (preferredVoice) utt.voice = preferredVoice;
    btn.classList.add('speaking');
    utt.onend   = () => btn.classList.remove('speaking');
    utt.onerror = () => btn.classList.remove('speaking');
    speechSynthesis.speak(utt);
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function md(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

function pickMeaning(ru) {
    const parts = ru.split('/').map(s => s.trim()).filter(Boolean);
    return parts[Math.floor(Math.random() * parts.length)];
}

export async function initPhrasalVerbTask(container) {
    let learnedPV  = await fetchLearnedWords('phrasal-verbs');
    let currentItem = null;
    let answered    = false;

    function entryKey(item) { return String(item.id); }

    function getPool() {
        return phrasalVerbs.filter(p => !learnedPV.has(entryKey(p)));
    }

    function learnedCount() { return learnedPV.size; }

    function openLearnedModal() {
        const overlay = document.getElementById('modal-overlay');
        const titleEl = document.getElementById('modal-title');
        const bodyEl  = document.getElementById('modal-body');
        document.getElementById('modal-sort').style.display = 'none';

        const learned = phrasalVerbs.filter(p => learnedPV.has(entryKey(p)));
        titleEl.textContent = `Выученные фразовые глаголы — ${learned.length}`;
        bodyEl.innerHTML = learned.length === 0
            ? '<p style="color:#64748b;text-align:center;padding:20px 0">Ещё ничего не выучено</p>'
            : learned.map(p => `
                <div class="list-item">
                    <span class="en">${p.pv}</span>
                    <span class="ru">${p.ru}</span>
                    <button class="ll-return-btn" data-key="${entryKey(p)}">Вернуть</button>
                </div>`).join('');

        bodyEl.querySelectorAll('.ll-return-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                await removeLearnedWord('phrasal-verbs', btn.dataset.key);
                learnedPV.delete(btn.dataset.key);
                btn.closest('.list-item').remove();
                titleEl.textContent = `Выученные фразовые глаголы — ${learnedCount()}`;
                updateHeader();
            });
        });

        overlay.classList.add('open');
    }

    function updateHeader() {
        const hdr = container.querySelector('#pv-header');
        if (hdr) hdr.textContent = `Выучено: ${learnedCount()}`;
    }

    function onAnswer(btn) {
        if (answered) return;
        answered = true;
        const correct = btn.dataset.correct === 'true';
        btn.classList.add(correct ? 'pv-option--correct' : 'pv-option--wrong');
        if (!correct) {
            container.querySelectorAll('.pv-option').forEach(b => {
                if (b.dataset.correct === 'true') b.classList.add('pv-option--correct');
            });
        }
        const nextWrap = container.querySelector('#pv-next-wrap');
        if (nextWrap) {
            nextWrap.classList.add('open');
            const learnBtn = nextWrap.querySelector('#pv-learn-btn');
            if (learnBtn) learnBtn.style.display = '';
        }
    }

    // ── Вариант 1: API — предложение от Haiku ────────────────
    async function loadApiTask(item) {
        container.innerHTML = `<div class="pv-wrap"><p class="pv-loading">Генерируем упражнение…</p></div>`;

        try {
            const res = await fetch(`${API_URL}/api/phrasal-verb`, {
                method: 'POST',
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': `Bearer ${getToken()}`,
                },
                body: JSON.stringify({ verb: item.pv, meaning: item.ru }),
            });

            if (res.status === 401) {
                container.innerHTML = `<div class="pv-wrap"><p class="pv-error">Войдите в аккаунт, чтобы использовать этот раздел.</p></div>`;
                return;
            }
            if (res.status === 402) {
                container.innerHTML = `<div class="pv-wrap"><p class="pv-error">Добавьте Claude API ключ в профиле (нажмите на аватар → 🔑 Claude API ключ).</p></div>`;
                return;
            }
            if (!res.ok) throw new Error();

            const data = await res.json();
            renderApiTask(data);
        } catch {
            container.innerHTML = `
                <div class="pv-wrap">
                    <p class="pv-error">Ошибка генерации. Проверь подключение.</p>
                    <button class="pv-btn-next" id="pv-retry">Попробовать снова</button>
                </div>`;
            container.querySelector('#pv-retry').addEventListener('click', loadNext);
        }
    }

    function renderApiTask(data) {
        const options = shuffle([data.c, ...data.w.slice(0, 3)]);

        container.innerHTML = `
            <div class="pv-wrap">
                <div class="pv-header-row">
                    <span id="pv-header" class="pv-learned-count">Выучено: ${learnedCount()}</span>
                    <button class="pv-learned-list-btn" id="pv-learned-list">Список</button>
                </div>
                <p class="pv-sentence">${md(data.s)}</p>
                <div class="pv-translation-reveal" id="pv-translation">
                    <p class="pv-translation">${md(data.t)}</p>
                </div>
                <button class="speak-btn speak-btn--card pv-speak-btn" id="pv-speak" title="Озвучить">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                    </svg>
                </button>
                <div class="pv-options">
                    ${options.map(opt => `
                        <button class="pv-option" data-correct="${opt === data.c}">${opt}</button>
                    `).join('')}
                </div>
                <div class="pv-next-reveal" id="pv-next-wrap">
                    <button class="pv-btn-next pv-learn-btn" id="pv-learn-btn" style="display:none">✓ Выучено</button>
                    <button class="pv-btn-next" id="pv-next">Следующий →</button>
                </div>
            </div>`;

        container.querySelector('#pv-speak').addEventListener('click', (e) => {
            speakSentence(data.s, e.currentTarget);
        });

        container.querySelectorAll('.pv-option').forEach(btn => {
            btn.addEventListener('click', () => {
                onAnswer(btn);
                container.querySelector('#pv-translation').classList.add('open');
            });
        });

        container.querySelector('#pv-next').addEventListener('click', loadNext);
        container.querySelector('#pv-learned-list').addEventListener('click', openLearnedModal);
        container.querySelector('#pv-learn-btn').addEventListener('click', async () => {
            const key = entryKey(currentItem);
            await addLearnedWord('phrasal-verbs', key);
            learnedPV.add(key);
            loadNext();
        });
    }

    // ── Вариант 2: только фразовый глагол + 4 перевода ───────
    function renderSimpleTask(item) {
        const correct = pickMeaning(item.ru);
        const others  = shuffle(phrasalVerbs.filter(p => p.pv !== item.pv && p.ru));
        const wrongs  = others.slice(0, 3).map(p => pickMeaning(p.ru));
        const options = shuffle([correct, ...wrongs]);

        container.innerHTML = `
            <div class="pv-wrap">
                <div class="pv-header-row">
                    <span id="pv-header" class="pv-learned-count">Выучено: ${learnedCount()}</span>
                    <button class="pv-learned-list-btn" id="pv-learned-list">Список</button>
                </div>
                <p class="pv-verb-display">${item.pv}</p>
                <div class="pv-options">
                    ${options.map(opt => `
                        <button class="pv-option" data-correct="${opt === correct}">${opt}</button>
                    `).join('')}
                </div>
                <div class="pv-next-reveal" id="pv-next-wrap">
                    <button class="pv-btn-next pv-learn-btn" id="pv-learn-btn" style="display:none">✓ Выучено</button>
                    <button class="pv-btn-next" id="pv-next">Следующий →</button>
                </div>
            </div>`;

        container.querySelectorAll('.pv-option').forEach(btn => {
            btn.addEventListener('click', () => onAnswer(btn));
        });

        container.querySelector('#pv-next').addEventListener('click', loadNext);
        container.querySelector('#pv-learned-list').addEventListener('click', openLearnedModal);
        container.querySelector('#pv-learn-btn').addEventListener('click', async () => {
            const key = entryKey(currentItem);
            await addLearnedWord('phrasal-verbs', key);
            learnedPV.add(key);
            loadNext();
        });
    }

    // ── Выбор варианта ────────────────────────────────────────
    function loadNext() {
        answered = false;
        const pool = getPool();

        if (pool.length === 0) {
            container.innerHTML = `
                <div class="pv-wrap">
                    <p class="pv-verb-display" style="font-size:18px">Все фразовые глаголы выучены! 🎉</p>
                    <div style="text-align:center;margin-top:16px">
                        <button class="pv-btn-next" id="pv-learned-list">Список выученных</button>
                    </div>
                </div>`;
            container.querySelector('#pv-learned-list').addEventListener('click', openLearnedModal);
            return;
        }

        currentItem = pool[Math.floor(Math.random() * pool.length)];

        if (Math.random() < 0.5) {
            renderSimpleTask(currentItem);
        } else {
            loadApiTask(currentItem);
        }
    }

    loadNext();
}
