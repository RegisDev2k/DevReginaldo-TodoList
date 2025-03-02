document.addEventListener('DOMContentLoaded', () => {
    // Elementos do DOM
    const taskInput = document.querySelector('.task-input');
    const addButton = document.querySelector('.add-button');
    const taskList = document.getElementById('taskList');
    const tabs = document.querySelectorAll('.tab');
    const prioritySelector = document.querySelector('.priority-selector');
    const categorySelector = document.querySelector('.category-selector');
    const dateInput = document.querySelector('.date-input');
    const taskOptions = document.getElementById('taskOptions');
    const searchToggle = document.getElementById('searchToggle');
    const searchContainer = document.getElementById('searchContainer');
    const searchInput = document.querySelector('.search-input');
    const sortTasksButton = document.getElementById('sortTasks');
    const exportTasksButton = document.getElementById('exportTasks');
    const themeToggleButton = document.getElementById('themeToggle');
    const pendingTasksCount = document.querySelector('.pending-tasks');
    const completedTasksCount = document.querySelector('.completed-tasks');
    const progressBar = document.getElementById('progressBar');
    const emptyState = document.getElementById('emptyState');
    const emptyAddTaskButton = document.getElementById('emptyAddTask');
    
    // Modais
    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('editForm');
    const editTaskText = document.getElementById('editTaskText');
    const editPriority = document.getElementById('editPriority');
    const editCategory = document.getElementById('editCategory');
    const editDueDate = document.getElementById('editDueDate');
    const cancelEditButton = document.getElementById('cancelEdit');
    const confirmEditButton = document.getElementById('confirmEdit');
    const closeModalButtons = document.querySelectorAll('.close-modal');
    
    const confirmModal = document.getElementById('confirmModal');
    const confirmMessage = document.getElementById('confirmMessage');
    const cancelActionButton = document.getElementById('cancelAction');
    const confirmActionButton = document.getElementById('confirmAction');
    
    const exportModal = document.getElementById('exportModal');
    const exportFormat = document.getElementById('exportFormat');
    const exportType = document.getElementById('exportType');
    const cancelExportButton = document.getElementById('cancelExport');
    const confirmExportButton = document.getElementById('confirmExport');
    
    const notification = document.getElementById('notification');
    const notificationClose = document.querySelector('.notification-close');

    // Estado da aplicação
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let currentFilter = 'all';
    let editingTaskId = null;
    let currentSort = { field: 'createdAt', direction: 'desc' };
    let confirmCallback = null;

    // Inicialização
    renderTasks();
    updateStats();

    // Funções de manipulação de tarefas
    function addTask() {
        const text = taskInput.value.trim();
        if (text === '') {
            showNotification('Erro', 'A descrição da tarefa não pode estar vazia.', 'error');
            return;
        }

        const task = {
            id: Date.now(),
            text: text,
            completed: false,
            createdAt: new Date().toISOString(),
            priority: prioritySelector.value !== 'none' ? prioritySelector.value : null,
            category: categorySelector.value !== 'none' ? categorySelector.value : null,
            dueDate: dateInput.value !== '' ? dateInput.value : null
        };

        tasks.unshift(task);
        saveTasks();
        resetForm();
        renderTasks();
        showNotification('Sucesso', 'Tarefa adicionada com sucesso!', 'success');
    }

    function toggleTaskCompletion(id) {
        const taskIndex = tasks.findIndex(task => task.id === id);
        if (taskIndex !== -1) {
            tasks[taskIndex].completed = !tasks[taskIndex].completed;
            tasks[taskIndex].completedAt = tasks[taskIndex].completed ? new Date().toISOString() : null;
            saveTasks();
            renderTasks();
            updateStats();
            
            const status = tasks[taskIndex].completed ? 'concluída' : 'marcada como pendente';
            showNotification('Tarefa atualizada', `A tarefa foi ${status} com sucesso!`, 'success');
        }
    }

    function deleteTask(id) {
        confirmMessage.textContent = 'Tem certeza que deseja excluir esta tarefa?';
        openModal(confirmModal);
        
        confirmCallback = () => {
            const taskIndex = tasks.findIndex(task => task.id === id);
            if (taskIndex !== -1) {
                tasks.splice(taskIndex, 1);
                saveTasks();
                renderTasks();
                updateStats();
                showNotification('Tarefa excluída', 'A tarefa foi excluída com sucesso!', 'success');
            }
        };
    }

    function editTask(id) {
        const task = tasks.find(task => task.id === id);
        if (task) {
            editingTaskId = id;
            editTaskText.value = task.text;
            editPriority.value = task.priority || 'none';
            editCategory.value = task.category || 'none';
            editDueDate.value = task.dueDate || '';
            openModal(editModal);
        }
    }

    function saveEditedTask() {
        if (editingTaskId === null) return;
        
        const taskIndex = tasks.findIndex(task => task.id === editingTaskId);
        if (taskIndex !== -1) {
            const text = editTaskText.value.trim();
            if (text === '') {
                showNotification('Erro', 'A descrição da tarefa não pode estar vazia.', 'error');
                return;
            }
            
            tasks[taskIndex].text = text;
            tasks[taskIndex].priority = editPriority.value !== 'none' ? editPriority.value : null;
            tasks[taskIndex].category = editCategory.value !== 'none' ? editCategory.value : null;
            tasks[taskIndex].dueDate = editDueDate.value !== '' ? editDueDate.value : null;
            tasks[taskIndex].updatedAt = new Date().toISOString();
            
            saveTasks();
            renderTasks();
            closeModal(editModal);
            showNotification('Tarefa atualizada', 'A tarefa foi atualizada com sucesso!', 'success');
        }
    }

    // Funções de filtragem e ordenação
    function filterTasks() {
        let filteredTasks = [...tasks];
        
        // Filtro por tab (all, active, completed)
        if (currentFilter === 'active') {
            filteredTasks = filteredTasks.filter(task => !task.completed);
        } else if (currentFilter === 'completed') {
            filteredTasks = filteredTasks.filter(task => task.completed);
        }
        
        // Filtro por busca
        const searchText = searchInput.value.toLowerCase().trim();
        if (searchText !== '') {
            filteredTasks = filteredTasks.filter(task => 
                task.text.toLowerCase().includes(searchText) || 
                (task.category && task.category.toLowerCase().includes(searchText)) ||
                (task.priority && task.priority.toLowerCase().includes(searchText))
            );
        }
        
        // Ordenação
        filteredTasks.sort((a, b) => {
            let aValue = a[currentSort.field];
            let bValue = b[currentSort.field];
            
            // Tratamento especial para null/undefined
            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;
            
            // Comparação de strings ou datas
            if (typeof aValue === 'string') {
                const comparison = aValue.localeCompare(bValue);
                return currentSort.direction === 'asc' ? comparison : -comparison;
            } else {
                const comparison = aValue - bValue;
                return currentSort.direction === 'asc' ? comparison : -comparison;
            }
        });
        
        return filteredTasks;
    }

    function sortTasks() {
        const sortOptions = [
            { field: 'createdAt', direction: 'desc', label: 'Mais recentes primeiro' },
            { field: 'createdAt', direction: 'asc', label: 'Mais antigas primeiro' },
            { field: 'priority', direction: 'desc', label: 'Prioridade (Alta → Baixa)' },
            { field: 'priority', direction: 'asc', label: 'Prioridade (Baixa → Alta)' },
            { field: 'dueDate', direction: 'asc', label: 'Data de vencimento (Próxima → Distante)' },
            { field: 'dueDate', direction: 'desc', label: 'Data de vencimento (Distante → Próxima)' },
            { field: 'text', direction: 'asc', label: 'Alfabética (A → Z)' },
            { field: 'text', direction: 'desc', label: 'Alfabética (Z → A)' }
        ];
        
        // Encontrar o próximo método de ordenação
        let currentIndex = sortOptions.findIndex(option => 
            option.field === currentSort.field && option.direction === currentSort.direction);
        
        currentIndex = (currentIndex + 1) % sortOptions.length;
        currentSort = sortOptions[currentIndex];
        
        showNotification('Ordenação alterada', `Tarefas ordenadas por: ${currentSort.label}`, 'success');
        renderTasks();
    }

    // Funções de renderização
    function renderTasks() {
        const filteredTasks = filterTasks();
        taskList.innerHTML = '';
        
        if (filteredTasks.length === 0) {
            taskList.style.display = 'none';
            emptyState.style.display = 'flex';
        } else {
            taskList.style.display = 'block';
            emptyState.style.display = 'none';
            
            filteredTasks.forEach(task => {
                const taskItem = document.createElement('li');
                taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
                
                // Adicionar classes de prioridade e categoria
                if (task.priority) {
                    taskItem.classList.add(`priority-${task.priority}`);
                }
                
                if (task.category) {
                    taskItem.classList.add(`category-${task.category}`);
                }
                
                // Verificar data de vencimento
                if (task.dueDate) {
                    const today = new Date();
                    const dueDate = new Date(task.dueDate);
                    const diffTime = dueDate - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (diffDays < 0) {
                        taskItem.classList.add('overdue');
                    } else if (diffDays <= 2) {
                        taskItem.classList.add('due-soon');
                    }
                }
                
                // Formatar data de vencimento para exibição
                const formattedDueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR') : '';
                
                // Formatar prioridade para exibição
                let priorityLabel = '';
                if (task.priority === 'high') priorityLabel = '🔴 Alta';
                else if (task.priority === 'medium') priorityLabel = '🟠 Média';
                else if (task.priority === 'low') priorityLabel = '🟢 Baixa';
                
                // Formatar categoria para exibição
                let categoryLabel = '';
                if (task.category === 'trabalho') categoryLabel = '💼 Trabalho';
                else if (task.category === 'pessoal') categoryLabel = '👤 Pessoal';
                else if (task.category === 'estudo') categoryLabel = '📚 Estudo';
                
                taskItem.innerHTML = `
                    <div class="task-content">
                        <div class="task-text">${task.text}</div>
                        <div class="task-meta">
                            ${priorityLabel ? `<span class="task-priority">${priorityLabel}</span>` : ''}
                            ${categoryLabel ? `<span class="task-category">${categoryLabel}</span>` : ''}
                            ${task.dueDate ? `<span class="task-due-date">📅 ${formattedDueDate}</span>` : ''}
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="task-button complete-button" title="${task.completed ? 'Desmarcar como concluída' : 'Marcar como concluída'}">
                            ${task.completed ? '↩️' : '✓'}
                        </button>
                        <button class="task-button edit-button" title="Editar tarefa">
                            ✏️
                        </button>
                        <button class="task-button delete-button" title="Excluir tarefa">
                            🗑️
                        </button>
                    </div>
                `;
                
                // Adicionar event listeners
                const completeButton = taskItem.querySelector('.complete-button');
                completeButton.addEventListener('click', () => toggleTaskCompletion(task.id));
                
                const editButton = taskItem.querySelector('.edit-button');
                editButton.addEventListener('click', () => editTask(task.id));
                
                const deleteButton = taskItem.querySelector('.delete-button');
                deleteButton.addEventListener('click', () => deleteTask(task.id));
                
                taskList.appendChild(taskItem);
            });
        }
        
        updateStats();
    }

    function updateStats() {
        const totalTasks = tasks.length;
        const completedCount = tasks.filter(task => task.completed).length;
        const pendingCount = totalTasks - completedCount;
        
        pendingTasksCount.textContent = `Pendentes: ${pendingCount}`;
        completedTasksCount.textContent = `Concluídas: ${completedCount}`;
        
        // Atualizar barra de progresso
        const progressPercent = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;
        progressBar.style.width = `${progressPercent}%`;
    }

    // Funções de UI
    function toggleTaskOptions() {
        taskInput.addEventListener('focus', () => {
            taskOptions.classList.add('show');
        });
        
        document.addEventListener('click', (e) => {
            if (!taskInput.contains(e.target) && !taskOptions.contains(e.target) && e.target !== addButton) {
                taskOptions.classList.remove('show');
            }
        });
    }

    function toggleSearchBar() {
        searchContainer.classList.toggle('show');
        if (searchContainer.classList.contains('show')) {
            searchInput.focus();
        } else {
            searchInput.value = '';
            renderTasks();
        }
    }

    function toggleTheme() {
        document.body.classList.toggle('theme-high-contrast');
        const themeName = document.body.classList.contains('theme-high-contrast') ? 'Alto Contraste' : 'Padrão';
        showNotification('Tema alterado', `Tema alterado para ${themeName}`, 'success');
    }

    function openModal(modal) {
        modal.classList.add('show');
    }

    function closeModal(modal) {
        modal.classList.remove('show');
        editingTaskId = null;
        confirmCallback = null;
    }

    function showNotification(title, message, type = 'success') {
        const notificationTitle = notification.querySelector('.notification-title');
        const notificationMessage = notification.querySelector('.notification-message');
        const notificationIcon = notification.querySelector('.notification-icon');
        
        notificationTitle.textContent = title;
        notificationMessage.textContent = message;
        
        // Remover classes anteriores
        notification.classList.remove('success', 'warning', 'error');
        notification.classList.add(type);
        
        // Definir ícone
        if (type === 'success') notificationIcon.textContent = '✅';
        else if (type === 'warning') notificationIcon.textContent = '⚠️';
        else if (type === 'error') notificationIcon.textContent = '❌';
        
        // Mostrar notificação
        notification.classList.add('show');
        
        // Auto-fechar depois de 3 segundos
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    function resetForm() {
        taskInput.value = '';
        prioritySelector.value = 'none';
        categorySelector.value = 'none';
        dateInput.value = '';
        taskOptions.classList.remove('show');
    }

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function exportTasksToFile() {
        const type = exportType.value;
        const format = exportFormat.value;
        
        // Filtrar tarefas com base no tipo selecionado
        let tasksToExport = [...tasks];
        if (type === 'active') {
            tasksToExport = tasksToExport.filter(task => !task.completed);
        } else if (type === 'completed') {
            tasksToExport = tasksToExport.filter(task => task.completed);
        }
        
        let content = '';
        let filename = `tarefas_${new Date().toISOString().slice(0, 10)}`;
        
        if (format === 'json') {
            content = JSON.stringify(tasksToExport, null, 2);
            filename += '.json';
        } else if (format === 'csv') {
            // Cabeçalho CSV
            content = 'id,texto,concluida,prioridade,categoria,dataVencimento,dataCriacao\n';
            
            // Dados em formato CSV
            tasksToExport.forEach(task => {
                content += `${task.id},"${task.text.replace(/"/g, '""')}",${task.completed},${task.priority || ''},${task.category || ''},${task.dueDate || ''},${task.createdAt}\n`;
            });
            
            filename += '.csv';
        } else if (format === 'txt') {
            tasksToExport.forEach(task => {
                content += `- ${task.text}`;
                
                if (task.completed) {
                    content += ' (Concluída)';
                }
                
                if (task.priority) {
                    const priorityLabels = {
                        'high': 'Alta',
                        'medium': 'Média',
                        'low': 'Baixa'
                    };
                    content += ` | Prioridade: ${priorityLabels[task.priority]}`;
                }
                
                if (task.category) {
                    const categoryLabels = {
                        'trabalho': 'Trabalho',
                        'pessoal': 'Pessoal',
                        'estudo': 'Estudo'
                    };
                    content += ` | Categoria: ${categoryLabels[task.category]}`;
                }
                
                if (task.dueDate) {
                    const date = new Date(task.dueDate).toLocaleDateString('pt-BR');
                    content += ` | Vencimento: ${date}`;
                }
                
                content += '\n';
            });
            
            filename += '.txt';
        }
        
        // Criar blob e link para download
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        closeModal(exportModal);
        showNotification('Exportação concluída', `${tasksToExport.length} tarefas exportadas com sucesso!`, 'success');
    }

    // Event Listeners
    addButton.addEventListener('click', addTask);
    
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.tab;
            renderTasks();
        });
    });
    
    searchToggle.addEventListener('click', toggleSearchBar);
    
    searchInput.addEventListener('input', () => {
        renderTasks();
    });
    
    sortTasksButton.addEventListener('click', sortTasks);
    
    exportTasksButton.addEventListener('click', () => {
        openModal(exportModal);
    });
    
    themeToggleButton.addEventListener('click', toggleTheme);
    
    emptyAddTaskButton.addEventListener('click', () => {
        taskInput.focus();
    });
    
    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            closeModal(modal);
        });
    });
    
    cancelEditButton.addEventListener('click', () => {
        closeModal(editModal);
    });
    
    confirmEditButton.addEventListener('click', saveEditedTask);
    
    cancelActionButton.addEventListener('click', () => {
        closeModal(confirmModal);
    });
    
    confirmActionButton.addEventListener('click', () => {
        if (confirmCallback) {
            confirmCallback();
        }
        closeModal(confirmModal);
    });
    
    cancelExportButton.addEventListener('click', () => {
        closeModal(exportModal);
    });
    
    confirmExportButton.addEventListener('click', exportTasksToFile);
    
    notificationClose.addEventListener('click', () => {
        notification.classList.remove('show');
    });
    
    // Iniciar o toggle das opções de tarefa
    toggleTaskOptions();
});