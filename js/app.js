import { verbs } from '../data/verbs.js';
import { phrases } from '../data/phrases.js';
import { markers } from '../data/markers.js';
import { initDialogues } from './dialogues.js';
import { initTasks }    from './tasks.js';
import { initAuth }     from './auth.js';
import { fetchLearnedWords, addLearnedWord, removeLearnedWord } from './api.js';

function isIrregular(verb) {
    const en   = verb.en.toLowerCase();
    const past = verb.past.split('/')[0].toLowerCase();
    if (past === en + 'ed') return false;
    if (past === en + 'd') return false;
    if (en.endsWith('e') && past === en.slice(0, -1) + 'ed') return false;
    if (en.endsWith('y') && !['ay','ey','oy','uy'].some(s => en.endsWith(s)) && past === en.slice(0,-1) + 'ied') return false;
    if (past === en + en[en.length - 1] + 'ed') return false;
    return true;
}

const irregularVerbs = verbs.filter(isIrregular);
const labels      = { verbs: 'Глагол', phrases: 'Фраза', markers: 'Маркер' };
const counts      = { verbs: 'глаголов', phrases: 'фраз', markers: 'маркеров' };
const modalTitles = { verbs: 'Глаголы', phrases: 'Фразы', markers: 'Маркеры' };

let currentMode   = 'verbs';
let verbFilter    = 'all'; // 'all' | 'irregular' | 'learned'
let sessionCount  = 0;
let currentItem   = null;
let learnedVerbs  = new Set();

function getCurrentDataset() {
    if (currentMode === 'verbs') {
        if (verbFilter === 'learned')   return verbs.filter(v => learnedVerbs.has(v.en));
        const base = verbFilter === 'irregular' ? irregularVerbs : verbs;
        return base.filter(v => !learnedVerbs.has(v.en));
    }
    if (currentMode === 'phrases') return phrases;
    return markers;
}

const cardWrapper  = document.getElementById('card-wrapper');
const cardElement  = document.getElementById('card-element');
const textFront    = document.getElementById('text-front');
const textBack     = document.getElementById('text-back');
const cardBadge    = document.getElementById('card-badge');
const counter      = document.getElementById('counter');
const subtitle     = document.getElementById('subtitle');
const btnVerbs     = document.getElementById('btn-verbs');
const btnPhrases   = document.getElementById('btn-phrases');
const btnMarkers   = document.getElementById('btn-markers');
const btnNext          = document.getElementById('btn-next-item');
const btnLearnedAction = document.getElementById('btn-learned-action');
const btnShowList      = document.getElementById('btn-show-list');
const cardsEmpty       = document.getElementById('cards-empty');
const cardsEmptyText   = document.getElementById('cards-empty-text');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle   = document.getElementById('modal-title');
const modalBody    = document.getElementById('modal-body');
const modalClose   = document.getElementById('modal-close');
const verbFilterEl = document.getElementById('verb-filter');

// ── Cards page ────────────────────────────────────────────

function updateSubtitle() {
    const data = getCurrentDataset();
    subtitle.textContent = `${data.length} ${counts[currentMode]} в наборе`;
}

function verbBackHTML(item, isEnglishFirst) {
    const hasDistinctV3 = item.v3 && item.v3 !== item.past;
    const formsHTML = hasDistinctV3
        ? `<p>Past (V2): <b>${item.past}</b></p><p>V3: <b>${item.v3}</b></p>`
        : `<p>Past/V3: <b>${item.past}</b></p>`;

    if (isEnglishFirst) {
        return `<h2>${item.ru}</h2>
            <div class="grammar">
                <p>Infinitive: <b>${item.en}</b></p>
                ${formsHTML}
            </div>`;
    }
    return `<h2>${item.en}</h2><div class="grammar">${formsHTML}</div>`;
}

function updateLearnedBtn() {
    if (currentMode !== 'verbs' || !currentItem) {
        btnLearnedAction.style.display = 'none';
        return;
    }
    btnLearnedAction.style.display = '';
    if (verbFilter === 'learned') {
        btnLearnedAction.textContent = 'Вернуть';
        btnLearnedAction.className = 'btn-return';
    } else {
        btnLearnedAction.textContent = '✓ Выучено';
        btnLearnedAction.className = 'btn-learned-action';
    }
}

function setEmptyState(msg) {
    cardsEmpty.style.display = '';
    cardsEmptyText.textContent = msg;
    cardWrapper.style.display = 'none';
    btnNext.style.display = 'none';
    btnLearnedAction.style.display = 'none';
    btnShowList.style.display = 'none';
    subtitle.textContent = '';
    counter.textContent = '';
}

function clearEmptyState() {
    cardsEmpty.style.display = 'none';
    cardWrapper.style.display = '';
    btnNext.style.display = '';
    btnShowList.style.display = '';
}

function updateUI() {
    const data = getCurrentDataset();

    if (data.length === 0) {
        const msg = verbFilter === 'learned'
            ? 'Выученных глаголов пока нет — нажми «✓ Выучено» на карточке'
            : 'Все глаголы выучены!';
        setEmptyState(msg);
        return;
    }

    clearEmptyState();
    cardWrapper.classList.add('switching');
    cardElement.classList.remove('is-flipped');

    setTimeout(() => {
        const item = data[Math.floor(Math.random() * data.length)];
        const isEnglishFirst = Math.random() > 0.5;

        currentItem = item;
        sessionCount++;
        counter.textContent = `показано за сессию: ${sessionCount}`;
        cardBadge.textContent = labels[currentMode];
        textFront.innerText = isEnglishFirst ? item.en : item.ru;

        if (currentMode === 'phrases' || currentMode === 'markers') {
            textBack.innerHTML = `<h2>${isEnglishFirst ? item.ru : item.en}</h2>`;
        } else {
            textBack.innerHTML = verbBackHTML(item, isEnglishFirst);
        }

        cardWrapper.classList.remove('switching');
        updateLearnedBtn();
    }, 300);
}

function handleTabClick(mode, activeBtn) {
    if (currentMode === mode) return;
    currentMode = mode;
    sessionCount = 0;
    currentItem = null;
    [btnVerbs, btnPhrases, btnMarkers].forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');
    verbFilterEl.style.display = mode === 'verbs' ? 'flex' : 'none';
    if (mode !== 'verbs') btnLearnedAction.style.display = 'none';
    updateSubtitle();
    updateUI();
}

// ── Modal ─────────────────────────────────────────────────

function openList() {
    const data = getCurrentDataset();
    const isVerbs = currentMode === 'verbs';
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
btnPhrases.addEventListener('click',    () => handleTabClick('phrases', btnPhrases));
btnMarkers.addEventListener('click',    () => handleTabClick('markers', btnMarkers));
btnNext.addEventListener('click', updateUI);
btnShowList.addEventListener('click', openList);
modalClose.addEventListener('click', closeList);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeList(); });

verbFilterEl.querySelectorAll('.verb-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        verbFilter = btn.dataset.filter;
        verbFilterEl.querySelectorAll('.verb-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        sessionCount = 0;
        currentItem = null;
        updateSubtitle();
        updateUI();
    });
});

btnLearnedAction.addEventListener('click', async () => {
    if (!currentItem) return;
    if (verbFilter === 'learned') {
        await removeLearnedWord('verbs', currentItem.en);
        learnedVerbs.delete(currentItem.en);
    } else {
        await addLearnedWord('verbs', currentItem.en);
        learnedVerbs.add(currentItem.en);
    }
    sessionCount = 0;
    updateSubtitle();
    updateUI();
});

// ── Init ──────────────────────────────────────────────────

fetchLearnedWords('verbs').then(set => {
    learnedVerbs = set;
    updateUI();
});

updateSubtitle();
updateUI();
