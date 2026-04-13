/**
 * Modal Manager — طبقة توافق فوق ModalHelper
 * يوفر: openModal, closeModal, openConfirmModal, openFormModal, showSuccessModal, showErrorModal
 */

(function() {
    'use strict';

    /**
     * فتح نافذة منبثقة
     */
    window.openModal = function(title, content, options = {}) {
        const size = options.size || 'md';
        const icon = options.icon || 'fa-info-circle';

        ModalHelper.show({
            title,
            html: content,
            size,
            type: options.variant || '',
            iconClass: icon,
            extraClass: options.cls || '',
            showClose: true,
            footerHtml: options.footer || '',
            onOpen: options.onOpen || null,
            onClose: options.onClose || null
        });
    };

    /**
     * إغلاق النافذة المنبثقة
     */
    window.closeModal = function() {
        ModalHelper.closeAll();
    };

    /**
     * فتح نافذة تأكيد
     */
    window.openConfirmModal = function(title, message, onConfirm, options = {}) {
        const type = options.danger ? 'danger' :
                     options.success ? 'success' :
                     options.warning ? 'warning' : 'warning';

        ModalHelper.confirm({
            title,
            message,
            type,
            confirmText: options.confirmText || 'تأكيد',
            onConfirm
        });
    };

    /**
     * فتح نافذة نموذج
     */
    window.openFormModal = function(title, fields, onSubmit, options = {}) {
        // التحقق من أن fields مصفوفة
        if (!Array.isArray(fields)) {
            console.error('openFormModal: fields must be an array');
            return;
        }

        // بناء HTML النموذج
        let formHtml = '<form id="dynamicForm"><div class="modal-form-grid">';

        fields.forEach(field => {
            const fullWidthClass = (field.fullWidth || field.type === 'textarea') ? ' full-width' : '';
            formHtml += `<div class="form-group${fullWidthClass}">`;
            const iconHtml = field.icon ? `<span class="label-icon"><i class="fa-solid ${field.icon}"></i></span> ` : '';
            formHtml += `<label class="form-label">${iconHtml}${field.label}${field.required ? ' <span class="required-dot">*</span>' : ''}</label>`;

            if (field.type === 'textarea') {
                formHtml += `<textarea id="${field.id}" class="form-input form-textarea" ${field.required ? 'required' : ''}
                    placeholder="${field.placeholder || ''}" rows="${field.rows || 4}"></textarea>`;
            } else if (field.type === 'select') {
                formHtml += `<select id="${field.id}" class="form-select" ${field.required ? 'required' : ''}>`;
                field.options.forEach(opt => {
                    formHtml += `<option value="${opt.value}">${opt.label}</option>`;
                });
                formHtml += `</select>`;
            } else if (field.type === 'checkbox') {
                formHtml += `<label class="form-checkbox">
                    <input type="checkbox" id="${field.id}" ${field.checked ? 'checked' : ''} />
                    <span class="form-checkbox-label">${field.checkboxLabel || ''}</span>
                </label>`;
            } else {
                formHtml += `<input type="${field.type || 'text'}" id="${field.id}" class="form-input"
                    ${field.required ? 'required' : ''} placeholder="${field.placeholder || ''}"
                    value="${field.value || ''}" />`;
            }

            formHtml += `</div>`;
        });

        formHtml += '</div></form>';

        // حفظ دالة الإرسال
        window.submitDynamicForm = function() {
            const form = document.getElementById('dynamicForm');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            const formData = {};
            fields.forEach(field => {
                const el = document.getElementById(field.id);
                formData[field.id] = field.type === 'checkbox' ? el.checked : el.value;
            });
            closeModal();
            if (onSubmit) onSubmit(formData);
        };

        const footer = `
            <button class="btn btn-outline" onclick="closeModal()">
                <i class="fa-solid fa-times"></i>
                إلغاء
            </button>
            <button class="btn btn-${options.variant || 'primary'}" onclick="window.submitDynamicForm()">
                <i class="fa-solid fa-check"></i>
                ${options.submitText || 'حفظ'}
            </button>
        `;

        openModal(title, formHtml, {
            footer,
            icon: options.icon || 'fa-edit',
            variant: options.variant,
            onOpen: options.onOpen
        });
    };

    /**
     * عرض رسالة نجاح
     */
    window.showSuccessModal = function(title, message) {
        const content = `
            <div class="modal-alert-icon"><i class="fa-solid fa-circle-check"></i></div>
            <h3 class="modal-alert-title">${title}</h3>
            <p class="modal-alert-message">${message}</p>
        `;
        const footer = `<button class="btn btn-success btn-md" onclick="closeModal()">ممتاز!</button>`;
        openModal(title, content, { icon: 'fa-circle-check', variant: 'success', cls: 'modal-alert', footer });
    };

    /**
     * عرض رسالة خطأ
     */
    window.showErrorModal = function(title, message) {
        const content = `
            <div class="modal-alert-icon"><i class="fa-solid fa-circle-xmark"></i></div>
            <h3 class="modal-alert-title">${title}</h3>
            <p class="modal-alert-message">${message}</p>
        `;
        const footer = `<button class="btn btn-danger" onclick="closeModal()">إغلاق</button>`;
        openModal(title, content, { icon: 'fa-triangle-exclamation', variant: 'danger', cls: 'modal-alert', footer });
    };

})();
