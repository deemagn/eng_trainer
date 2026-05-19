import { variants }            from '../data/tasks/grammar-context-present.js';
import { barcelonaTask, newApartmentTask } from '../data/tasks/text-fill-present.js';
import { initGrammarContextTask } from './tasks/grammar-context.js';
import { initTextFillTask }       from './tasks/text-fill.js';
import { saveTaskProgress, fetchCompletedTasks } from './api.js';

const taskGroups = [
    {
        type:        'variants',
        title:       '🎯 Выбрать контекст для времён Present',
        description: '10 предложений — определи контекст',
        variants:    variants.map((v, i) => ({
            id:    `grammar-context-${i + 1}`,
            label: `${i + 1}`,
            init:  (container, onComplete) => initGrammarContextTask(container, v.sentences, onComplete),
        })),
    },
    {
        type:        'variants',
        title:       '✍️ Текст с применением времён Present',
        description: 'Вставь правильную форму глагола',
        variants: [
            { id: 'text-fill-1', label: '1', init: (c, cb) => initTextFillTask(c, barcelonaTask, cb) },
            { id: 'text-fill-2', label: '2', init: (c, cb) => initTextFillTask(c, newApartmentTask, cb) },
        ],
    },
    {
        type:        'variants',
        title:       '🎯 Выбрать контекст для времён Past',
        description: '10 предложений — определи контекст',
        variants:    [],
    },
    {
        type:        'variants',
        title:       '🎯 Выбрать контекст для времён Future',
        description: '10 предложений — определи контекст',
        variants:    [],
    },
];

// Быстрый поиск по id
const variantMap = {};
taskGroups.forEach(g => {
    if (g.type === 'single') {
        variantMap[g.id] = g;
    } else {
        g.variants.forEach(v => { variantMap[v.id] = v; });
    }
});

export async function initTasks(switchPage) {
    const listEl      = document.getElementById('tasks-list');
    const viewContent = document.getElementById('task-view-content');
    const backBtn     = document.getElementById('task-back-btn');

    listEl.innerHTML = taskGroups.map(g => {
        if (g.type === 'single') {
            return `
                <div class="task-group task-group--single" data-id="${g.id}">
                    <div class="task-group-info">
                        <h3 class="task-card-title">${g.title}</h3>
                        <p class="task-card-desc">${g.description}</p>
                    </div>
                    <span class="task-group-arrow">→</span>
                </div>`;
        }
        return `
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
            </div>`;
    }).join('');

    function markCompleted(variantId) {
        const pill = listEl.querySelector(`.variant-pill[data-id="${variantId}"]`);
        if (pill) pill.classList.add('completed');
    }

    async function onTaskComplete(variantId) {
        await saveTaskProgress(variantId);
        markCompleted(variantId);
    }

    function openTask(item) {
        viewContent.innerHTML = '';
        item.init(viewContent, () => onTaskComplete(item.id));
        switchPage('task-view');
        document.querySelector('[data-page="tasks"]')?.classList.add('active');
    }

    listEl.addEventListener('click', (e) => {
        const single = e.target.closest('.task-group--single');
        if (single) { const item = variantMap[single.dataset.id]; if (item) openTask(item); return; }

        const pill = e.target.closest('.variant-pill');
        if (pill)   { const item = variantMap[pill.dataset.id];   if (item) openTask(item); }
    });

    backBtn.addEventListener('click', () => switchPage('tasks'));

    // Подсветить завершённые задания
    fetchCompletedTasks().then(completed => {
        completed.forEach(id => markCompleted(id));
    });
}
