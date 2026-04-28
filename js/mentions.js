/**
 * Oriental - @Mentions System
 * Version: 1.0.0
 */

class MentionsSystem {
    constructor() {
        this.mentionRegex = /@(\w*)$/;
        this.dropdownVisible = false;
        this.selectedIndex = 0;
        this.filteredUsers = [];
        this.currentInput = null;
        this.dropdown = null;
    }

    initMentions(inputElement, options = {}) {
        this.currentInput = inputElement;
        this.options = {
            onMention: options.onMention || (() => {}),
            maxSuggestions: options.maxSuggestions || 8,
            ...options
        };

        this.createDropdown();
        this.attachEventListeners();
        console.log('✅ Mentions initialized on', inputElement.id || 'input');
    }

    createDropdown() {
        if (this.dropdown) return;
        
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'mentions-dropdown';
        this.dropdown.style.cssText = `
            position: absolute;
            background: var(--bg-modal, #fff);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border: 1px solid var(--border-color, #e5e7eb);
            max-height: 300px;
            overflow-y: auto;
            z-index: 1000;
            min-width: 250px;
            display: none;
        `;
        document.body.appendChild(this.dropdown);
    }

    attachEventListeners() {
        if (!this.currentInput) return;

        this.currentInput.addEventListener('input', (e) => this.handleInput(e));
        this.currentInput.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.currentInput.addEventListener('blur', () => {
            setTimeout(() => this.hideDropdown(), 200);
        });
    }

    handleInput(e) {
        const text = this.currentInput.value;
        const cursorPos = this.currentInput.selectionStart;
        const textBeforeCursor = text.substring(0, cursorPos);
        
        const match = textBeforeCursor.match(/@(\w*)$/);
        
        if (match) {
            const searchTerm = match[1].toLowerCase();
            this.filterUsers(searchTerm);
            this.showDropdown();
        } else {
            this.hideDropdown();
        }
    }

    filterUsers(searchTerm) {
        const allUsers = window.teamMembers || [];
        
        this.filteredUsers = allUsers
            .filter(user => {
                const name = (user.name || '').toLowerCase();
                const email = (user.email || '').toLowerCase();
                return name.includes(searchTerm) || email.includes(searchTerm);
            })
            .slice(0, this.options.maxSuggestions);

        this.selectedIndex = 0;
        this.renderDropdown();
    }

    renderDropdown() {
        if (!this.dropdown) return;

        if (this.filteredUsers.length === 0) {
            this.dropdown.innerHTML = `
                <div style="padding: 12px; text-align: center; color: var(--text-muted, #6b7280);">
                    <i class="fas fa-user-slash"></i> No users found
                </div>
            `;
            return;
        }

        const currentUser = window.currentUser;
        
        this.dropdown.innerHTML = this.filteredUsers
            .map((user, index) => {
                const isCurrentUser = currentUser && user.id === currentUser.uid;
                const initials = (user.name || user.email || '?').charAt(0).toUpperCase();
                const selected = index === this.selectedIndex;
                
                return `
                    <div class="mention-item" data-user-id="${user.id}" 
                         data-user-name="${this.escapeHtml(user.name || user.email)}"
                         data-user-email="${this.escapeHtml(user.email)}"
                         style="
                         display: flex;
                         align-items: center;
                         gap: 12px;
                         padding: 10px 12px;
                         cursor: pointer;
                         background: ${selected ? 'var(--primary-50, #f0fdf4)' : 'transparent'};
                         border-bottom: 1px solid var(--border-color, #e5e7eb);
                     ">
                        <div style="
                            width: 32px;
                            height: 32px;
                            border-radius: 50%;
                            background: ${this.getAvatarColor(user.id)};
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: 600;
                        ">${initials}</div>
                        <div style="flex: 1;">
                            <div style="font-weight: 500;">${this.escapeHtml(user.name || user.email)}</div>
                            ${user.email ? `<div style="font-size: 12px; color: var(--text-muted, #6b7280);">${this.escapeHtml(user.email)}</div>` : ''}
                        </div>
                        ${isCurrentUser ? '<span style="background: var(--primary-100, #dcfce7); color: var(--primary-700, #15803d); padding: 2px 8px; border-radius: 20px; font-size: 10px;">You</span>' : ''}
                    </div>
                `;
            }).join('');

        this.dropdown.querySelectorAll('.mention-item').forEach(item => {
            item.addEventListener('click', () => this.selectUser(item.dataset));
            item.addEventListener('mouseenter', () => {
                this.dropdown.querySelectorAll('.mention-item').forEach(i => 
                    i.style.background = 'transparent'
                );
                item.style.background = 'var(--primary-50, #f0fdf4)';
            });
        });
    }

    getAvatarColor(userId) {
        const colors = ['#16a34a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
        const index = (userId || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[index % colors.length];
    }

    selectUser(userData) {
        if (!this.currentInput) return;

        const text = this.currentInput.value;
        const cursorPos = this.currentInput.selectionStart;
        const textBeforeCursor = text.substring(0, cursorPos);
        const mentionStart = textBeforeCursor.lastIndexOf('@');
        
        if (mentionStart === -1) return;

        const beforeMention = text.substring(0, mentionStart);
        const afterCursor = text.substring(cursorPos);
        
        const mentionText = `@${userData.userName} `;
        this.currentInput.value = beforeMention + mentionText + afterCursor;
        
        const newCursorPos = mentionStart + mentionText.length;
        this.currentInput.setSelectionRange(newCursorPos, newCursorPos);
        this.currentInput.focus();

        this.options.onMention({
            userId: userData.userId,
            userName: userData.userName,
            userEmail: userData.userEmail
        });

        this.hideDropdown();
    }

    handleKeydown(e) {
        if (!this.dropdownVisible) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredUsers.length - 1);
                this.renderDropdown();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
                this.renderDropdown();
                break;
                
            case 'Enter':
            case 'Tab':
                if (this.filteredUsers[this.selectedIndex]) {
                    e.preventDefault();
                    const user = this.filteredUsers[this.selectedIndex];
                    this.selectUser({
                        userId: user.id,
                        userName: user.name || user.email,
                        userEmail: user.email
                    });
                }
                break;
                
            case 'Escape':
                e.preventDefault();
                this.hideDropdown();
                break;
        }
    }

    showDropdown() {
    if (!this.currentInput || !this.dropdown) return;

    const rect = this.currentInput.getBoundingClientRect();
    
    // Position below the input
    this.dropdown.style.display = 'block';
    this.dropdown.style.position = 'fixed';
    this.dropdown.style.top = (rect.bottom + 5) + 'px';
    this.dropdown.style.left = rect.left + 'px';
    this.dropdown.style.width = Math.max(rect.width, 250) + 'px';
    this.dropdown.style.zIndex = '9999';
    
    this.dropdownVisible = true;
    
    console.log('Dropdown shown at:', rect.bottom + 5, rect.left);
}

    hideDropdown() {
        if (this.dropdown) {
            this.dropdown.style.display = 'none';
        }
        this.dropdownVisible = false;
        this.selectedIndex = 0;
    }

    extractMentions(text) {
        const mentionRegex = /@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[a-zA-Z0-9._-]+)/g;
        const mentions = [];
        let match;
        
        while ((match = mentionRegex.exec(text)) !== null) {
            const mentionedValue = match[1];
            const user = window.teamMembers?.find(u => 
                u.email === mentionedValue || u.name === mentionedValue
            );
            
            if (user) {
                mentions.push({
                    userId: user.id,
                    userName: user.name || user.email,
                    userEmail: user.email
                });
            }
        }
        
        return mentions;
    }

    highlightMentions(text) {
        if (!text) return '';
        
        return text.replace(/@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[a-zA-Z0-9._-]+)/g, (match, username) => {
            const user = window.teamMembers?.find(u => 
                u.email === username || u.name === username
            );
            
            if (user) {
                return `<span class="mention-highlight" style="background: var(--primary-100, #dcfce7); color: var(--primary-700, #15803d); padding: 1px 4px; border-radius: 4px; font-weight: 500;">@${this.escapeHtml(user.name || user.email)}</span>`;
            }
            return match;
        });
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create global instance
const mentionsSystem = new MentionsSystem();

// Export
window.MentionsSystem = MentionsSystem;
window.mentionsSystem = mentionsSystem;

console.log('✅ Mentions system loaded');