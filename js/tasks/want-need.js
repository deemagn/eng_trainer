const API_URL   = 'https://api.goodnewsenglish.com';
const TOKEN_KEY = 'et_token';

function getToken() { return localStorage.getItem(TOKEN_KEY); }

const TARGETS = [
    { phrase: 'need to',        pattern: 'need to + infinitive' },
    { phrase: 'want',           pattern: 'want + noun' },
    { phrase: 'would like to',  pattern: 'would like to + infinitive' },
    { phrase: 'need',           pattern: 'need + noun' },
    { phrase: 'want to',        pattern: 'want to + infinitive' },
    { phrase: 'would like',     pattern: 'would like + noun' },
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

let targetIdx   = 0;
let scenarioIdx = 0;

// Accept both base and 3rd-person-singular forms: "need to" ↔ "needs to", "want" ↔ "wants"
function acceptsAnswer(userInput, target) {
    const a = userInput.trim().toLowerCase();
    const t = target.toLowerCase();
    if (a === t) return true;
    const words = t.split(' ');
    const conjugated = [words[0] + 's', ...words.slice(1)].join(' ');
    return a === conjugated;
}

export function initWantNeedTask(container) {
    let answered = false;

    async function loadNext() {
        answered = false;

        const target   = TARGETS[targetIdx % TARGETS.length];
        const scenario = SCENARIOS[scenarioIdx % SCENARIOS.length];
        targetIdx++;
        scenarioIdx++;

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

            renderTask(await res.json());
        } catch {
            container.innerHTML = `
                <div class="wn-wrap">
                    <p class="pv-error">Ошибка генерации. Проверь подключение.</p>
                    <button class="pv-btn-next" id="wn-retry">Попробовать снова</button>
                </div>`;
            container.querySelector('#wn-retry').addEventListener('click', loadNext);
        }
    }

    function renderTask(data) {
        // Replace target phrase in sentence with blank span
        const escaped = data.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const sentenceHtml = data.sentence_en.replace(
            new RegExp(escaped, 'i'),
            '<span class="wn-blank" id="wn-blank">___</span>'
        );

        container.innerHTML = `
            <div class="wn-wrap">
                <p class="wn-label">Контекст</p>
                <p class="wn-context-text">${data.context_en}</p>

                <p class="wn-label" style="margin-top:20px">Вставьте оборот</p>
                <p class="wn-sentence-text">${sentenceHtml}</p>

                <div class="wn-input-row">
                    <input class="wn-input" id="wn-input" type="text"
                        placeholder="need / want / would like…"
                        autocomplete="off" spellcheck="false">
                    <button class="wn-submit" id="wn-submit">Проверить →</button>
                </div>

                <div class="wn-result" id="wn-result" style="display:none"></div>

                <div class="wn-next-wrap" id="wn-next-wrap" style="display:none">
                    <button class="pv-btn-next" id="wn-next">Следующий →</button>
                </div>
            </div>`;

        const input     = container.querySelector('#wn-input');
        const submitBtn = container.querySelector('#wn-submit');

        function checkAnswer() {
            if (answered) return;
            answered = true;

            const isCorrect = acceptsAnswer(input.value.trim(), data.target);
            const blankEl   = container.querySelector('#wn-blank');

            if (blankEl) {
                blankEl.textContent = data.target;
                blankEl.classList.add(isCorrect ? 'wn-blank--correct' : 'wn-blank--wrong');
            }

            const resultEl = container.querySelector('#wn-result');
            resultEl.style.display = '';
            resultEl.innerHTML = `
                <div class="wn-verdict ${isCorrect ? 'wn-verdict--correct' : 'wn-verdict--wrong'}">
                    ${isCorrect
                        ? '✓ Правильно!'
                        : `✗ Неверно — правильный ответ: <b>${data.target}</b>`}
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

            input.disabled     = true;
            submitBtn.disabled = true;
            container.querySelector('#wn-next-wrap').style.display = '';
        }

        submitBtn.addEventListener('click', checkAnswer);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') checkAnswer(); });
        container.querySelector('#wn-next').addEventListener('click', loadNext);
        input.focus();
    }

    loadNext();
}
