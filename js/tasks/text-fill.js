export function initTextFillTask(container, task) {
    const totalBlanks = Object.keys(task.answers).length;
    const correct     = new Set();

    const letterHtml = task.segments.map(seg => {
        if (seg.type === 'text') {
            return seg.content
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/\n/g, '<br>');
        }
        return `<input
            class="blank-input"
            data-id="${seg.id}"
            autocomplete="off" autocorrect="off"
            autocapitalize="off" spellcheck="false"
            placeholder="···"
        >`;
    }).join('');

    container.innerHTML = `
        <div class="text-fill-task">
            <div class="text-fill-letter">${letterHtml}</div>
            <p class="task-progress" id="tf-progress">Правильно: 0 / ${totalBlanks}</p>
        </div>
    `;

    const progressEl = container.querySelector('#tf-progress');
    const allInputs  = [...container.querySelectorAll('.blank-input')];

    function updateProgress() {
        progressEl.textContent = `Правильно: ${correct.size} / ${totalBlanks}`;
    }

    function checkAnswer(input) {
        if (input.disabled) return;
        const value = input.value.trim().toLowerCase();
        if (!value) return;

        const id      = parseInt(input.dataset.id);
        const answers = task.answers[id].map(a => a.toLowerCase());

        if (answers.includes(value)) {
            input.classList.add('correct');
            input.disabled = true;
            correct.add(id);
            updateProgress();
            const next = allInputs.find(i => !i.disabled);
            if (next) next.focus();
        } else {
            input.classList.remove('wrong');
            void input.offsetWidth;
            input.classList.add('wrong');
            setTimeout(() => input.classList.remove('wrong'), 550);
        }
    }

    allInputs.forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); checkAnswer(input); }
        });
        input.addEventListener('blur', () => checkAnswer(input));
    });

    allInputs[0]?.focus();
}
