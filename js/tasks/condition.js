const API_URL   = 'https://api.goodnewsenglish.com';
const TOKEN_KEY = 'et_token';
function getToken() { return localStorage.getItem(TOKEN_KEY); }

const TOPICS = [
    'weather and nature',
    'travel and transport',
    'food and cooking',
    'work and career',
    'health and medicine',
    'shopping and money',
    'studying and school',
    'sports and fitness',
    'technology and phones',
    'home and apartment',
    'friends and social life',
    'animals and pets',
    'city life',
    'holidays and free time',
    'morning routines',
    'unexpected situations',
    'music and hobbies',
    'environmental problems',
    'relationships',
    'road and traffic',
];

const MODALS = {
    0: ['can', 'may'],
    1: ['might', 'may', 'can', 'should', 'could'],
    2: ['might', 'could', 'may'],
    3: ['might', 'could', 'may'],
};

const RULES = {
    0: {
        name: 'Zero Conditional',
        structure: 'If + Present Simple → Present Simple',
        use: 'Говорим о том, что всегда верно: законы природы, общие факты, привычные последствия.',
        example: 'If you heat ice, it melts.',
    },
    1: {
        name: 'First Conditional',
        structure: 'If + Present Simple → will + verb',
        use: 'Реальная ситуация в будущем — то, что вполне может произойти.',
        example: 'If it rains tomorrow, I will stay home.',
    },
    2: {
        name: 'Second Conditional',
        structure: 'If + Past Simple → would + verb',
        use: 'Нереальная или маловероятная ситуация сейчас или в будущем.',
        example: 'If I had more money, I would travel the world.',
    },
    3: {
        name: 'Third Conditional',
        structure: 'If + Past Perfect → would have + verb',
        use: 'Нереальная ситуация в прошлом — то, чего не случилось.',
        example: 'If she had studied harder, she would have passed the exam.',
    },
};

let lastTopicIdx = -1;

function pickRandom(arr, lastIdx = -1) {
    let idx;
    do { idx = Math.floor(Math.random() * arr.length); } while (idx === lastIdx && arr.length > 1);
    return idx;
}

export function initConditionTask(container) {
    let answered = false;

    async function loadNext() {
        answered = false;

        const topicIdx = pickRandom(TOPICS, lastTopicIdx);
        lastTopicIdx = topicIdx;
        const topic = TOPICS[topicIdx];

        const condType = Math.floor(Math.random() * 4);
        const useModal = Math.random() < 0.3;
        const modalList = MODALS[condType];
        const modal = useModal ? modalList[Math.floor(Math.random() * modalList.length)] : '';

        container.innerHTML = `<div class="cond-wrap"><p class="pv-loading">Генерируем предложение…</p></div>`;

        try {
            const res = await fetch(`${API_URL}/api/condition`, {
                method: 'POST',
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': `Bearer ${getToken()}`,
                },
                body: JSON.stringify({ cond_type: condType, topic, use_modal: useModal, modal }),
            });

            if (res.status === 401) {
                container.innerHTML = `<div class="cond-wrap"><p class="pv-error">Войдите в аккаунт.</p></div>`;
                return;
            }
            if (res.status === 402) {
                container.innerHTML = `<div class="cond-wrap"><p class="pv-error">Добавьте Claude API ключ в настройках профиля.</p></div>`;
                return;
            }
            if (!res.ok) throw new Error();

            renderTask(await res.json());
        } catch {
            container.innerHTML = `
                <div class="cond-wrap">
                    <p class="pv-error">Ошибка генерации. Проверь подключение.</p>
                    <div style="text-align:center;margin-top:16px">
                        <button class="pv-btn-next" id="cond-retry">Попробовать снова</button>
                    </div>
                </div>`;
            container.querySelector('#cond-retry').addEventListener('click', loadNext);
        }
    }

    function renderTask(data) {
        const rule = RULES[data.cond_type];

        container.innerHTML = `
            <div class="cond-wrap">
                <p class="cond-if-clause">${data.if_clause},</p>

                <div class="cond-actions">
                    <button class="cond-btn cond-btn--ok"  id="cond-ok"  title="Знаю продолжение">✓</button>
                    <button class="cond-btn cond-btn--bad" id="cond-bad" title="Не знаю">✗</button>
                </div>

                <div class="cond-result" id="cond-result">
                    <p class="cond-main-clause">${data.main_clause}.</p>
                    <div class="cond-rule">
                        <span class="cond-rule-name">${rule.name}</span>
                        <span class="cond-rule-struct">${rule.structure}</span>
                        <span class="cond-rule-use">${rule.use}</span>
                        <span class="cond-rule-example">Пример: <i>${rule.example}</i></span>
                    </div>
                </div>

                <div class="cond-next-wrap" id="cond-next-wrap">
                    <button class="pv-btn-next" id="cond-next">Следующее →</button>
                </div>
            </div>`;

        const resultEl  = container.querySelector('#cond-result');
        const nextWrap  = container.querySelector('#cond-next-wrap');
        resultEl.style.display  = 'none';
        nextWrap.style.display  = 'none';

        function reveal() {
            if (answered) return;
            answered = true;
            resultEl.style.display = '';
            nextWrap.style.display = '';
            container.querySelectorAll('.cond-btn').forEach(b => b.disabled = true);
        }

        container.querySelector('#cond-ok').addEventListener('click', reveal);
        container.querySelector('#cond-bad').addEventListener('click', reveal);
        container.querySelector('#cond-next').addEventListener('click', loadNext);
    }

    loadNext();
}
