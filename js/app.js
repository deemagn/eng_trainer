import { verbs } from '../data/verbs.js';
import { phrases } from '../data/phrases.js';
import { hardWords } from '../data/hard-words.js';
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
const labels      = { verbs: 'Глагол', phrases: 'Фраза', hard: 'Сложное' };
const counts      = { verbs: 'глаголов', phrases: 'фраз', hard: 'слов' };
const modalTitles = { verbs: 'Глаголы', phrases: 'Фразы', hard: 'Сложные слова' };

let currentMode   = 'verbs';
let verbFilter    = 'all'; // 'all' | 'irregular' | 'learned'
let sessionCount  = 0;
let currentItem   = null;
let learnedVerbs  = new Set();
let learnedHard   = new Set();
let preferredVoice = null;

function loadVoice() {
    const voices = speechSynthesis.getVoices();
    preferredVoice =
        voices.find(v => v.name === 'Google US English') ||
        voices.find(v => v.name === 'Samantha') ||
        voices.find(v => v.lang === 'en-US' && !v.localService) ||
        voices.find(v => v.lang === 'en-US') ||
        voices.find(v => v.lang.startsWith('en')) ||
        null;
}
speechSynthesis.addEventListener('voiceschanged', loadVoice);
loadVoice();

function getCurrentDataset() {
    if (currentMode === 'verbs') {
        if (verbFilter === 'learned')   return verbs.filter(v => learnedVerbs.has(v.en));
        const base = verbFilter === 'irregular' ? irregularVerbs : verbs;
        return base.filter(v => !learnedVerbs.has(v.en));
    }
    if (currentMode === 'phrases') return phrases;
    if (currentMode === 'hard') {
        if (verbFilter === 'learned') return hardWords.filter(w => learnedHard.has(w.en));
        return hardWords.filter(w => !learnedHard.has(w.en));
    }
    return [];
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
const btnHard      = document.getElementById('btn-hard');
const btnNext          = document.getElementById('btn-next-item');
const btnLearnedAction = document.getElementById('btn-learned-action');
const btnShowList      = document.getElementById('btn-show-list');
const btnSpeak         = document.getElementById('btn-speak');
const cardsEmpty       = document.getElementById('cards-empty');
const cardsEmptyText   = document.getElementById('cards-empty-text');
const learnedList      = document.getElementById('learned-list');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle   = document.getElementById('modal-title');
const modalBody    = document.getElementById('modal-body');
const modalClose   = document.getElementById('modal-close');
const verbFilterEl    = document.getElementById('verb-filter');
const engToggleEl     = document.getElementById('eng-toggle');
const engFirstToggle  = document.getElementById('eng-first-toggle');

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

function speakCurrentItem() {
    if (!currentItem || !window.speechSynthesis) return;
    speechSynthesis.cancel();
    let text;
    if (currentMode === 'verbs') {
        const past = currentItem.past.split('/')[0];
        const v3   = (currentItem.v3 || currentItem.past).split('/')[0];
        text = currentItem.tts ?? `${currentItem.en}, ${past}, ${v3}`;
    } else {
        text = currentItem.en;
    }
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-US';
    utt.rate = 0.85;
    if (preferredVoice) utt.voice = preferredVoice;
    btnSpeak.classList.add('speaking');
    utt.onend   = () => btnSpeak.classList.remove('speaking');
    utt.onerror = () => btnSpeak.classList.remove('speaking');
    speechSynthesis.speak(utt);
}

function updateLearnedBtn() {
    if ((currentMode !== 'verbs' && currentMode !== 'hard') || !currentItem) {
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

function renderLearnedList(data) {
    cardsEmpty.style.display    = 'none';
    cardWrapper.style.display   = 'none';
    btnNext.style.display       = 'none';
    btnLearnedAction.style.display = 'none';
    btnShowList.style.display   = 'none';
    btnSpeak.style.display      = 'none';
    engToggleEl.style.display   = 'none';
    counter.textContent         = '';
    subtitle.textContent = currentMode === 'hard'
        ? `Выучено: ${data.length} слов`
        : `Выучено: ${data.length} глаголов`;

    learnedList.style.display = '';

    const randomBlock = data.length >= 3 ? `
        <div class="random-pick-wrap">
            <button class="btn-random-pick" id="btn-random-pick">Выбрать три случайных</button>
            <div class="random-pick-display" id="random-pick-display"></div>
        </div>` : '';

    learnedList.innerHTML = randomBlock + data.map(v => {
        if (currentMode === 'hard') {
            return `
                <div class="ll-row">
                    <span class="ll-en">${v.en}</span>
                    <span class="ll-ru">${v.ru}</span>
                    <button class="ll-return-btn" data-en="${v.en}">Вернуть</button>
                </div>`;
        }
        const hasDistinctV3 = v.v3 && v.v3 !== v.past;
        const forms = hasDistinctV3
            ? `<span class="ll-forms">V2: <b>${v.past}</b> &nbsp; V3: <b>${v.v3}</b></span>`
            : `<span class="ll-forms">Past/V3: <b>${v.past}</b></span>`;
        return `
            <div class="ll-row">
                <span class="ll-en">${v.en}</span>
                <span class="ll-ru">${v.ru}</span>
                ${forms}
                <button class="ll-return-btn" data-en="${v.en}">Вернуть</button>
            </div>`;
    }).join('');

    document.getElementById('btn-random-pick')?.addEventListener('click', () => {
        const picked = [...data].sort(() => Math.random() - 0.5).slice(0, 3);
        document.getElementById('random-pick-display').innerHTML =
            picked.map(v => `<span class="random-word">${v.en}</span>`).join('');
    });

    learnedList.querySelectorAll('.ll-return-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (currentMode === 'hard') {
                await removeLearnedWord('hard', btn.dataset.en);
                learnedHard.delete(btn.dataset.en);
            } else {
                await removeLearnedWord('verbs', btn.dataset.en);
                learnedVerbs.delete(btn.dataset.en);
            }
            updateSubtitle();
            updateUI();
        });
    });
}

function setEmptyState(msg) {
    learnedList.style.display = 'none';
    cardsEmpty.style.display = '';
    cardsEmptyText.textContent = msg;
    cardWrapper.style.display = 'none';
    btnNext.style.display = 'none';
    btnLearnedAction.style.display = 'none';
    btnShowList.style.display = 'none';
    btnSpeak.style.display = 'none';
    engToggleEl.style.display = 'none';
    subtitle.textContent = '';
    counter.textContent = '';
}

function clearEmptyState() {
    learnedList.style.display = 'none';
    cardsEmpty.style.display = 'none';
    cardWrapper.style.display = '';
    btnNext.style.display = '';
    btnShowList.style.display = '';
    btnSpeak.style.display = '';
    engToggleEl.style.display = '';
}

function updateUI() {
    const data = getCurrentDataset();

    if (verbFilter === 'learned' && (currentMode === 'verbs' || currentMode === 'hard')) {
        if (data.length === 0) {
            const msg = currentMode === 'hard'
                ? 'Выученных слов пока нет — нажми «✓ Выучено» на карточке'
                : 'Выученных глаголов пока нет — нажми «✓ Выучено» на карточке';
            setEmptyState(msg);
        } else {
            renderLearnedList(data);
        }
        return;
    }

    if (data.length === 0) {
        const msg = currentMode === 'hard' ? 'Все слова выучены!' : 'Все глаголы выучены!';
        setEmptyState(msg);
        return;
    }

    clearEmptyState();
    cardWrapper.classList.add('switching');
    cardElement.classList.remove('is-flipped');

    setTimeout(() => {
        const item = data[Math.floor(Math.random() * data.length)];
        const isEnglishFirst = engFirstToggle.checked || Math.random() > 0.5;

        currentItem = item;
        sessionCount++;
        counter.textContent = `показано за сессию: ${sessionCount}`;
        cardBadge.textContent = labels[currentMode];
        textFront.innerText = isEnglishFirst ? item.en : item.ru;

        if (currentMode === 'phrases' || currentMode === 'hard') {
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
    [btnVerbs, btnPhrases, btnHard].forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');

    const showFilter = mode === 'verbs' || mode === 'hard';
    verbFilterEl.style.display = showFilter ? 'flex' : 'none';

    const irregularBtn = verbFilterEl.querySelector('[data-filter="irregular"]');
    if (irregularBtn) irregularBtn.style.display = mode === 'verbs' ? '' : 'none';

    if (mode !== 'verbs' && verbFilter === 'irregular') {
        verbFilter = 'all';
        verbFilterEl.querySelectorAll('.verb-filter-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.filter === 'all');
        });
    }

    if (mode !== 'verbs' && mode !== 'hard') btnLearnedAction.style.display = 'none';
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
btnHard.addEventListener('click',       () => handleTabClick('hard',    btnHard));
btnNext.addEventListener('click', updateUI);
btnSpeak.addEventListener('click', speakCurrentItem);
engFirstToggle.addEventListener('change', updateUI);
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
    const category = currentMode === 'hard' ? 'hard' : 'verbs';
    const learnedSet = currentMode === 'hard' ? learnedHard : learnedVerbs;
    if (verbFilter === 'learned') {
        await removeLearnedWord(category, currentItem.en);
        learnedSet.delete(currentItem.en);
    } else {
        await addLearnedWord(category, currentItem.en);
        learnedSet.add(currentItem.en);
    }
    sessionCount = 0;
    updateSubtitle();
    updateUI();
});

// ── Init ──────────────────────────────────────────────────

Promise.all([
    fetchLearnedWords('verbs'),
    fetchLearnedWords('hard'),
]).then(([verbSet, hardSet]) => {
    learnedVerbs = verbSet;
    learnedHard  = hardSet;
    updateUI();
});

updateSubtitle();
updateUI();
