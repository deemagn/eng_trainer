import { phrasalVerbs } from '../../data/phrasal-verbs.js';

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

export function initPhrasalVerbTask(container) {
    let answered = false;

    async function loadNext() {
        answered = false;
        const item = phrasalVerbs[Math.floor(Math.random() * phrasalVerbs.length)];

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
            renderTask(data);
        } catch {
            container.innerHTML = `
                <div class="pv-wrap">
                    <p class="pv-error">Ошибка генерации. Проверь подключение.</p>
                    <button class="pv-btn-next" id="pv-retry">Попробовать снова</button>
                </div>`;
            container.querySelector('#pv-retry').addEventListener('click', loadNext);
        }
    }

    function renderTask(data) {
        const options = shuffle([data.c, ...data.w.slice(0, 3)]);

        container.innerHTML = `
            <div class="pv-wrap">
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
                    <button class="pv-btn-next" id="pv-next">Следующий →</button>
                </div>
            </div>`;

        container.querySelector('#pv-speak').addEventListener('click', (e) => {
            speakSentence(data.s, e.currentTarget);
        });

        container.querySelectorAll('.pv-option').forEach(btn => {
            btn.addEventListener('click', () => {
                if (answered) return;
                answered = true;
                const correct = btn.dataset.correct === 'true';
                btn.classList.add(correct ? 'pv-option--correct' : 'pv-option--wrong');
                if (!correct) {
                    container.querySelectorAll('.pv-option').forEach(b => {
                        if (b.dataset.correct === 'true') b.classList.add('pv-option--correct');
                    });
                }
                container.querySelector('#pv-translation').classList.add('open');
                container.querySelector('#pv-next-wrap').classList.add('open');
            });
        });

        container.querySelector('#pv-next').addEventListener('click', loadNext);
    }

    loadNext();
}
