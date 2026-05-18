import { variants } from '../data/tasks/grammar-context.js';
import { initGrammarContextTask } from './tasks/grammar-context.js';

const taskGroups = [
    {
        title:       '🎯 Выбрать контекст для времён Present',
        description: '10 предложений — определи контекст',
        variants:    variants.map((v, i) => ({
            id:   `grammar-context-${i + 1}`,
            label: `${i + 1}`,
            init: (container) => initGrammarContextTask(container, v.sentences),
        })),
    },
];

export function initTasks(switchPage) {
    const listEl      = document.getElementById('tasks-list');
    const viewContent = document.getElementById('task-view-content');
    const backBtn     = document.getElementById('task-back-btn');

    // Flat map for quick lookup when a variant is clicked
    const variantMap = {};
    taskGroups.forEach(g => g.variants.forEach(v => { variantMap[v.id] = v; }));

    listEl.innerHTML = taskGroups.map(g => `
        <div class="task-group">
            <div class="task-group-info">
                <h3 class="task-card-title">${g.title}</h3>
                <p class="task-card-desc">${g.description}</p>
            </div>
            <div class="task-variant-pills">
                ${g.variants.map(v => `
                    <button class="variant-pill" data-id="${v.id}">${v.label}</button>
                `).join('')}
            </div>
        </div>
    `).join('');

    listEl.addEventListener('click', (e) => {
        const pill = e.target.closest('.variant-pill');
        if (!pill) return;
        const variant = variantMap[pill.dataset.id];
        if (!variant) return;

        viewContent.innerHTML = '';
        variant.init(viewContent);
        switchPage('task-view');
        document.querySelector('[data-page="tasks"]')?.classList.add('active');
    });

    backBtn.addEventListener('click', () => switchPage('tasks'));
}
