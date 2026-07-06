const API_URL   = 'https://api.goodnewsenglish.com';
const TOKEN_KEY = 'et_token';

function getToken() { return localStorage.getItem(TOKEN_KEY); }

// Each group: same verb, two forms — with "to" and without "to"
const VERB_GROUPS = [
    {
        without: { phrase: 'want',          pattern: 'want + noun' },
        with:    { phrase: 'want to',        pattern: 'want to + infinitive' },
    },
    {
        without: { phrase: 'need',          pattern: 'need + noun' },
        with:    { phrase: 'need to',        pattern: 'need to + infinitive' },
    },
    {
        without: { phrase: 'would like',    pattern: 'would like + noun' },
        with:    { phrase: 'would like to',  pattern: 'would like to + infinitive' },
    },
];

const SCENARIOS = [
    'visiting a doctor / health issue',
    'booking travel tickets or accommodation',
    'ordering food at a restaurant',
    'studying or learning something new',
    'buying something at a shop',
    'home chores or apartment problem',
    'planning to meet friends',
    'gym or sport activity',
    'phone or computer problem',
    'planning outdoor activity / weather',
    'work or career situation',
    'financial decision / money',
];

let lastGroupIdx    = -1;
let lastScenarioIdx = -1;

function pickRandom(arr, lastIdx) {
    let idx;
    do { idx = Math.floor(Math.random() * arr.length); } while (idx === lastIdx && arr.length > 1);
    return idx;
}

export function initWantNeedTask(container) {
    let answered = false;

    async function loadNext() {
        answered = false;

        const gIdx     = pickRandom(VERB_GROUPS, lastGroupIdx);
        const sIdx     = pickRandom(SCENARIOS, lastScenarioIdx);
        lastGroupIdx    = gIdx;
        lastScenarioIdx = sIdx;

        const group    = VERB_GROUPS[gIdx];
        // Randomly pick: with "to" or without "to"
        const target   = Math.random() < 0.5 ? group.with : group.without;
        const scenario = SCENARIOS[sIdx];

        container.innerHTML = `<div class="wn-wrap"><p class="pv-loading">Генерируем упражнение…</p></div>`;

        try {
            const res = await fetch(`${API_URL}/api/want-need`, {
                method: 'POST',
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': `Bearer ${getToken()}`,
                },
                body: JSON.stringify({ target: target.phrase, pattern: target.pattern, scenario }),
            });

            if (res.status === 401) {
                container.innerHTML = `<div class="wn-wrap"><p class="pv-error">Войдите в аккаунт, чтобы использовать этот раздел.</p></div>`;
                return;
            }
            if (res.status === 402) {
                container.innerHTML = `<div class="wn-wrap"><p class="pv-error">Добавьте Claude API ключ в профиле (нажмите на аватар → 🔑 Claude API ключ).</p></div>`;
                return;
            }
            if (!res.ok) throw new Error();

            renderTask(await res.json(), group);
        } catch {
            container.innerHTML = `
                <div class="wn-wrap">
                    <p class="pv-error">Ошибка генерации. Проверь подключение.</p>
                    <button class="pv-btn-next" id="wn-retry">Попробовать снова</button>
                </div>`;
            container.querySelector('#wn-retry').addEventListener('click', loadNext);
        }
    }

    function renderTask(data, group) {
        const escaped = data.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const sentenceHtml = data.sentence_en.replace(
            new RegExp(escaped, 'i'),
            '<span class="wn-blank" id="wn-blank">___</span>'
        );

        // Always show exactly 2 options: without-to vs with-to for this verb group
        const optA = group.without;
        const optB = group.with;

        container.innerHTML = `
            <div class="wn-wrap">
                <p class="wn-label">Контекст</p>
                <p class="wn-context-text">${data.context_en}</p>

                <p class="wn-label" style="margin-top:20px">Нужна ли частица <b>to</b>?</p>
                <p class="wn-sentence-text">${sentenceHtml}</p>

                <div class="wn-options" id="wn-options">
                    <button class="wn-option" data-phrase="${optA.phrase}">${optA.phrase}</button>
                    <button class="wn-option" data-phrase="${optB.phrase}">${optB.phrase}</button>
                </div>

                <div class="wn-result" id="wn-result" style="display:none"></div>

                <div class="wn-next-wrap" id="wn-next-wrap" style="display:none">
                    <button class="pv-btn-next" id="wn-next">Следующий →</button>
                </div>
            </div>`;

        container.querySelector('#wn-options').addEventListener('click', (e) => {
            const btn = e.target.closest('.wn-option');
            if (!btn || answered) return;
            answered = true;

            const chosen    = btn.dataset.phrase.toLowerCase();
            const isCorrect = chosen === data.target.toLowerCase();

            container.querySelectorAll('.wn-option').forEach(b => {
                b.disabled = true;
                if (b.dataset.phrase.toLowerCase() === data.target.toLowerCase()) {
                    b.classList.add('wn-option--correct');
                } else if (b === btn && !isCorrect) {
                    b.classList.add('wn-option--wrong');
                }
            });

            const blankEl = container.querySelector('#wn-blank');
            if (blankEl) {
                blankEl.textContent = data.target;
                blankEl.classList.add(isCorrect ? 'wn-blank--correct' : 'wn-blank--wrong');
            }

            const resultEl = container.querySelector('#wn-result');
            resultEl.style.display = '';
            resultEl.innerHTML = `
                <div class="wn-verdict ${isCorrect ? 'wn-verdict--correct' : 'wn-verdict--wrong'}">
                    ${isCorrect ? '✓ Правильно!' : `✗ Неверно — правильный ответ: <b>${data.target}</b>`}
                </div>
                <div class="wn-translations">
                    <div class="wn-tr-row">
                        <span class="wn-tr-en">${data.context_en}</span>
                        <span class="wn-tr-ru">${data.context_ru}</span>
                    </div>
                    <div class="wn-tr-row">
                        <span class="wn-tr-en">${data.sentence_en}</span>
                        <span class="wn-tr-ru">${data.sentence_ru}</span>
                    </div>
                </div>
                <div class="wn-pattern">
                    Конструкция: <b>${data.pattern}</b>
                </div>`;

            container.querySelector('#wn-next-wrap').style.display = '';
        });

        container.querySelector('#wn-next').addEventListener('click', loadNext);
    }

    loadNext();
}
