import { dialogues } from '../data/dialogues.js';
import { audioMap }  from '../data/audio-map.js';

export function initDialogues() {
    const titleEl   = document.getElementById('dial-title');
    const counterEl = document.getElementById('dial-counter');
    const listEl    = document.getElementById('dialogue-list');
    const btnPrev   = document.getElementById('dial-prev');
    const btnNext   = document.getElementById('dial-next');

    let current = 0;
    let activeAudio = null;

    function speak(text, btn) {
        // Останавливаем предыдущее воспроизведение
        if (activeAudio) {
            activeAudio.pause();
            activeAudio = null;
        }
        document.querySelectorAll('.speak-btn.speaking')
            .forEach(b => b.classList.remove('speaking'));

        const audioPath = audioMap[text];

        if (audioPath) {
            const audio = new Audio(audioPath);
            activeAudio = audio;
            btn.classList.add('speaking');
            audio.play();
            audio.onended  = () => { btn.classList.remove('speaking'); activeAudio = null; };
            audio.onerror  = () => { btn.classList.remove('speaking'); activeAudio = null; speakFallback(text, btn); };
        } else {
            speakFallback(text, btn);
        }
    }

    function speakFallback(text, btn) {
        if (!window.speechSynthesis) return;
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        btn.classList.add('speaking');
        utterance.onend   = () => btn.classList.remove('speaking');
        utterance.onerror = () => btn.classList.remove('speaking');
        speechSynthesis.speak(utterance);
    }

    function render() {
        const dialogue = dialogues[current];
        titleEl.textContent   = dialogue.title;
        counterEl.textContent = `${current + 1} / ${dialogues.length}`;
        btnPrev.disabled = current === 0;
        btnNext.disabled = current === dialogues.length - 1;

        listEl.innerHTML = dialogue.lines.map((line, i) => `
            <div class="dialogue-line ${i % 2 === 0 ? 'line-left' : 'line-right'}">
                <div class="dialogue-line-body">
                    <p class="dialogue-en">${line.en}</p>
                    <p class="dialogue-ru">${line.ru}</p>
                </div>
                <button class="speak-btn" data-index="${i}" title="Озвучить">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                    </svg>
                </button>
            </div>
        `).join('');

        listEl.querySelectorAll('.speak-btn').forEach((btn, i) => {
            btn.addEventListener('click', () => speak(dialogue.lines[i].en, btn));
        });
    }

    btnPrev.addEventListener('click', () => { if (current > 0)                       { current--; render(); } });
    btnNext.addEventListener('click', () => { if (current < dialogues.length - 1)   { current++; render(); } });

    render();
}
