/**
 * Oriental - Language Manager
 * Supports English (en) and Arabic (ar) with RTL
 */

let currentLang = localStorage.getItem('oriental_language') || 'en';
let translations = {};

/**
 * Load language pack
 */
function loadLanguage(lang) {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    
    if (lang === 'ar' && typeof lang_ar !== 'undefined') {
        translations = lang_ar;
    } else {
        translations = lang_en || {};
    }
    
    currentLang = lang;
    localStorage.setItem('oriental_language', lang);
    
    updatePageTranslations();
    translateMajorUI();  // ← ADD THIS LINE
    updateRTLStyles(lang === 'ar');
    
    console.log(`🌍 Language set to: ${lang}`);
}

/**
 * Update all elements with data-i18n attributes
 */
function updatePageTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[key]) {
            // Handle placeholders
            if (el.tagName === 'INPUT' && el.type === 'text' || el.tagName === 'TEXTAREA') {
                el.placeholder = translations[key];
            } else {
                el.textContent = translations[key];
            }
        }
    });
    
    // Update title attributes
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (translations[key]) {
            el.title = translations[key];
        }
    });
}
/**
 * Translate major UI elements that don't have data-i18n attributes
 */
function translateMajorUI() {
    const isArabic = currentLang === 'ar';
    
    // Sidebar Navigation
    const navItems = document.querySelectorAll('.nav-item');
    const navLabels = isArabic ? ['اللوحة', 'السباقات', 'التقارير', 'الإعدادات'] : ['Board', 'Sprints', 'Reports', 'Settings'];
    navItems.forEach((item, i) => {
        const span = item.querySelector('span');
        if (span && navLabels[i]) span.textContent = navLabels[i];
    });
    
    // Bottom Navigation
    const bottomItems = document.querySelectorAll('.bottom-nav-item');
    const bottomLabels = isArabic ? ['اللوحة', 'السباقات', 'التقارير', 'الإعدادات', 'مهمة جديدة'] : ['Board', 'Sprints', 'Reports', 'Settings', 'New Task'];
    bottomItems.forEach((item, i) => {
        if (item.id === 'bottom-add-btn') return;
        const span = item.querySelector('span');
        if (span && bottomLabels[i]) span.textContent = bottomLabels[i];
    });
    
    // Header
    const headerTitle = document.getElementById('current-view');
    if (headerTitle) {
        const viewMap = isArabic ? {'Board': 'اللوحة', 'Sprints': 'السباقات', 'Reports': 'التقارير', 'Settings': 'الإعدادات'} : {'Board': 'Board', 'Sprints': 'Sprints', 'Reports': 'Reports', 'Settings': 'Settings'};
        headerTitle.textContent = viewMap[headerTitle.textContent] || headerTitle.textContent;
    }
    
    // Search placeholder
    const searchInput = document.getElementById('search-tasks');
    if (searchInput) searchInput.placeholder = isArabic ? 'البحث عن المهام...' : 'Search tasks...';
    
    // Buttons
    const buttonMap = {
        'create-task-btn': isArabic ? 'مهمة جديدة' : 'New Task',
        'templates-btn': isArabic ? 'القوالب' : 'Templates',
        'sort-btn': isArabic ? 'ترتيب' : 'Sort',
        'filter-btn': isArabic ? 'تصفية' : 'Filter',
    };
    
    Object.entries(buttonMap).forEach(([id, text]) => {
        const btn = document.getElementById(id);
        if (btn) {
            const span = btn.querySelector('span');
            if (span) span.textContent = text;
        }
    });
    
    // Board Columns
    const columns = document.querySelectorAll('.column-title');
    const columnLabels = isArabic ? ['للقيام', 'قيد التنفيذ', 'مكتمل'] : ['To Do', 'In Progress', 'Done'];
    columns.forEach((col, i) => {
        const text = col.childNodes[col.childNodes.length - 1];
        if (text && text.nodeType === 3) {
            text.textContent = ' ' + (columnLabels[i] || '');
        }
    });
    
    // Sprint labels
    const sprintLabels = {
        'active-sprint-name': isArabic ? 'لا يوجد سباق نشط' : 'No Active Sprint',
        'active-sprint-goal': isArabic ? 'ابدأ سباقاً لتتبع التقدم' : 'Start a sprint to track progress',
    };
    
    Object.entries(sprintLabels).forEach(([id, text]) => {
        const el = document.getElementById(id);
        if (el && el.textContent === (isArabic ? 'No Active Sprint' : 'لا يوجد سباق نشط')) {
            el.textContent = text;
        }
    });
    
    // Projects header
    const projectsHeader = document.querySelector('.projects-header h3');
    if (projectsHeader) projectsHeader.textContent = isArabic ? 'المشاريع' : 'Projects';
    
    // Team Members header
    const inviteHeader = document.querySelector('.invite-header h3');
    if (inviteHeader) {
        const count = inviteHeader.textContent.match(/\d+/);
        inviteHeader.innerHTML = isArabic ? 
            `<i class="fas fa-user-plus"></i> أعضاء الفريق ${count ? '(' + count[0] + ')' : ''}` :
            `<i class="fas fa-user-plus"></i> Team Members ${count ? '(' + count[0] + ')' : ''}`;
    }
    
    // Modal buttons and labels
    const modalMap = {
        'task-title': isArabic ? 'العنوان *' : 'Title *',
        'task-description': isArabic ? 'الوصف' : 'Description',
        'task-priority': isArabic ? 'الأولوية' : 'Priority',
        'task-assignee': isArabic ? 'المسؤول' : 'Assign to',
        'task-due-date': isArabic ? 'تاريخ التسليم' : 'Due Date',
        'task-tags': isArabic ? 'الوسوم' : 'Tags',
    };
    
    // Translate form labels
    document.querySelectorAll('label[for]').forEach(label => {
        const forAttr = label.getAttribute('for');
        if (modalMap[forAttr]) {
            const required = label.querySelector('.required');
            label.childNodes[0].textContent = modalMap[forAttr].replace(' *', '');
        }
    });
    
    // Settings tabs
    const settingsTabs = document.querySelectorAll('.settings-tab');
    const tabLabels = isArabic ? ['عام', 'الإشعارات', 'الفريق', 'التكاملات', 'منطقة الخطر'] : ['General', 'Notifications', 'Team', 'Integrations', 'Danger Zone'];
    settingsTabs.forEach((tab, i) => {
        const text = tab.childNodes[tab.childNodes.length - 1];
        if (text && text.nodeType === 3 && tabLabels[i]) {
            text.textContent = ' ' + tabLabels[i];
        }
    });
    
    console.log(`🌍 UI translated to ${isArabic ? 'Arabic' : 'English'}`);
}

// Call this in loadLanguage after updatePageTranslations

/**
 * Get translation for a key
 */
function t(key, fallback = '') {
    // Check translations first
    if (translations[key]) return translations[key];
    
    // Fallback to English
    if (lang_en[key]) return lang_en[key];
    
    return fallback || key;
}

/**
 * Update CSS for RTL support
 */
function updateRTLStyles(isRTL) {
    const rtlStyles = document.getElementById('rtl-styles');
    
    if (isRTL) {
        if (!rtlStyles) {
            const style = document.createElement('style');
            style.id = 'rtl-styles';
            style.textContent = `
                /* RTL Overrides */
                .sidebar {
                    border-right: none;
                    border-left: 1px solid var(--border-color);
                }
                
                .main-content {
                    margin-left: 0;
                    margin-right: 300px;
                }
                
                .nav-item.active::before {
                    left: auto;
                    right: 0;
                    border-radius: 2px 0 0 2px;
                }
                
                .nav-item:hover {
                    transform: translateX(-4px);
                }
                
                .modal-footer {
                    justify-content: flex-start;
                }
                
                .header-actions {
                    flex-direction: row-reverse;
                }
                
                .toast {
                    right: auto;
                    left: var(--space-xl);
                    border-left: none;
                    border-right: 4px solid transparent;
                }
                
                .activity-log-container {
                    right: auto;
                    left: 0;
                    transform: translateX(-100%);
                }
                
                .activity-log-container.open {
                    transform: translateX(0);
                }
                
                @media (max-width: 768px) {
                    .main-content {
                        margin-right: 0;
                    }
                    
                    .sidebar {
                        transform: translateX(100%);
                    }
                    
                    .sidebar.open {
                        transform: translateX(0);
                    }
                }
                
                /* Font adjustments for Arabic */
                body {
                    font-family: 'Inter', 'Segoe UI', 'Tahoma', sans-serif;
                }
                
                [lang="ar"] h1, [lang="ar"] h2, [lang="ar"] h3 {
                    font-weight: 700;
                }
            `;
            document.head.appendChild(style);
        }
    } else {
        if (rtlStyles) {
            rtlStyles.remove();
        }
    }
}

/**
 * Initialize language on page load
 */
function initLanguage() {
    loadLanguage(currentLang);
    
    // Add language switcher event
    const langSwitcher = document.getElementById('language-select');
    if (langSwitcher) {
        langSwitcher.value = currentLang;
        langSwitcher.addEventListener('change', (e) => {
            loadLanguage(e.target.value);
        });
    }
}

// Auto-initialize
document.addEventListener('DOMContentLoaded', initLanguage);

// Export
window.t = t;
window.loadLanguage = loadLanguage;
window.currentLang = currentLang;