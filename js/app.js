import { verbs } from '../data/verbs.js';
import { hardVerbs } from '../data/hard-verbs.js';
import { phrases } from '../data/phrases.js';

const datasets = { verbs, hard: hardVerbs, phrases };
const labels   = { verbs: 'Глагол', hard: 'Сложный глагол', phrases: 'Фраза' };
const counts   = { verbs: 'глаголов', hard: 'глаголов', phrases: 'фраз' };

let currentMode = 'verbs';
let sessionCount = 0;

const cardWrapper = document.getElementById('card-wrapper');
const cardElement = document.getElementById('card-element');
const textFront   = document.getElementById('text-front');
const textBack    = document.getElementById('text-back');
const cardBadge   = document.getElementById('card-badge');
const counter     = document.getElementById('counter');
const subtitle    = document.getElementById('subtitle');
const btnVerbs    = document.getElementById('btn-verbs');
const btnHard     = document.getElementById('btn-hard');
const btnPhrases  = document.getElementById('btn-phrases');
const btnNext     = document.getElementById('btn-next-item');

function updateSubtitle() {
    const data = datasets[currentMode];
    subtitle.textContent = `${data.length} ${counts[currentMode]} в наборе`;
}

function updateUI() {
    cardWrapper.classList.add('switching');
    cardElement.classList.remove('is-flipped');

    setTimeout(() => {
        const data = datasets[currentMode];
        const item = data[Math.floor(Math.random() * data.length)];
        const isEnglishFirst = Math.random() > 0.5;

        sessionCount++;
        counter.textContent = `показано за сессию: ${sessionCount}`;
        cardBadge.textContent = labels[currentMode];
        textFront.innerText = isEnglishFirst ? item.en : item.ru;

        if (currentMode === 'phrases') {
            textBack.innerHTML = `<h2>${isEnglishFirst ? item.ru : item.en}</h2>`;
        } else if (isEnglishFirst) {
            textBack.innerHTML = `
                <h2>${item.ru}</h2>
                <div class="grammar">
                    <p>Infinitive: <b>${item.en}</b></p>
                    <p>Past: <b>${item.past}</b></p>
                </div>`;
        } else {
            textBack.innerHTML = `
                <h2>${item.en}</h2>
                <div class="grammar">
                    <p>Past: <b>${item.past}</b></p>
                </div>`;
        }

        cardWrapper.classList.remove('switching');
    }, 300);
}

function handleTabClick(mode, activeBtn) {
    if (currentMode === mode) return;
    currentMode = mode;
    sessionCount = 0;
    [btnVerbs, btnHard, btnPhrases].forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');
    updateSubtitle();
    updateUI();
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); updateUI(); }
    if (e.code === 'Enter') cardElement.classList.toggle('is-flipped');
});

cardWrapper.addEventListener('click', () => cardElement.classList.toggle('is-flipped'));
btnVerbs.addEventListener('click',   () => handleTabClick('verbs',   btnVerbs));
btnHard.addEventListener('click',    () => handleTabClick('hard',    btnHard));
btnPhrases.addEventListener('click', () => handleTabClick('phrases', btnPhrases));
btnNext.addEventListener('click', updateUI);

updateSubtitle();
updateUI();
