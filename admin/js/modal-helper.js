/**
 * Modal Helper - بديل لـ SweetAlert2
 * يستخدم modals.css و toast-notifications.js
 */

window.ModalHelper = (function() {
    
    // عرض modal تأكيد
    function confirm(options = {}) {
        const {
            title = 'تأكيد',
            message = 'هل أنت متأكد؟',
            confirmText = 'تأكيد',
            cancelText = 'إلغاء',
            type = 'warning', // warning, danger, info
            onConfirm = null,
            onCancel = null
        } = options;

        return new Promise((resolve) => {
            const modalId = 'confirmModal' + Date.now();
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop';
            backdrop.id = modalId + '-backdrop';

            const modal = document.createElement('div');
            modal.className = `modal modal-confirm modal-${type}`;
            modal.id = modalId;

            const iconMap = {
                warning: '⚠️',
                danger: '🗑️',
                info: 'ℹ️',
                success: '✅'
            };

            modal.innerHTML = `
                <div class="modal-body">
                    <div class="modal-confirm-icon ${type}">${iconMap[type] || iconMap.warning}</div>
                    <div class="modal-confirm-title">${title}</div>
                    <p class="modal-confirm-message">${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn--outline btn--outline-secondary" data-action="cancel">${cancelText}</button>
                    <button class="btn btn--${type === 'danger' ? 'danger' : 'primary'}" data-action="confirm">${confirmText}</button>
                </div>
            `;

            document.body.appendChild(backdrop);
            document.body.appendChild(modal);
            document.body.classList.add('modal-open');

            setTimeout(() => {
                backdrop.classList.add('active');
                modal.classList.add('active');
            }, 10);

            const closeModal = (confirmed) => {
                modal.classList.remove('active');
                backdrop.classList.remove('active');
                
                setTimeout(() => {
                    modal.remove();
                    backdrop.remove();
                    document.body.classList.remove('modal-open');
                }, 300);

                if (confirmed && onConfirm) onConfirm();
                if (!confirmed && onCancel) onCancel();
                
                resolve(confirmed);
            };

            modal.querySelector('[data-action="confirm"]').onclick = () => closeModal(true);
            modal.querySelector('[data-action="cancel"]').onclick = () => closeModal(false);
            backdrop.onclick = () => closeModal(false);
        });
    }

    // عرض modal بمحتوى مخصص
    function show(options = {}) {
        const {
            title = '',
            html = '',
            size = 'md', // sm, md, lg, xl
            showClose = true,
            showFooter = false,
            footerButtons = [],
            onClose = null
        } = options;

        return new Promise((resolve) => {
            const modalId = 'customModal' + Date.now();
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop';
            backdrop.id = modalId + '-backdrop';

            const modal = document.createElement('div');
            modal.className = `modal modal-${size}`;
            modal.id = modalId;

            let modalHTML = '';
            
            if (title) {
                modalHTML += `
                    <div class="modal-header">
                        <h3>${title}</h3>
                        ${showClose ? '<button class="modal-close" data-action="close">✕</button>' : ''}
                    </div>
                `;
            }

            modalHTML += `<div class="modal-body">${html}</div>`;

            if (showFooter && footerButtons.length > 0) {
                modalHTML += '<div class="modal-footer">';
                footerButtons.forEach((btn, index) => {
                    modalHTML += `<button class="btn ${btn.class || 'btn--outline btn--outline-secondary'}" data-action="btn-${index}">${btn.text}</button>`;
                });
                modalHTML += '</div>';
            }

            modal.innerHTML = modalHTML;

            document.body.appendChild(backdrop);
            document.body.appendChild(modal);
            document.body.classList.add('modal-open');

            setTimeout(() => {
                backdrop.classList.add('active');
                modal.classList.add('active');
            }, 10);

            const closeModal = (result = null) => {
                modal.classList.remove('active');
                backdrop.classList.remove('active');
                
                setTimeout(() => {
                    modal.remove();
                    backdrop.remove();
                    document.body.classList.remove('modal-open');
                }, 300);

                if (onClose) onClose(result);
                resolve(result);
            };

            if (showClose) {
                const closeBtn = modal.querySelector('[data-action="close"]');
                if (closeBtn) closeBtn.onclick = () => closeModal(null);
            }

            footerButtons.forEach((btn, index) => {
                const btnElement = modal.querySelector(`[data-action="btn-${index}"]`);
                if (btnElement) {
                    btnElement.onclick = () => {
                        if (btn.callback) btn.callback();
                        if (!btn.keepOpen) closeModal(btn.value || index);
                    };
                }
            });

            backdrop.onclick = () => closeModal(null);

            // إرجاع المودال للتحكم به
            resolve({
                element: modal,
                close: closeModal
            });
        });
    }

    // عرض modal بنموذج
    function form(options = {}) {
        const {
            title = '',
            fields = [],
            submitText = 'حفظ',
            cancelText = 'إلغاء',
            onSubmit = null,
            onCancel = null
        } = options;

        return new Promise((resolve) => {
            let formHTML = '<form id="modalForm" style="display: flex; flex-direction: column; gap: 1rem;">';
            
            fields.forEach(field => {
                formHTML += `<div class="form-group">`;
                if (field.label) {
                    formHTML += `<label class="form-label">${field.label}${field.required ? ' <span style="color: #ef4444;">*</span>' : ''}</label>`;
                }

                switch (field.type) {
                    case 'textarea':
                        formHTML += `<textarea class="form-input" name="${field.name}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}>${field.value || ''}</textarea>`;
                        break;
                    case 'select':
                        formHTML += `<select class="form-select" name="${field.name}" ${field.required ? 'required' : ''}>`;
                        if (field.placeholder) {
                            formHTML += `<option value="">${field.placeholder}</option>`;
                        }
                        (field.options || []).forEach(opt => {
                            formHTML += `<option value="${opt.value}" ${opt.value === field.value ? 'selected' : ''}>${opt.label}</option>`;
                        });
                        formHTML += `</select>`;
                        break;
                    case 'checkbox':
                        formHTML += `<label class="form-checkbox"><input type="checkbox" name="${field.name}" ${field.checked ? 'checked' : ''}> ${field.checkboxLabel || ''}</label>`;
                        break;
                    default:
                        formHTML += `<input type="${field.type || 'text'}" class="form-input" name="${field.name}" placeholder="${field.placeholder || ''}" value="${field.value || ''}" ${field.required ? 'required' : ''}>`;
                }

                if (field.hint) {
                    formHTML += `<small class="form-hint">${field.hint}</small>`;
                }
                formHTML += `</div>`;
            });

            formHTML += '</form>';

            show({
                title: title,
                html: formHTML,
                size: 'md',
                showFooter: true,
                footerButtons: [
                    {
                        text: cancelText,
                        class: 'btn--outline btn--outline-secondary',
                        callback: () => {
                            if (onCancel) onCancel();
                        }
                    },
                    {
                        text: submitText,
                        class: 'btn--primary',
                        callback: () => {
                            const form = document.getElementById('modalForm');
                            if (form && form.checkValidity()) {
                                const formData = new FormData(form);
                                const data = {};
                                for (let [key, value] of formData.entries()) {
                                    data[key] = value;
                                }
                                if (onSubmit) onSubmit(data);
                                resolve(data);
                            } else {
                                form.reportValidity();
                            }
                        },
                        keepOpen: true
                    }
                ]
            });
        });
    }

    return {
        confirm,
        show,
        form
    };
})();

// اختصارات عامة
window.showModal = window.ModalHelper.show;
window.confirmModal = window.ModalHelper.confirm;
window.formModal = window.ModalHelper.form;
