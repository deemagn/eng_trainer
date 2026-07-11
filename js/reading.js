import { readingTexts } from '../data/reading-texts.js';

function speak(word) {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(word);
    utt.lang = 'en-US';
    utt.rate = 0.8;
    speechSynthesis.speak(utt);
}

function tokenize(text) {
    return text.split(' ').map(token => {
        const m = token.match(/^([^a-zA-Z']*)([a-zA-Z']+)([^a-zA-Z']*)$/);
        if (!m) return { type: 'punct', raw: token };
        return { type: 'word', pre: m[1], word: m[2], post: m[3], key: m[2].toLowerCase() };
    });
}

function buildParagraphHTML(para) {
    return tokenize(para).map(t => {
        if (t.type === 'punct') return t.raw;
        return `${t.pre}<span class="rw" data-key="${t.key}">${t.word}</span>${t.post}`;
    }).join(' ');
}

function positionTooltip(tooltip, anchor) {
    const r = anchor.getBoundingClientRect();
    const tw = tooltip.offsetWidth;
    const margin = 8;

    // Center above the word
    let left = r.left + r.width / 2 - tw / 2;
    // Clamp to viewport edges
    left = Math.max(margin, Math.min(left, window.innerWidth - tw - margin));

    tooltip.style.left = `${left}px`;
    tooltip.style.top  = `${r.top + window.scrollY - tooltip.offsetHeight - 12}px`;

    // Shift arrow to point at the actual word center
    const arrowLeft = r.left + r.width / 2 - left;
    tooltip.style.setProperty('--arrow-left', `${arrowLeft}px`);
}

export function initReading() {
    const text  = readingTexts[0];
    const pageEl = document.getElementById('page-reading');

    pageEl.innerHTML = `
        <div class="reading-wrap">
            <div class="reading-text-header">
                <h2 class="reading-title">${text.title}</h2>
                <p class="reading-title-ru">${text.titleRu}</p>
            </div>
            <div class="reading-body" id="reading-body">
                ${text.paragraphs.map(p => `<p class="reading-para">${buildParagraphHTML(p)}</p>`).join('')}
            </div>
        </div>`;

    // Tooltip lives in body so it's not clipped by overflow:hidden containers
    let tooltip = document.getElementById('rw-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'rw-tooltip';
        tooltip.className = 'rw-tooltip';
        tooltip.innerHTML = `<span class="rwt-word"></span><span class="rwt-sep">—</span><span class="rwt-ru"></span>`;
        document.body.appendChild(tooltip);
    }
    const rwtWord = tooltip.querySelector('.rwt-word');
    const rwtRu   = tooltip.querySelector('.rwt-ru');

    function hideTooltip() {
        tooltip.classList.remove('visible');
        pageEl.querySelectorAll('.rw.active').forEach(el => el.classList.remove('active'));
    }

    pageEl.querySelector('#reading-body').addEventListener('click', e => {
        const span = e.target.closest('.rw');
        if (!span) { hideTooltip(); return; }

        const key         = span.dataset.key;
        const wordDisplay = span.textContent;
        const translation = text.translations[key] || '';

        speak(wordDisplay);

        rwtWord.textContent = wordDisplay;
        rwtRu.textContent   = translation || '—';

        // Show off-screen first to measure, then position
        tooltip.style.visibility = 'hidden';
        tooltip.classList.add('visible');
        positionTooltip(tooltip, span);
        tooltip.style.visibility = '';

        pageEl.querySelectorAll('.rw.active').forEach(el => el.classList.remove('active'));
        span.classList.add('active');
    });

    document.addEventListener('click', e => {
        if (!e.target.closest('.rw') && !e.target.closest('#rw-tooltip')) {
            hideTooltip();
        }
    });
}
