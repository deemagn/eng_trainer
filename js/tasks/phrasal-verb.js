import { phrasalVerbs } from '../../data/phrasal-verbs.js';

const API_URL   = 'https://api.goodnewsenglish.com';
const TOKEN_KEY = 'et_token';

function getToken() { return localStorage.getItem(TOKEN_KEY); }

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
                body: JSON.stringify({ verb: item.pv }),
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
        const options = shuffle([data.c, ...data.w]);

        container.innerHTML = `
            <div class="pv-wrap">
                <p class="pv-sentence">${md(data.s)}</p>
                <div class="pv-options">
                    ${options.map(opt => `
                        <button class="pv-option" data-correct="${opt === data.c}">${opt}</button>
                    `).join('')}
                </div>
                <div class="pv-result" id="pv-result" style="display:none">
                    <p class="pv-translation">${md(data.t)}</p>
                    <button class="pv-btn-next" id="pv-next">Следующий →</button>
                </div>
            </div>`;

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
                container.querySelector('#pv-result').style.display = '';
            });
        });

        container.querySelector('#pv-next').addEventListener('click', loadNext);
    }

    loadNext();
}
