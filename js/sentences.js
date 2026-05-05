import { sentences } from '../data/sentences.js';

export function initSentences() {
    const cardWrapper = document.getElementById('sent-card-wrapper');
    const cardElement = document.getElementById('sent-card-element');
    const textFront   = document.getElementById('sent-text-front');
    const textBack    = document.getElementById('sent-text-back');
    const counter     = document.getElementById('sent-counter');
    const btnNext     = document.getElementById('sent-btn-next');
    const subtitle    = document.getElementById('sent-subtitle');

    let sessionCount = 0;
    subtitle.textContent = `${sentences.length} предложений в наборе`;

    function updateUI() {
        cardWrapper.classList.add('switching');
        cardElement.classList.remove('is-flipped');

        setTimeout(() => {
            const item = sentences[Math.floor(Math.random() * sentences.length)];
            const isEnglishFirst = Math.random() > 0.5;

            sessionCount++;
            counter.textContent = `показано за сессию: ${sessionCount}`;
            textFront.innerText = isEnglishFirst ? item.en : item.ru;
            textBack.innerHTML  = `<h2>${isEnglishFirst ? item.ru : item.en}</h2>`;

            cardWrapper.classList.remove('switching');
        }, 300);
    }

    function flip() {
        cardElement.classList.toggle('is-flipped');
    }

    cardWrapper.addEventListener('click', flip);
    btnNext.addEventListener('click', updateUI);

    updateUI();

    return { updateUI, flip };
}
