import { initGrammarContextTask } from './tasks/grammar-context.js';

const taskRegistry = [
    {
        id:          'grammar-context',
        title:       'Контекст употребления времён',
        description: '10 предложений — определи контекст',
        init:        initGrammarContextTask,
    },
];

export function initTasks(switchPage) {
    const listEl      = document.getElementById('tasks-list');
    const viewContent = document.getElementById('task-view-content');
    const backBtn     = document.getElementById('task-back-btn');

    listEl.innerHTML = taskRegistry.map(t => `
        <button class="task-card" data-id="${t.id}">
            <div class="task-card-body">
                <h3 class="task-card-title">${t.title}</h3>
                <p class="task-card-desc">${t.description}</p>
            </div>
            <span class="task-card-chevron">→</span>
        </button>
    `).join('');

    listEl.addEventListener('click', (e) => {
        const card = e.target.closest('.task-card');
        if (!card) return;
        const task = taskRegistry.find(t => t.id === card.dataset.id);
        if (!task) return;

        viewContent.innerHTML = '';
        task.init(viewContent);
        switchPage('task-view');
        document.querySelector('[data-page="tasks"]')?.classList.add('active');
    });

    backBtn.addEventListener('click', () => switchPage('tasks'));
}
