import { verbs } from '../data/verbs.js';
import { phrases } from '../data/phrases.js';
import { markers } from '../data/markers.js';
import { initDialogues } from './dialogues.js';
import { initTasks }    from './tasks.js';
import { initAuth }     from './auth.js';

const hardVerbs    = verbs.filter(v => v.is_hard);
const datasets     = { verbs, hard: hardVerbs, phrases, markers };
const labels       = { verbs: 'Глагол', hard: 'Сложный глагол', phrases: 'Фраза', markers: 'Маркер' };
const counts       = { verbs: 'глаголов', hard: 'глаголов', phrases: 'фраз', markers: 'маркеров' };
const modalTitles  = { verbs: 'Глаголы', hard: 'Сложные глаголы', phrases: 'Фразы', markers: 'Маркеры' };

let currentMode = 'verbs';
let sessionCount = 0;

const cardWrapper  = document.getElementById('card-wrapper');
const cardElement  = document.getElementById('card-element');
const textFront    = document.getElementById('text-front');
const textBack     = document.getElementById('text-back');
const cardBadge    = document.getElementById('card-badge');
const counter      = document.getElementById('counter');
const subtitle     = document.getElementById('subtitle');
const btnVerbs     = document.getElementById('btn-verbs');
const btnHard      = document.getElementById('btn-hard');
const btnPhrases   = document.getElementById('btn-phrases');
const btnMarkers   = document.getElementById('btn-markers');
const btnNext      = document.getElementById('btn-next-item');
const btnShowList  = document.getElementById('btn-show-list');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle   = document.getElementById('modal-title');
const modalBody    = document.getElementById('modal-body');
const modalClose   = document.getElementById('modal-close');

// ── Cards page ────────────────────────────────────────────

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

        if (currentMode === 'phrases' || currentMode === 'markers') {
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
    [btnVerbs, btnHard, btnPhrases, btnMarkers].forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');
    updateSubtitle();
    updateUI();
}

// ── Modal ─────────────────────────────────────────────────

function openList() {
    const data = datasets[currentMode];
    const isVerbs = currentMode !== 'phrases' && currentMode !== 'markers';
    modalTitle.textContent = `${modalTitles[currentMode]} — ${data.length} ${counts[currentMode]}`;
    modalBody.innerHTML = data.map(item => `
        <div class="list-item">
            <span class="en">${item.en}</span>
            <span class="ru">${item.ru}</span>
            ${isVerbs ? `<span class="past">${item.past}</span>` : ''}
        </div>
    `).join('');
    modalOverlay.classList.add('open');
}

function closeList() {
    modalOverlay.classList.remove('open');
}

// ── Navigation ────────────────────────────────────────────

const navTabs = document.querySelectorAll('.nav-tab');
const pages   = document.querySelectorAll('.page');

function switchPage(pageId) {
    pages.forEach(p => p.classList.remove('active'));
    navTabs.forEach(t => t.classList.remove('active'));
    document.getElementById(`page-${pageId}`).classList.add('active');
    document.querySelector(`[data-page="${pageId}"]`)?.classList.add('active');
}

const navTabsContainer = document.getElementById('nav-tabs');
const navBurger = document.getElementById('nav-burger');

navBurger.addEventListener('click', (e) => {
    e.stopPropagation();
    navBurger.classList.toggle('open');
    navTabsContainer.classList.toggle('mobile-open');
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('#nav-tabs') && !e.target.closest('#nav-burger')) {
        navBurger.classList.remove('open');
        navTabsContainer.classList.remove('mobile-open');
    }
});

navTabs.forEach(tab => tab.addEventListener('click', () => {
    switchPage(tab.dataset.page);
    navBurger.classList.remove('open');
    navTabsContainer.classList.remove('mobile-open');
}));

// ── Keyboard shortcuts ────────────────────────────────────

initDialogues();
initTasks(switchPage);
initAuth();

document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') { closeList(); return; }

    const activePage = document.querySelector('.page.active')?.id;

    if (activePage === 'page-cards') {
        if (modalOverlay.classList.contains('open')) return;
        if (e.code === 'Space') { e.preventDefault(); updateUI(); }
        if (e.code === 'Enter') cardElement.classList.toggle('is-flipped');
    }
});

// ── Event listeners ───────────────────────────────────────

cardWrapper.addEventListener('click',   () => cardElement.classList.toggle('is-flipped'));
btnVerbs.addEventListener('click',      () => handleTabClick('verbs',   btnVerbs));
btnHard.addEventListener('click',       () => handleTabClick('hard',    btnHard));
btnPhrases.addEventListener('click',    () => handleTabClick('phrases', btnPhrases));
btnMarkers.addEventListener('click',    () => handleTabClick('markers', btnMarkers));
btnNext.addEventListener('click', updateUI);
btnShowList.addEventListener('click', openList);
modalClose.addEventListener('click', closeList);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeList(); });

// ── Init ──────────────────────────────────────────────────

updateSubtitle();
updateUI();
