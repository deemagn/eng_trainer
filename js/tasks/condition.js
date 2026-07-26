const API_URL   = 'https://api.goodnewsenglish.com';
const TOKEN_KEY = 'et_token';
function getToken() { return localStorage.getItem(TOKEN_KEY); }

const TOPICS = [
    'forgetting your umbrella on a rainy day',
    'missing the last train home',
    'your phone battery dying at the worst moment',
    'cooking dinner and realising you forgot an ingredient',
    'getting lost in an unfamiliar city',
    'oversleeping and being late for work',
    'finding a wallet on the street',
    'your internet going down during an important video call',
    'winning a large sum of money',
    'moving to another country for work',
    'a friend asking you to lend money',
    'eating too much fast food regularly',
    'starting to exercise every morning',
    'getting a surprise job offer abroad',
    'your car breaking down on a highway',
    'forgetting a close friend\'s birthday',
    'a dog running into traffic',
    'leaving your keys inside a locked apartment',
    'studying hard for a difficult exam',
    'arriving at the airport and finding your flight is cancelled',
    'ordering the wrong dish at a restaurant',
    'your cat knocking a glass off the table',
    'receiving a bad review at work',
    'buying a concert ticket and the artist cancelling',
    'choosing a healthier diet',
    'a sudden power cut at night',
    'your favourite café closing down',
    'meeting someone famous unexpectedly',
    'getting a second chance after making a big mistake',
    'leaving a job without another one lined up',
    'not wearing sunscreen on a sunny day',
    'helping a stranger who looks lost',
    'your landlord raising the rent',
    'choosing to learn a new language',
    'not sleeping enough for several weeks',
    'spilling coffee on your laptop',
    'a flight being delayed by eight hours',
    'someone cutting in front of you in a queue',
    'your team losing an important match because of one mistake',
    'deciding to start your own business',
    'a sudden rainstorm during an outdoor wedding',
    'your roommate playing loud music late at night',
    'finding out a friend has been lying to you',
    'a child touching something dangerous in a store',
    'running out of hot water in the morning',
    'buying something expensive and regretting it',
    'plants not getting enough water',
    'taking a gap year before university',
    'a traffic jam making you two hours late',
    'accidentally sending an email to the wrong person',
    'your wifi router breaking on a work-from-home day',
    'adopting a rescue dog',
    'drinking coffee too late in the evening',
    'a surprise inspection at work',
    'forgetting to save an important document',
    'getting a call from your bank about suspicious activity',
    'choosing to apologise after an argument',
    'a bus driver going past your stop without stopping',
    'someone returning a favour you did years ago',
    'signing a contract without reading it carefully',
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

// Shuffled queue — each topic appears once before any repeats
let topicQueue = [];
let condQueue  = [];

function refillTopics() {
    topicQueue = [...TOPICS].sort(() => Math.random() - 0.5);
}
function refillConds() {
    // Fill with balanced spread: each type appears roughly equally
    const base = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3];
    condQueue = base.sort(() => Math.random() - 0.5);
}

function nextTopic() {
    if (!topicQueue.length) refillTopics();
    return topicQueue.pop();
}
function nextCondType() {
    if (!condQueue.length) refillConds();
    return condQueue.pop();
}

export function initConditionTask(container) {
    let answered = false;

    async function loadNext() {
        answered = false;

        const topic    = nextTopic();
        const condType = nextCondType();
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
