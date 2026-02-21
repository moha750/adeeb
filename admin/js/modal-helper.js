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
            type = '', // success, warning, danger, info, purple
            extraClass = '', // modal-form, modal-share, etc.
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
            const typeClass = type ? ` modal-${type}` : '';
            const extraCls = extraClass ? ` ${extraClass}` : '';
            modal.className = `modal modal-${size}${typeClass}${extraCls}`;
            modal.id = modalId;

            let modalHTML = '';
            
            if (title) {
                modalHTML += `
                    <div class="modal-header">
                        <div class="modal-header-content">
                            <h3>${title}</h3>
                        </div>
                        ${showClose ? '<button class="modal-close-x" data-action="close"><i class="fa-solid fa-xmark"></i></button>' : ''}
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
                modal.classList.add('closing');
                backdrop.classList.remove('active');
                
                setTimeout(() => {
                    modal.remove();
                    backdrop.remove();
                    document.body.classList.remove('modal-open');
                }, 400);

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
            let formHTML = '<form id="modalForm" class="modal-form-fields">';
            
            fields.forEach(field => {
                formHTML += `<div class="form-group">`;
                if (field.label) {
                    formHTML += `<label>${field.label}${field.required ? ' <span class="required">*</span>' : ''}</label>`;
                }

                switch (field.type) {
                    case 'textarea':
                        formHTML += `<textarea class="form-textarea" name="${field.name}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}>${field.value || ''}</textarea>`;
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
                    case 'image': {
                        const imgInputId = 'modalImg_' + field.name;
                        const imgPreviewId = 'modalImgPreview_' + field.name;
                        const imgFolder = field.folder || 'general';
                        formHTML += `
                            ${field.value ? `<div class="image-preview-container" id="${imgPreviewId}_current_wrap" style="margin-bottom: 0.75rem;"><img src="${field.value}" alt="الصورة الحالية" style="max-width: 100%; max-height: 150px; border-radius: 8px; object-fit: contain;"></div>` : ''}
                            <div id="${imgPreviewId}" style="display: none; margin-bottom: 0.75rem;">
                                <img id="${imgPreviewId}_img" src="" alt="معاينة" style="max-width: 100%; max-height: 150px; border-radius: 8px; object-fit: contain;">
                            </div>
                            <input type="file" id="${imgInputId}" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" class="form-input" data-field-name="${field.name}" data-folder="${imgFolder}" data-image-upload="true"
                                onchange="(function(inp){var p=document.getElementById('${imgPreviewId}');var pi=document.getElementById('${imgPreviewId}_img');var cw=document.getElementById('${imgPreviewId}_current_wrap');if(inp.files&&inp.files[0]){var r=new FileReader();r.onload=function(e){pi.src=e.target.result;p.style.display='block';if(cw)cw.style.display='none';};r.readAsDataURL(inp.files[0]);}else{p.style.display='none';if(cw)cw.style.display='';}})(this)">
                            <input type="hidden" name="${field.name}" value="${field.value || ''}">
                            <small class="form-hint"><i class="fa-solid fa-info-circle"></i> الصيغ المدعومة: JPG, PNG, WEBP, GIF (الحد الأقصى: 5 ميجابايت)</small>
                        `;
                        break;
                    }
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
                extraClass: 'modal-form',
                showFooter: true,
                footerButtons: [
                    {
                        text: cancelText,
                        class: 'btn btn--outline btn--outline-secondary',
                        callback: () => {
                            if (onCancel) onCancel();
                        }
                    },
                    {
                        text: submitText,
                        class: 'btn btn--primary',
                        callback: async () => {
                            const form = document.getElementById('modalForm');
                            if (form && form.checkValidity()) {
                                const formData = new FormData(form);
                                const data = {};
                                for (let [key, value] of formData.entries()) {
                                    data[key] = value;
                                }
                                // معالجة checkboxes غير المحددة
                                fields.forEach(f => {
                                    if (f.type === 'checkbox' && !data[f.name]) {
                                        data[f.name] = '';
                                    }
                                });
                                // رفع الصور قبل الإرسال
                                const imageInputs = form.querySelectorAll('input[data-image-upload="true"]');
                                for (const imgInput of imageInputs) {
                                    if (imgInput.files && imgInput.files[0] && window.ImageUploadHelper) {
                                        const folder = imgInput.dataset.folder || 'general';
                                        const fieldName = imgInput.dataset.fieldName;
                                        try {
                                            const result = await window.ImageUploadHelper.uploadImage(imgInput.files[0], folder);
                                            if (result && result.success) {
                                                data[fieldName] = result.url;
                                            } else {
                                                throw new Error(result?.error || 'فشل رفع الصورة');
                                            }
                                        } catch (uploadErr) {
                                            console.error('Image upload error:', uploadErr);
                                            if (window.Toast) Toast.error('فشل رفع الصورة: ' + uploadErr.message);
                                            return;
                                        }
                                    }
                                }
                                try {
                                    if (onSubmit) await onSubmit(data);
                                    resolve(data);
                                    // إغلاق المودال بعد نجاح العملية
                                    const modal = document.querySelector('.modal.active');
                                    const backdrop = document.querySelector('.modal-backdrop.active');
                                    if (modal) {
                                        modal.classList.add('closing');
                                        setTimeout(() => modal.remove(), 400);
                                    }
                                    if (backdrop) {
                                        backdrop.classList.remove('active');
                                        setTimeout(() => backdrop.remove(), 400);
                                    }
                                    document.body.classList.remove('modal-open');
                                } catch (error) {
                                    console.error('Error in form submit:', error);
                                }
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
