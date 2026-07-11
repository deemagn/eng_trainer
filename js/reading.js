import { readingTexts } from '../data/reading-texts.js';

let preferredVoice = null;

function loadVoice() {
    const voices = speechSynthesis.getVoices();
    preferredVoice =
        voices.find(v => v.name === 'Google US English') ||
        voices.find(v => v.lang === 'en-US' && !v.localService) ||
        voices.find(v => v.lang === 'en-US') ||
        voices.find(v => v.lang.startsWith('en')) ||
        null;
}

speechSynthesis.addEventListener('voiceschanged', loadVoice);
loadVoice();

function speak(word) {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(word);
    utt.lang = 'en-US';
    utt.rate = 0.8;
    if (preferredVoice) utt.voice = preferredVoice;
    speechSynthesis.speak(utt);
}

// Build HTML with multi-word phrases detected first (longest match wins)
function buildParagraphHTML(para, translations) {
    const phrases = Object.keys(translations)
        .filter(k => k.includes(' '))
        .sort((a, b) => b.split(' ').length - a.split(' ').length);

    const parts = para.split(/(\s+)/);
    const out = [];
    let i = 0;

    while (i < parts.length) {
        const part = parts[i];

        if (/^\s+$/.test(part)) { out.push(part); i++; continue; }

        const clean = part.replace(/[^a-zA-Z']/g, '').toLowerCase();
        if (!clean) { out.push(part); i++; continue; }

        // Try longest phrase first
        let hit = false;
        for (const phrase of phrases) {
            const pw = phrase.split(' ');
            if (pw[0] !== clean) continue;

            // Collect next pw.length non-space tokens
            const wIdx = [];
            let j = i;
            while (wIdx.length < pw.length && j < parts.length) {
                if (/^\s+$/.test(parts[j])) { j++; continue; }
                wIdx.push(j);
                j++;
            }
            if (wIdx.length < pw.length) continue;
            if (!pw.every((w, k) => parts[wIdx[k]].replace(/[^a-zA-Z']/g, '').toLowerCase() === w)) continue;

            const pre     = parts[wIdx[0]].match(/^[^a-zA-Z']*/)?.[0] ?? '';
            const post    = parts[wIdx[wIdx.length - 1]].match(/[^a-zA-Z']*$/)?.[0] ?? '';
            const display = wIdx.map(k => parts[k].replace(/[^a-zA-Z']/g, '')).join(' ');

            out.push(`${pre}<span class="rw" data-key="${phrase}">${display}</span>${post}`);
            i = j;
            hit = true;
            break;
        }

        if (!hit) {
            const m = part.match(/^([^a-zA-Z']*)([a-zA-Z']+)([^a-zA-Z']*)$/);
            out.push(m
                ? `${m[1]}<span class="rw" data-key="${m[2].toLowerCase()}">${m[2]}</span>${m[3]}`
                : part
            );
            i++;
        }
    }

    return out.join('');
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
                ${text.paragraphs.map(p => `<p class="reading-para">${buildParagraphHTML(p, text.translations)}</p>`).join('')}
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
