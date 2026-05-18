export function initTextFillTask(container, texts) {
    let current = 0;

    // Состояние каждого текста: Set правильно заполненных id
    const states = texts.map(() => new Set());

    container.innerHTML = `
        <div class="text-fill-task">
            <div class="text-fill-nav">
                <button class="task-nav-btn" id="tf-prev">←</button>
                <div class="text-fill-nav-center">
                    <p class="text-fill-title" id="tf-title"></p>
                    <p class="task-nav-counter" id="tf-counter"></p>
                </div>
                <button class="task-nav-btn" id="tf-next">→</button>
            </div>
            <div class="text-fill-letter" id="tf-letter"></div>
            <p class="task-progress" id="tf-progress"></p>
        </div>
    `;

    const prevBtn    = document.getElementById('tf-prev');
    const nextBtn    = document.getElementById('tf-next');
    const titleEl    = document.getElementById('tf-title');
    const counterEl  = document.getElementById('tf-counter');
    const letterEl   = document.getElementById('tf-letter');
    const progressEl = document.getElementById('tf-progress');

    function renderLetter() {
        const task       = texts[current];
        const state      = states[current];
        const totalBlanks = Object.keys(task.answers).length;

        titleEl.textContent   = task.title;
        counterEl.textContent = `${current + 1} / ${texts.length}`;
        prevBtn.disabled      = current === 0;
        nextBtn.disabled      = current === texts.length - 1;

        letterEl.innerHTML = task.segments.map(seg => {
            if (seg.type === 'text') {
                return seg.content
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/\n/g, '<br>');
            }
            const done = state.has(seg.id);
            return `<input
                class="blank-input${done ? ' correct' : ''}"
                data-id="${seg.id}"
                value="${done ? texts[current].answers[seg.id][0] : ''}"
                ${done ? 'disabled' : ''}
                autocomplete="off" autocorrect="off"
                autocapitalize="off" spellcheck="false"
                placeholder="···"
            >`;
        }).join('');

        updateProgress(state, totalBlanks);

        const inputs = [...letterEl.querySelectorAll('.blank-input:not([disabled])')];
        inputs.forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); checkAnswer(input); }
            });
            input.addEventListener('blur', () => checkAnswer(input));
        });

        inputs[0]?.focus();
    }

    function updateProgress(state, total) {
        progressEl.textContent = `Правильно: ${state.size} / ${total}`;
    }

    function checkAnswer(input) {
        if (input.disabled) return;
        const value = input.value.trim().toLowerCase();
        if (!value) return;

        const task    = texts[current];
        const state   = states[current];
        const id      = parseInt(input.dataset.id);
        const correct = task.answers[id].map(a => a.toLowerCase());

        if (correct.includes(value)) {
            input.classList.add('correct');
            input.disabled = true;
            state.add(id);
            updateProgress(state, Object.keys(task.answers).length);
            const next = letterEl.querySelector('.blank-input:not([disabled])');
            if (next) next.focus();
        } else {
            input.classList.remove('wrong');
            void input.offsetWidth;
            input.classList.add('wrong');
            setTimeout(() => input.classList.remove('wrong'), 550);
        }
    }

    prevBtn.addEventListener('click', () => { if (current > 0)              { current--; renderLetter(); } });
    nextBtn.addEventListener('click', () => { if (current < texts.length-1) { current++; renderLetter(); } });

    renderLetter();
}
