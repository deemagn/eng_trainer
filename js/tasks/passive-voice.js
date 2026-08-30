const API_URL   = 'https://api.goodnewsenglish.com';
const TOKEN_KEY = 'et_token';
function getToken() { return localStorage.getItem(TOKEN_KEY); }

const SITUATIONS = [
    'a chef preparing a meal in a restaurant kitchen',
    'scientists discovering a new planet',
    'workers constructing a skyscraper downtown',
    'police arresting a suspect near the bank',
    'a teacher grading student essays',
    'an artist painting a large mural on a wall',
    'engineers designing a new electric car',
    'a surgeon performing a complex operation',
    'farmers harvesting wheat in the fields',
    'a musician recording an album in a studio',
    'mechanics repairing a broken engine',
    'a journalist writing an investigative report',
    'children reading books in the library',
    'a photographer capturing a landscape at sunrise',
    'workers manufacturing circuit boards in a factory',
    'archaeologists excavating an ancient tomb',
    'a baker preparing sourdough bread',
    'security guards monitoring the entrance',
    'scientists conducting experiments with bacteria',
    'a librarian sorting newly donated books',
    'volunteers planting trees in the park',
    'a programmer debugging complex code',
    'cleaners washing the windows of a tall building',
    'firefighters extinguishing a warehouse fire',
    'a translator working on a legal document',
    'the government passing environmental legislation',
    'investors funding a startup company',
    'a surgeon removing a tumour from a patient',
    'the committee reviewing the annual budget',
    'workers installing solar panels on rooftops',
    'an architect designing a new concert hall',
    'detectives investigating a series of robberies',
    'nurses administering vaccines at a clinic',
    'a film director shooting an outdoor scene',
    'students sitting a university entrance exam',
    'workers demolishing an old factory',
    'a CEO signing a major international contract',
    'scientists analysing satellite data',
    'a composer writing music for a film',
    'emergency services evacuating a coastal town',
    'a mechanic fixing a cracked cylinder head',
    'agricultural workers harvesting grapes for wine',
    'a writer finishing a mystery novel',
    'engineers testing a new rocket prototype',
    'officials announcing the election results',
    'cleaners disinfecting hospital wards overnight',
    'hackers breaching a corporate database',
    'road workers repairing a damaged motorway',
    'a designer creating a brand identity for a client',
    'a team launching a weather satellite',
    'a coach training the national swimming team',
    'warehouse workers packing online orders',
    'a judge sentencing a convicted fraudster',
    'archaeologists discovering ancient pottery',
    'a pharmacist compounding a special medication',
    'decorators painting the walls of a new office',
    'engineers reinforcing a crumbling dam',
    'a nurse replacing bandages on a burn patient',
    'the company laying off a third of its workforce',
    'plumbers installing a new heating system',
    'a pilot landing a plane in heavy fog',
    'scientists growing stem cells in a laboratory',
    'a tailor sewing a wedding dress',
    'builders laying the foundation of a hospital',
    'an editor revising a manuscript before publication',
    'officers patrolling the border overnight',
    'a dentist extracting a wisdom tooth',
    'charity workers distributing food after a flood',
    'a captain navigating a ship through a storm',
    'workers sanitising the food processing plant',
    'scientists trialling a new cancer treatment',
    'a waiter serving a birthday dinner',
    'factory workers assembling electric bicycles',
    'a gardener pruning overgrown hedges',
    'inspectors checking a newly opened restaurant',
    'a band recording their first studio album',
    'engineers drilling a tunnel through a mountain',
    'scientists publishing findings on climate change',
    'a professor assigning a research project',
    'engineers repairing a collapsed bridge section',
    'detectives questioning a key witness',
    'a florist arranging flowers for a state ceremony',
    'technicians installing radar equipment on a ship',
    'astronomers observing a distant meteor shower',
    'a lawyer preparing a defence case for court',
    'contractors completing a hospital renovation',
    'a hedge fund buying shares in a tech company',
    'biologists breeding an endangered species in captivity',
    'a chef seasoning a new signature dish',
    'workers widening a busy motorway',
    'officials releasing classified government documents',
    'nurses monitoring a patient in intensive care',
    'rescue teams clearing debris after an earthquake',
    'microbiologists culturing antibiotic-resistant bacteria',
    'a mechanic replacing worn brake pads',
    'construction workers pouring concrete for a dam',
    'city planners granting a building permit',
    'geneticists sequencing the DNA of a rare plant',
    'a film editor cutting the final version of a documentary',
    'workers dismantling an old nuclear reactor',
];

const MODALS = ['can', 'could', 'may', 'might', 'must', 'should', 'would'];

// 9 равновероятных вариантов: 7 времён + 2 модальных типа
const TENSE_BUCKETS = [
    'present_simple',
    'past_simple',
    'future_simple',
    'present_continuous',
    'past_continuous',
    'present_perfect',
    'past_perfect',
    'modal_simple',
    'modal_perfect',
];

const RULES = {
    present_simple:     { name: 'Present Simple Passive',     formula: 'is / am / are + V3',           example: 'The report is signed every Monday.' },
    past_simple:        { name: 'Past Simple Passive',        formula: 'was / were + V3',              example: 'The bridge was built in 1950.' },
    future_simple:      { name: 'Future Simple Passive',      formula: 'will be + V3',                 example: 'The results will be announced tomorrow.' },
    present_continuous: { name: 'Present Continuous Passive', formula: 'is / am / are being + V3',     example: 'The road is being repaired right now.' },
    past_continuous:    { name: 'Past Continuous Passive',    formula: 'was / were being + V3',        example: 'The film was being recorded when the fire broke out.' },
    present_perfect:    { name: 'Present Perfect Passive',    formula: 'have / has been + V3',         example: 'The letter has already been sent.' },
    past_perfect:       { name: 'Past Perfect Passive',       formula: 'had been + V3',               example: 'The evidence had been destroyed before the trial.' },
    modal_simple:       { name: 'Modal Passive',              formula: '[modal] + be + V3',            example: 'This must be checked carefully.' },
    modal_perfect:      { name: 'Modal Perfect Passive',      formula: '[modal] + have been + V3',     example: 'The mistake could have been avoided.' },
};

let situationQueue = [];
function refillSituations() { situationQueue = [...SITUATIONS].sort(() => Math.random() - 0.5); }
function nextSituation() { if (!situationQueue.length) refillSituations(); return situationQueue.pop(); }

function pickRound() {
    const tense = TENSE_BUCKETS[Math.floor(Math.random() * 9)];
    const modal = (tense === 'modal_simple' || tense === 'modal_perfect')
        ? MODALS[Math.floor(Math.random() * MODALS.length)]
        : null;
    return { tense, modal };
}

export function initPassiveVoiceTask(container) {
    let answered = false;

    async function loadNext() {
        answered = false;
        const situation = nextSituation();
        const { tense, modal } = pickRound();

        container.innerHTML = `<div class="cond-wrap"><p class="pv-loading">Генерируем предложение…</p></div>`;

        try {
            const res = await fetch(`${API_URL}/api/passive-voice`, {
                method: 'POST',
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': `Bearer ${getToken()}`,
                },
                body: JSON.stringify({ tense, modal: modal ?? '', situation }),
            });

            if (res.status === 401) { container.innerHTML = `<div class="cond-wrap"><p class="pv-error">Войдите в аккаунт.</p></div>`; return; }
            if (res.status === 402) { container.innerHTML = `<div class="cond-wrap"><p class="pv-error">Добавьте Claude API ключ в настройках профиля.</p></div>`; return; }
            if (!res.ok) throw new Error();

            renderTask(await res.json(), tense, modal);
        } catch {
            container.innerHTML = `
                <div class="cond-wrap">
                    <p class="pv-error">Ошибка генерации. Проверь подключение.</p>
                    <div style="text-align:center;margin-top:16px">
                        <button class="pv-btn-next" id="pv-retry">Попробовать снова</button>
                    </div>
                </div>`;
            container.querySelector('#pv-retry').addEventListener('click', loadNext);
        }
    }

    function renderTask(data, tense, modal) {
        const rule    = RULES[tense];
        const formula = modal ? rule.formula.replace('[modal]', modal) : rule.formula;
        const label   = modal ? `${rule.name} — ${modal}` : rule.name;

        container.innerHTML = `
            <div class="cond-wrap">
                <p class="pv-active-sentence">${data.active}</p>

                <div class="cond-actions">
                    <button class="cond-btn cond-btn--ok"  id="pv-ok"  title="Знаю пассивный вариант">✓</button>
                    <button class="cond-btn cond-btn--bad" id="pv-bad" title="Не знаю">✗</button>
                </div>

                <div class="pv-result" id="pv-result">
                    <p class="pv-passive-sentence">${data.passive}</p>
                    <div class="cond-rule">
                        <span class="cond-rule-name">${label}</span>
                        <span class="cond-rule-struct">${formula}</span>
                        <span class="cond-rule-example">Пример: <i>${rule.example}</i></span>
                    </div>
                </div>

                <div class="cond-next-wrap" id="pv-next-wrap">
                    <button class="pv-btn-next" id="pv-next">Следующее →</button>
                </div>
            </div>`;

        const resultEl = container.querySelector('#pv-result');
        const nextWrap = container.querySelector('#pv-next-wrap');
        resultEl.style.display = 'none';
        nextWrap.style.display = 'none';

        function reveal() {
            if (answered) return;
            answered = true;
            resultEl.style.display = '';
            nextWrap.style.display = '';
            container.querySelectorAll('.cond-btn').forEach(b => b.disabled = true);
        }

        container.querySelector('#pv-ok').addEventListener('click', reveal);
        container.querySelector('#pv-bad').addEventListener('click', reveal);
        container.querySelector('#pv-next').addEventListener('click', loadNext);
    }

    loadNext();
}
