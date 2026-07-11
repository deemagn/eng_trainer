import { readingTexts } from '../data/reading-texts.js';

let preferredVoice = null;

function loadVoice() {
    const voices = speechSynthesis.getVoices();
    preferredVoice =
        voices.find(v => v.lang === 'en-US' && v.name.includes('Samantha')) ||
        voices.find(v => v.lang === 'en-US') ||
        voices.find(v => v.lang.startsWith('en')) ||
        null;
}

function speak(word) {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(word);
    utt.lang = 'en-US';
    utt.rate = 0.8;
    if (preferredVoice) utt.voice = preferredVoice;
    speechSynthesis.speak(utt);
}

// Split "word," → pre="" word="word" post=","
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

export function initReading() {
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoice;
    }
    loadVoice();

    const text = readingTexts[0];

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
            <div class="reading-popup" id="reading-popup">
                <span class="rp-word" id="rp-word"></span>
                <span class="rp-sep">—</span>
                <span class="rp-ru" id="rp-ru"></span>
            </div>
        </div>`;

    const popup  = pageEl.querySelector('#reading-popup');
    const rpWord = pageEl.querySelector('#rp-word');
    const rpRu   = pageEl.querySelector('#rp-ru');

    pageEl.querySelector('#reading-body').addEventListener('click', e => {
        const span = e.target.closest('.rw');
        if (!span) return;

        const key         = span.dataset.key;
        const wordDisplay = span.textContent;
        const translation = text.translations[key] || '';

        speak(wordDisplay);

        rpWord.textContent = wordDisplay;
        rpRu.textContent   = translation || '—';
        popup.classList.add('visible');

        pageEl.querySelectorAll('.rw.active').forEach(el => el.classList.remove('active'));
        span.classList.add('active');
    });
}
