/**
 * Oriental - File Attachments System (Free Tier)
 * Version: 1.0.0
 */

class AttachmentsManager {
    constructor() {
        this.maxFileSize = 1 * 1024 * 1024; // 1MB
        this.allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 'text/plain', 'text/csv'
        ];
    }

    initAttachmentsUI(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn('Attachments container not found:', containerId);
            return;
        }

        this.options = {
            taskId: options.taskId || null,
            organizationId: options.organizationId || window.currentOrganization,
            onAttachmentAdded: options.onAttachmentAdded || (() => {}),
            onAttachmentDeleted: options.onAttachmentDeleted || (() => {}),
            ...options
        };

        this.renderAttachmentsContainer();
        this.setupDragAndDrop();
        this.loadAttachments();
        
        console.log('✅ Attachments initialized for task:', this.options.taskId);
    }

    renderAttachmentsContainer() {
        this.container.innerHTML = `
            <div class="attachments-section" style="margin-top: 24px; border-top: 1px solid var(--border-color, #e5e7eb); padding-top: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <h4 style="font-size: 14px; color: var(--text-secondary, #4b5563);">
                        <i class="fas fa-paperclip"></i> Attachments
                    </h4>
                    <span id="attachment-count" style="background: var(--bg-tertiary, #f3f4f6); padding: 2px 8px; border-radius: 20px; font-size: 12px;">0</span>
                </div>
                
                <div id="attachments-list" style="min-height: 100px; max-height: 250px; overflow-y: auto; border: 2px dashed var(--border-color, #e5e7eb); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                    <div style="text-align: center; padding: 24px; color: var(--text-muted, #6b7280);">
                        <i class="fas fa-cloud-upload-alt" style="font-size: 32px; margin-bottom: 8px; opacity: 0.5;"></i>
                        <p>Drop files here or click to upload</p>
                        <span style="font-size: 12px;">Max 1MB • Images, PDFs, Text</span>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: flex-end;">
                    <input type="file" id="attachment-input" multiple accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.csv" style="display: none;">
                    <button class="btn-secondary" id="trigger-upload-btn" style="padding: 8px 16px;">
                        <i class="fas fa-plus"></i> Add Attachment
                    </button>
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    attachEventListeners() {
        const triggerBtn = this.container.querySelector('#trigger-upload-btn');
        const fileInput = this.container.querySelector('#attachment-input');
        
        if (triggerBtn && fileInput) {
            triggerBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
    }

    setupDragAndDrop() {
        const attachmentsList = this.container.querySelector('#attachments-list');
        if (!attachmentsList) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            attachmentsList.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            attachmentsList.addEventListener(eventName, () => {
                attachmentsList.style.borderColor = 'var(--primary-400, #4ade80)';
                attachmentsList.style.background = 'var(--primary-50, #f0fdf4)';
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            attachmentsList.addEventListener(eventName, () => {
                attachmentsList.style.borderColor = 'var(--border-color, #e5e7eb)';
                attachmentsList.style.background = 'transparent';
            });
        });

        attachmentsList.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files);
            this.handleFiles(files);
        });
    }

    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        this.handleFiles(files);
        event.target.value = '';
    }

    async handleFiles(files) {
        const validFiles = files.filter(file => this.validateFile(file));
        
        if (validFiles.length === 0) {
            window.showToast?.('No valid files selected', 'warning');
            return;
        }

        for (const file of validFiles) {
            await this.uploadFileAsBase64(file);
        }
    }

    validateFile(file) {
        if (file.size > this.maxFileSize) {
            window.showToast?.(`${file.name} exceeds 1MB limit`, 'error');
            return false;
        }

        if (!this.allowedTypes.includes(file.type)) {
            window.showToast?.(`${file.type} not allowed`, 'error');
            return false;
        }

        return true;
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }

    async uploadFileAsBase64(file) {
        window.showToast?.(`Uploading ${file.name}...`, 'info');
        
        try {
            const base64 = await this.fileToBase64(file);
            
            const attachment = {
                taskId: this.options.taskId,
                organizationId: this.options.organizationId,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                base64Data: base64,
                uploadedBy: window.currentUser?.uid,
                uploadedByName: window.currentUser?.displayName || window.currentUser?.email,
                uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('attachments').add(attachment);
            
            this.loadAttachments();
            this.options.onAttachmentAdded(attachment);
            window.showToast?.(`${file.name} uploaded`, 'success');
            
        } catch (error) {
            console.error('Upload error:', error);
            window.showToast?.('Error uploading file', 'error');
        }
    }

    async loadAttachments() {
        if (!this.options.taskId) return;

        try {
            const snapshot = await db.collection('attachments')
                .where('taskId', '==', this.options.taskId)
                .orderBy('uploadedAt', 'desc')
                .get();

            const attachments = [];
            snapshot.forEach(doc => {
                attachments.push({ id: doc.id, ...doc.data() });
            });

            this.renderAttachments(attachments);
        } catch (error) {
            console.error('Error loading attachments:', error);
        }
    }

    renderAttachments(attachments) {
        const listContainer = this.container.querySelector('#attachments-list');
        const countSpan = this.container.querySelector('#attachment-count');
        
        if (!listContainer) return;

        if (countSpan) {
            countSpan.textContent = attachments.length;
        }

        if (attachments.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; padding: 24px; color: var(--text-muted, #6b7280);">
                    <i class="fas fa-cloud-upload-alt" style="font-size: 32px; margin-bottom: 8px; opacity: 0.5;"></i>
                    <p>Drop files here or click to upload</p>
                    <span style="font-size: 12px;">Max 1MB • Images, PDFs, Text</span>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = attachments.map(att => this.createAttachmentElement(att)).join('');
        
        listContainer.querySelectorAll('[data-attachment-id]').forEach(item => {
            const id = item.dataset.attachmentId;
            const attachment = attachments.find(a => a.id === id);
            
            item.querySelector('[data-action="download"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.downloadAttachment(attachment);
            });
            
            item.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteAttachment(attachment);
            });
        });
    }

    createAttachmentElement(attachment) {
        const icon = this.getFileIcon(attachment.fileType);
        const size = attachment.fileSize < 1024 ? 
            attachment.fileSize + ' B' : 
            (attachment.fileSize / 1024).toFixed(1) + ' KB';
        const isImage = attachment.fileType?.startsWith('image/');

        return `
            <div data-attachment-id="${attachment.id}" style="
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px;
                background: var(--bg-secondary, #f9fafb);
                border-radius: 8px;
                margin-bottom: 8px;
                cursor: pointer;
            ">
                <div style="
                    width: 40px;
                    height: 40px;
                    border-radius: 6px;
                    background: ${isImage ? `url('${attachment.base64Data}')` : 'var(--bg-tertiary, #f3f4f6)'};
                    background-size: cover;
                    background-position: center;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-secondary, #4b5563);
                ">
                    ${!isImage ? icon : ''}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 500; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${this.escapeHtml(attachment.fileName)}">
                        ${attachment.fileName}
                    </div>
                    <div style="font-size: 12px; color: var(--text-muted, #6b7280);">${size}</div>
                </div>
                <div style="display: flex; gap: 4px;">
                    <button data-action="download" style="background: none; border: none; color: var(--text-muted, #6b7280); cursor: pointer; padding: 6px;" title="Download">
                        <i class="fas fa-download"></i>
                    </button>
                    <button data-action="delete" style="background: none; border: none; color: var(--text-muted, #6b7280); cursor: pointer; padding: 6px;" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    getFileIcon(fileType) {
        if (fileType?.startsWith('image/')) return '<i class="fas fa-image"></i>';
        if (fileType?.includes('pdf')) return '<i class="fas fa-file-pdf"></i>';
        if (fileType?.startsWith('text/')) return '<i class="fas fa-file-alt"></i>';
        return '<i class="fas fa-file"></i>';
    }

    downloadAttachment(attachment) {
        const link = document.createElement('a');
        link.href = attachment.base64Data;
        link.download = attachment.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async deleteAttachment(attachment) {
        if (!confirm(`Delete "${attachment.fileName}"?`)) return;

        try {
            await db.collection('attachments').doc(attachment.id).delete();
            this.loadAttachments();
            this.options.onAttachmentDeleted(attachment);
            window.showToast?.('Attachment deleted', 'success');
        } catch (error) {
            console.error('Delete error:', error);
            window.showToast?.('Error deleting attachment', 'error');
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

window.AttachmentsManager = AttachmentsManager;
console.log('✅ Attachments system loaded');