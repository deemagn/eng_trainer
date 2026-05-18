import { grammarContextTask } from '../../data/tasks/grammar-context.js';

export function initGrammarContextTask(container) {
    const { sentences, contexts } = grammarContextTask;

    const state = {
        current: 0,
        answers: {}, // sentenceIndex → contextId
    };

    container.innerHTML = `
        <div class="task-grammar">
            <div class="task-sentence-nav">
                <button class="task-nav-btn" id="gc-prev">←</button>
                <div class="task-sentence-wrap">
                    <p class="task-sentence" id="gc-sentence"></p>
                    <p class="task-nav-counter" id="gc-counter"></p>
                </div>
                <button class="task-nav-btn" id="gc-next">→</button>
            </div>
            <div class="task-options" id="gc-options"></div>
            <p class="task-progress" id="gc-progress"></p>
        </div>
    `;

    const sentenceEl = document.getElementById('gc-sentence');
    const counterEl  = document.getElementById('gc-counter');
    const optionsEl  = document.getElementById('gc-options');
    const progressEl = document.getElementById('gc-progress');
    const prevBtn    = document.getElementById('gc-prev');
    const nextBtn    = document.getElementById('gc-next');

    function usedContextIds() {
        return new Set(Object.values(state.answers));
    }

    function render() {
        const i        = state.current;
        const sentence = sentences[i];
        const answered = state.answers[i];
        const used     = usedContextIds();

        sentenceEl.textContent = sentence.text;
        counterEl.textContent  = `${i + 1} / ${sentences.length}`;
        prevBtn.disabled       = i === 0;
        nextBtn.disabled       = i === sentences.length - 1;

        const answeredTotal = Object.keys(state.answers).length;
        progressEl.textContent = `Выполнено: ${answeredTotal} / ${sentences.length}`;

        const visible = answered !== undefined
            ? contexts.filter(c => c.id === answered)
            : contexts.filter(c => !used.has(c.id));

        optionsEl.innerHTML = visible.map(c => `
            <button class="context-option${answered === c.id ? ' correct' : ''}" data-id="${c.id}">
                <span class="context-option-letter">${c.id}</span>
                <span class="context-option-text">${c.text}</span>
            </button>
        `).join('');

        if (answered === undefined) {
            optionsEl.querySelectorAll('.context-option').forEach(btn => {
                btn.addEventListener('click', () => handleAnswer(btn.dataset.id, btn));
            });
        }
    }

    function handleAnswer(contextId, btn) {
        const correct = sentences[state.current].answer;

        if (contextId === correct) {
            // Блокируем все кнопки
            optionsEl.querySelectorAll('.context-option').forEach(b => b.style.pointerEvents = 'none');

            // Правильный — зелёный
            btn.classList.add('correct');

            // Остальные — схлопываем
            optionsEl.querySelectorAll('.context-option').forEach(b => {
                if (b !== btn) b.classList.add('hiding');
            });

            // После анимации — сохраняем и перерисовываем
            setTimeout(() => {
                state.answers[state.current] = contextId;
                render();
                // Добавляем анимацию "въезда" на место
                requestAnimationFrame(() => {
                    optionsEl.querySelector('.correct')?.classList.add('arrived');
                });
            }, 380);
        } else {
            btn.classList.add('wrong');
            setTimeout(() => btn.classList.remove('wrong'), 550);
        }
    }

    prevBtn.addEventListener('click', () => { if (state.current > 0) { state.current--; render(); } });
    nextBtn.addEventListener('click', () => { if (state.current < sentences.length - 1) { state.current++; render(); } });

    render();
}
