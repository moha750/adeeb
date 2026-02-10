/**
 * نظام إدارة النوافذ المنبثقة الموحد
 * يوفر واجهة موحدة لفتح وإغلاق النوافذ المنبثقة في لوحة التحكم
 */

(function() {
    'use strict';

    // إنشاء عناصر النافذة المنبثقة الديناميكية
    function createModalElements() {
        // التحقق من وجود العناصر مسبقاً
        if (document.getElementById('dynamicModal')) return;

        // إنشاء الطبقة الشفافة
        const overlay = document.createElement('div');
        overlay.id = 'dynamicOverlay';
        overlay.className = 'modal-backdrop';
        overlay.addEventListener('click', closeModal);

        // إنشاء النافذة المنبثقة
        const modal = document.createElement('div');
        modal.id = 'dynamicModal';
        modal.className = 'modal modal-md';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-header-content">
                        <h3 id="dynamicModalTitle">
                            <i class="fa-solid fa-info-circle"></i>
                            عنوان النافذة
                        </h3>
                    </div>
                    <button class="modal-close-x" onclick="closeModal()">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="modal-body" id="dynamicModalBody">
                    <!-- سيتم ملؤه ديناميكياً -->
                </div>
                <div class="modal-footer" id="dynamicModalFooter">
                    <button class="btn btn--outline btn--outline-primary" onclick="closeModal()">
                        <i class="fa-solid fa-times"></i>
                        إغلاق
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        // إغلاق عند الضغط على ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeModal();
            }
        });
    }

    /**
     * فتح نافذة منبثقة
     * @param {string} title - عنوان النافذة
     * @param {string} content - محتوى النافذة (HTML)
     * @param {Object} options - خيارات إضافية
     */
    window.openModal = function(title, content, options = {}) {
        createModalElements();

        const modal = document.getElementById('dynamicModal');
        const overlay = document.getElementById('dynamicOverlay');
        const titleEl = document.getElementById('dynamicModalTitle');
        const bodyEl = document.getElementById('dynamicModalBody');
        const footerEl = document.getElementById('dynamicModalFooter');

        // تعيين العنوان
        const icon = options.icon || 'fa-info-circle';
        titleEl.innerHTML = `<i class="fa-solid ${icon}"></i> ${title}`;

        // تعيين المحتوى
        bodyEl.innerHTML = content;

        // تعيين الأزرار في الذيل
        if (options.footer) {
            footerEl.innerHTML = options.footer;
        } else {
            footerEl.innerHTML = `
                <button class="btn btn--outline btn--outline-primary" onclick="closeModal()">
                    <i class="fa-solid fa-times"></i>
                    إغلاق
                </button>
            `;
        }

        // إظهار النافذة
        overlay.classList.add('active');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // تنفيذ callback إذا وجد
        if (options.onOpen) {
            setTimeout(options.onOpen, 100);
        }
    };

    /**
     * إغلاق النافذة المنبثقة
     */
    window.closeModal = function() {
        const modal = document.getElementById('dynamicModal');
        const overlay = document.getElementById('dynamicOverlay');

        if (modal && overlay) {
            overlay.classList.remove('active');
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    };

    /**
     * فتح نافذة تأكيد
     * @param {string} title - عنوان النافذة
     * @param {string} message - رسالة التأكيد
     * @param {Function} onConfirm - دالة يتم تنفيذها عند التأكيد
     * @param {Object} options - خيارات إضافية
     */
    window.openConfirmModal = function(title, message, onConfirm, options = {}) {
        const iconClass = options.danger ? 'danger' : options.success ? 'success' : '';
        const icon = options.danger ? 'fa-exclamation-triangle' : 
                     options.success ? 'fa-check-circle' : 'fa-question-circle';
        
        const content = `
            <div class="confirm-modal">
                <div class="confirm-icon ${iconClass}">
                    <i class="fa-solid ${icon}"></i>
                </div>
                <div class="confirm-message">${title}</div>
                <div class="confirm-description">${message}</div>
            </div>
        `;

        const confirmBtnClass = options.danger ? 'btn--danger' : 'btn--primary';
        const confirmBtnText = options.confirmText || 'تأكيد';

        const footer = `
            <button class="btn btn--outline btn--outline-primary" onclick="closeModal()">
                <i class="fa-solid fa-times"></i>
                إلغاء
            </button>
            <button class="btn ${confirmBtnClass}" onclick="window.confirmModalAction()">
                <i class="fa-solid fa-check"></i>
                ${confirmBtnText}
            </button>
        `;

        // حفظ دالة التأكيد مؤقتاً
        window.confirmModalAction = function() {
            closeModal();
            if (onConfirm) onConfirm();
        };

        openModal('تأكيد', content, { 
            footer, 
            icon: icon
        });
    };

    /**
     * فتح نافذة نموذج
     * @param {string} title - عنوان النافذة
     * @param {Array} fields - حقول النموذج
     * @param {Function} onSubmit - دالة يتم تنفيذها عند الإرسال
     * @param {Object} options - خيارات إضافية
     */
    window.openFormModal = function(title, fields, onSubmit, options = {}) {
        let formHtml = '<form id="dynamicForm">';
        
        // التحقق من أن fields هو array
        if (!Array.isArray(fields)) {
            console.error('openFormModal: fields must be an array');
            return;
        }
        
        fields.forEach(field => {
            formHtml += `<div class="form-group">`;
            formHtml += `<label>${field.label}${field.required ? ' *' : ''}</label>`;
            
            if (field.type === 'textarea') {
                formHtml += `<textarea id="${field.id}" ${field.required ? 'required' : ''} 
                    placeholder="${field.placeholder || ''}" rows="${field.rows || 4}"></textarea>`;
            } else if (field.type === 'select') {
                formHtml += `<select id="${field.id}" ${field.required ? 'required' : ''}>`;
                field.options.forEach(opt => {
                    formHtml += `<option value="${opt.value}">${opt.label}</option>`;
                });
                formHtml += `</select>`;
            } else if (field.type === 'checkbox') {
                formHtml += `<label class="checkbox-label">
                    <input type="checkbox" id="${field.id}" ${field.checked ? 'checked' : ''} />
                    ${field.checkboxLabel || ''}
                </label>`;
            } else {
                formHtml += `<input type="${field.type || 'text'}" id="${field.id}" 
                    ${field.required ? 'required' : ''} placeholder="${field.placeholder || ''}" 
                    value="${field.value || ''}" />`;
            }
            
            formHtml += `</div>`;
        });
        
        formHtml += '</form>';

        const footer = `
            <button class="btn btn--outline btn--outline-primary" onclick="closeModal()">
                <i class="fa-solid fa-times"></i>
                إلغاء
            </button>
            <button class="btn btn--primary" onclick="window.submitDynamicForm()">
                <i class="fa-solid fa-check"></i>
                ${options.submitText || 'حفظ'}
            </button>
        `;

        // حفظ دالة الإرسال مؤقتاً
        window.submitDynamicForm = function() {
            const form = document.getElementById('dynamicForm');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const formData = {};
            fields.forEach(field => {
                const el = document.getElementById(field.id);
                if (field.type === 'checkbox') {
                    formData[field.id] = el.checked;
                } else {
                    formData[field.id] = el.value;
                }
            });

            closeModal();
            if (onSubmit) onSubmit(formData);
        };

        openModal(title, formHtml, { 
            footer, 
            icon: options.icon || 'fa-edit'
        });
    };

    /**
     * عرض رسالة نجاح
     */
    window.showSuccessModal = function(title, message) {
        const content = `
            <div class="confirm-modal">
                <div class="confirm-icon success">
                    <i class="fa-solid fa-check-circle"></i>
                </div>
                <div class="confirm-message">${title}</div>
                <div class="confirm-description">${message}</div>
            </div>
        `;

        openModal('نجح', content, { icon: 'fa-check-circle' });
    };

    /**
     * عرض رسالة خطأ
     */
    window.showErrorModal = function(title, message) {
        const content = `
            <div class="confirm-modal">
                <div class="confirm-icon danger">
                    <i class="fa-solid fa-exclamation-circle"></i>
                </div>
                <div class="confirm-message">${title}</div>
                <div class="confirm-description">${message}</div>
            </div>
        `;

        openModal('خطأ', content, { icon: 'fa-exclamation-circle' });
    };

    // تهيئة عند تحميل الصفحة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createModalElements);
    } else {
        createModalElements();
    }
})();
