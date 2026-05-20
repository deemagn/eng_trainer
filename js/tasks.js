import { variants as grammarContextPresent } from '../data/tasks/grammar-context-present.js';
import { textFillTasks }                    from '../data/tasks/text-fill-present.js';
import { textFillStativeTasks }             from '../data/tasks/text-fill-stative.js';
import { initGrammarContextTask } from './tasks/grammar-context.js';
import { initTextFillTask }       from './tasks/text-fill.js';
import { saveTaskProgress, fetchCompletedTasks } from './api.js';

const taskGroups = [
    {
        type:        'grammar-context',
        title:       '🎯 Выбрать контекст для времён Present',
        description: '10 предложений — определи контекст',
        prefix:      'grammar-context',
        data:        grammarContextPresent,
    },
    {
        type:        'text-fill',
        title:       '✍️ Текст с применением времён Present',
        description: 'Вставь правильную форму глагола',
        prefix:      'text-fill',
        data:        textFillTasks,
    },
    {
        type:        'text-fill',
        title:       '✍️ Применение Stative Verbs',
        description: 'Вставь правильную форму глагола',
        prefix:      'text-fill-stative',
        data:        textFillStativeTasks,
    },
    {
        type:        'grammar-context',
        title:       '🎯 Выбрать контекст для времён Past',
        description: '10 предложений — определи контекст',
        prefix:      'grammar-context-past',
        data:        [],
    },
    {
        type:        'grammar-context',
        title:       '🎯 Выбрать контекст для времён Future',
        description: '10 предложений — определи контекст',
        prefix:      'grammar-context-future',
        data:        [],
    },
];

function buildVariants(group) {
    return group.data.map((item, i) => {
        const id    = `${group.prefix}-${i + 1}`;
        const label = `${i + 1}`;
        if (group.type === 'grammar-context') {
            return { id, label, init: (c, cb) => initGrammarContextTask(c, item.sentences, cb) };
        }
        if (group.type === 'text-fill') {
            return { id, label, init: (c, cb) => initTextFillTask(c, item, cb) };
        }
    });
}

// Строим варианты и быстрый поиск по id
const builtGroups = taskGroups.map(g => ({ ...g, variants: buildVariants(g) }));

const variantMap = {};
builtGroups.forEach(g => g.variants.forEach(v => { variantMap[v.id] = v; }));

export async function initTasks(switchPage) {
    const listEl      = document.getElementById('tasks-list');
    const viewContent = document.getElementById('task-view-content');
    const backBtn     = document.getElementById('task-back-btn');

    listEl.innerHTML = builtGroups.map(g => `
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
        </div>`).join('');

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
