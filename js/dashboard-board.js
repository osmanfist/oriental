/**
 * Oriental - Dashboard Board
 * Search, filters, sorting, drag-and-drop
 */

// ============================================
// ASSIGNEE FILTERS
// ============================================

function loadAssigneeFilters() {
    const assignees = new Set();
    allTasks.forEach(task => {
        if (task.assignedTo && task.assignedTo.trim()) assignees.add(task.assignedTo);
    });
    
    const assigneeContainer = document.getElementById('assignee-filters');
    if (!assigneeContainer) return;
    
    const existingLabels = assigneeContainer.querySelectorAll('label:not(:first-child)');
    existingLabels.forEach(label => label.remove());
    
    assignees.forEach(assignee => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" value="${escapeHtml(assignee)}" class="filter-assignee"> ${escapeHtml(assignee)}`;
        assigneeContainer.appendChild(label);
    });
}

// ============================================
// SEARCH AND FILTER
// ============================================

function setupSearchAndFilter() {
    const searchInput = document.getElementById('search-tasks');
    const clearSearch = document.getElementById('clear-search');
    const filterBtn = document.getElementById('filter-btn');
    const filterDropdown = document.getElementById('filter-dropdown');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value.toLowerCase();
            if (clearSearch) clearSearch.style.display = searchTerm ? 'block' : 'none';
            applySearchAndFilter();
        });
    }
    
    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            searchInput.value = '';
            searchTerm = '';
            clearSearch.style.display = 'none';
            applySearchAndFilter();
        });
    }
    
    if (filterBtn && filterDropdown) {
        filterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            filterDropdown.classList.toggle('show');
        });
        document.addEventListener('click', (e) => {
            if (!filterBtn.contains(e.target) && !filterDropdown.contains(e.target)) {
                filterDropdown.classList.remove('show');
            }
        });
    }
    
    document.getElementById('apply-filters')?.addEventListener('click', () => {
        activeFilters.priorities = Array.from(document.querySelectorAll('.filter-priority:checked')).map(cb => cb.value);
        activeFilters.statuses = Array.from(document.querySelectorAll('.filter-status:checked')).map(cb => cb.value);
        activeFilters.dueDates = Array.from(document.querySelectorAll('.filter-due:checked')).map(cb => cb.value);
        activeFilters.assignees = Array.from(document.querySelectorAll('.filter-assignee:checked')).map(cb => cb.value);
        filterDropdown.classList.remove('show');
        updateFilterBadge();
        applySearchAndFilter();
    });
    
    document.getElementById('clear-filters')?.addEventListener('click', () => {
        document.querySelectorAll('.filter-priority, .filter-status, .filter-due, .filter-assignee').forEach(cb => cb.checked = false);
        activeFilters = { priorities: [], statuses: [], dueDates: [], assignees: [] };
        updateFilterBadge();
        applySearchAndFilter();
    });
}

function updateFilterBadge() {
    const badgeContainer = document.getElementById('active-filters');
    const totalFilters = activeFilters.priorities.length + activeFilters.statuses.length + 
                         activeFilters.dueDates.length + activeFilters.assignees.length;
    
    if (!badgeContainer) return;
    
    if (totalFilters === 0) {
        badgeContainer.style.display = 'none';
        badgeContainer.innerHTML = '';
        return;
    }
    
    badgeContainer.style.display = 'flex';
    badgeContainer.innerHTML = '';
    
    activeFilters.priorities.forEach(p => {
        badgeContainer.innerHTML += `<div class="filter-badge"><i class="fas fa-flag"></i> ${p}<button onclick="removeFilter('priority', '${p}')">&times;</button></div>`;
    });
    
    activeFilters.statuses.forEach(s => {
        const statusMap = { planned: 'Planned', started: 'Started', 'in-progress': 'In Progress', waiting: 'Waiting', done: 'Done', todo: 'Planned' };
        badgeContainer.innerHTML += `<div class="filter-badge"><i class="fas fa-circle"></i> ${statusMap[s] || s}<button onclick="removeFilter('status', '${s}')">&times;</button></div>`;
    });
    
    activeFilters.dueDates.forEach(d => {
        const dueMap = { overdue: 'Overdue', today: 'Due Today', week: 'This Week' };
        badgeContainer.innerHTML += `<div class="filter-badge"><i class="fas fa-calendar"></i> ${dueMap[d] || d}<button onclick="removeFilter('dueDate', '${d}')">&times;</button></div>`;
    });
    
    activeFilters.assignees.forEach(a => {
        badgeContainer.innerHTML += `<div class="filter-badge"><i class="fas fa-user"></i> ${escapeHtml(a)}<button onclick="removeFilter('assignee', '${escapeHtml(a)}')">&times;</button></div>`;
    });
}

function removeFilter(type, value) {
    if (type === 'priority') {
        activeFilters.priorities = activeFilters.priorities.filter(p => p !== value);
        document.querySelector(`.filter-priority[value="${value}"]`).checked = false;
    } else if (type === 'status') {
        activeFilters.statuses = activeFilters.statuses.filter(s => s !== value);
        document.querySelector(`.filter-status[value="${value}"]`).checked = false;
    } else if (type === 'dueDate') {
        activeFilters.dueDates = activeFilters.dueDates.filter(d => d !== value);
        document.querySelector(`.filter-due[value="${value}"]`).checked = false;
    } else if (type === 'assignee') {
        activeFilters.assignees = activeFilters.assignees.filter(a => a !== value);
        document.querySelector(`.filter-assignee[value="${value}"]`).checked = false;
    }
    updateFilterBadge();
    applySearchAndFilter();
}

function clearSearchAndReload() {
    const searchInput = document.getElementById('search-tasks');
    if (searchInput) {
        searchInput.value = '';
        searchTerm = '';
        document.getElementById('clear-search').style.display = 'none';
    }
    applySearchAndFilter();
}

function applySearchAndFilter() {
    if (!allTasks) return;
    
    let tasks = allTasks.filter(task => {
        if (searchTerm) {
            const matchesTitle = task.title?.toLowerCase().includes(searchTerm);
            const matchesDesc = task.description?.toLowerCase().includes(searchTerm);
            const matchesTags = task.tags?.some(tag => tag.toLowerCase().includes(searchTerm));
            if (!matchesTitle && !matchesDesc && !matchesTags) return false;
        }
        if (activeFilters.priorities.length > 0 && !activeFilters.priorities.includes(task.priority)) return false;
        if (activeFilters.statuses.length > 0) {
            const taskStatus = task.status || 'planned';
            if (taskStatus === 'todo' && activeFilters.statuses.includes('planned')) return true;
            if (!activeFilters.statuses.includes(taskStatus)) return false;
        }
        if (activeFilters.dueDates.length > 0) {
            const dueStatus = getDueDateStatus(task.dueDate);
            if (!activeFilters.dueDates.includes(dueStatus)) return false;
        }
        if (activeFilters.assignees.length > 0) {
            const taskAssignee = task.assignedTo || 'unassigned';
            if (!activeFilters.assignees.includes(taskAssignee)) return false;
        }
        return true;
    });
    
    tasks = sortTasks(tasks);
    filteredTasks = tasks;
    
    if (filteredTasks.length === 0 && searchTerm) {
        document.getElementById('board-view').innerHTML = `
            <div class="empty-state empty-search" style="width:100%;">
                <i class="fas fa-search"></i>
                <h3>No matching tasks</h3>
                <p>No tasks found matching "${escapeHtml(searchTerm)}"</p>
                <button class="btn-secondary" onclick="clearSearchAndReload()"><i class="fas fa-undo"></i> Clear Search</button>
            </div>`;
        return;
    }
    
    renderBoard(filteredTasks);
}

// ============================================
// SORTING
// ============================================

function sortTasks(tasks) {
    const sorted = [...tasks];
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    
    switch(currentSort) {
        case 'priority-desc':
            sorted.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));
            break;
        case 'priority-asc':
            sorted.sort((a, b) => (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0));
            break;
        case 'due-date-asc':
            sorted.sort((a, b) => { if (!a.dueDate && !b.dueDate) return 0; if (!a.dueDate) return 1; if (!b.dueDate) return -1; return new Date(a.dueDate) - new Date(b.dueDate); });
            break;
        case 'due-date-desc':
            sorted.sort((a, b) => { if (!a.dueDate && !b.dueDate) return 0; if (!a.dueDate) return 1; if (!b.dueDate) return -1; return new Date(b.dueDate) - new Date(a.dueDate); });
            break;
        case 'created-asc':
            sorted.sort((a, b) => a.createdAt?.toDate() - b.createdAt?.toDate());
            break;
        default:
            sorted.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate());
    }
    return sorted;
}

function setupSorting() {
    const sortBtn = document.getElementById('sort-btn');
    const sortDropdown = document.getElementById('sort-dropdown');
    
    if (sortBtn) {
        sortBtn.addEventListener('click', (e) => { e.stopPropagation(); sortDropdown.classList.toggle('show'); });
    }
    
    document.addEventListener('click', (e) => {
        if (sortBtn && !sortBtn.contains(e.target) && sortDropdown && !sortDropdown.contains(e.target)) {
            sortDropdown.classList.remove('show');
        }
    });
    
    document.querySelectorAll('.sort-option').forEach(option => {
        option.addEventListener('click', () => {
            const sortValue = option.dataset.sort;
            if (sortValue) {
                currentSort = sortValue;
                document.querySelectorAll('.sort-option').forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                sortDropdown.classList.remove('show');
                applySearchAndFilter();
            }
        });
    });
}

// ============================================
// DRAG AND DROP (Desktop)
// ============================================

let draggedTask = null;

function setupDragAndDrop() {
    document.querySelectorAll('.task-card').forEach(task => {
        task.setAttribute('draggable', 'true');
        task.addEventListener('dragstart', (e) => {
            draggedTask = task;
            e.dataTransfer.setData('text/plain', task.dataset.taskId);
            task.classList.add('dragging');
        });
        task.addEventListener('dragend', () => {
            task.classList.remove('dragging');
            draggedTask = null;
        });
    });
    
    document.querySelectorAll('.tasks-container').forEach(container => {
        container.addEventListener('dragover', (e) => e.preventDefault());
        container.addEventListener('drop', async (e) => {
            if (!draggedTask) return;
    if (!can('completeTasks')) {
        showToast('You do not have permission to move tasks', 'error');
        draggedTask.classList.remove('dragging');
        draggedTask = null;
        return;
    }
            const newStatus = container.dataset.status;
            const taskId = draggedTask.dataset.taskId;
            const oldStatus = draggedTask.dataset.status;
            if (newStatus === oldStatus) return;
            
            try {
                await db.collection('tasks').doc(taskId).update({
                    status: newStatus,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                const taskDoc = await db.collection('tasks').doc(taskId).get();
                await logActivity('update_task', 'task', taskId, taskDoc.data()?.title, { oldStatus, newStatus });
                showToast('Task moved', 'success');
                invalidateCache();
            } catch (error) {
                console.error('Error moving task:', error);
                showToast('Error moving task', 'error');
            }
        });
    });
}

// ============================================
// MOBILE DRAG AND DROP
// ============================================

let touchStartY = null, touchCurrentY = null, isDragging = false;

function setupMobileDragAndDrop() {
    if (window.innerWidth > 768) return;
    
    document.querySelectorAll('.task-card').forEach(task => {
        task.addEventListener('touchstart', (e) => {
            e.preventDefault();
            draggedTask = task;
            touchStartY = e.touches[0].clientY;
            isDragging = false;
            task.style.opacity = '0.5';
        });
        
        task.addEventListener('touchmove', (e) => {
            if (!draggedTask) return;
            e.preventDefault();
            touchCurrentY = e.touches[0].clientY;
            if (Math.abs(touchCurrentY - touchStartY) > 10) isDragging = true;
        });
        
        task.addEventListener('touchend', async (e) => {
            if (!draggedTask) return;
            e.preventDefault();
            
            if (isDragging) {
                const touch = e.changedTouches[0];
                const elementAtTouch = document.elementsFromPoint(touch.clientX, touch.clientY);
                const targetContainer = elementAtTouch.find(el => el.classList?.contains('tasks-container'));
                
                if (targetContainer) {
                    const newStatus = targetContainer.dataset.status;
                    const taskId = draggedTask.dataset.taskId;
                    const oldStatus = draggedTask.dataset.status;
                    
                    if (newStatus !== oldStatus) {
                        try {
                            await db.collection('tasks').doc(taskId).update({
                                status: newStatus,
                                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                            showToast('Task moved', 'success');
                        } catch (error) { showToast('Error', 'error'); }
                    }
                }
            } else {
                const taskId = draggedTask.dataset.taskId;
                if (taskId) openTaskDetail(taskId);
            }
            
            draggedTask.style.opacity = '';
            draggedTask = null;
            isDragging = false;
        });
    });
}

// Make functions available globally
window.loadAssigneeFilters = loadAssigneeFilters;
window.setupSearchAndFilter = setupSearchAndFilter;
window.applySearchAndFilter = applySearchAndFilter;
window.clearSearchAndReload = clearSearchAndReload;
window.removeFilter = removeFilter;
window.setupSorting = setupSorting;
window.setupDragAndDrop = setupDragAndDrop;
window.setupMobileDragAndDrop = setupMobileDragAndDrop;

console.log('✅ dashboard-board.js loaded');