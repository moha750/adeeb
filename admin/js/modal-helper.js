/**
 * Modal Helper — النظام الموحد للنوافذ المنبثقة
 * يستخدم modals.css و toast-notifications.js
 */

window.ModalHelper = (function() {

    // ─── ESC handler عام ───
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const topModal = [...document.querySelectorAll('.modal.active')].pop();
            if (topModal) {
                const backdrop = document.getElementById(topModal.id + '-backdrop');
                _animateClose(topModal, backdrop);
            }
        }
    });

    // ─── دالة إغلاق مشتركة ───
    function _animateClose(modal, backdrop, callback) {
        if (!modal) return;
        modal.classList.add('closing');
        if (backdrop) backdrop.classList.remove('active');

        setTimeout(() => {
            modal.remove();
            if (backdrop) backdrop.remove();
            // إزالة modal-open فقط إذا لم يتبق نوافذ نشطة
            if (!document.querySelector('.modal.active')) {
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
            }
            if (callback) callback();
        }, 300);
    }

    // ─── إنشاء عناصر أساسية ───
    function _createBase(id, sizeClass, typeClass, extraClass) {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        backdrop.id = id + '-backdrop';

        const modal = document.createElement('div');
        modal.className = `modal ${sizeClass}${typeClass}${extraClass}`;
        modal.id = id;

        document.body.appendChild(backdrop);
        document.body.appendChild(modal);
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            backdrop.classList.add('active');
            modal.classList.add('active');
        }, 10);

        return { modal, backdrop };
    }

    // ════════════════════════════════════════
    //  confirm — نافذة تأكيد (ترجع Promise)
    // ════════════════════════════════════════
    function confirm(options = {}) {
        const {
            title = 'تأكيد',
            message = 'هل أنت متأكد؟',
            confirmText = 'تأكيد',
            cancelText = 'إلغاء',
            type = 'warning',
            onConfirm = null,
            onCancel = null
        } = options;

        return new Promise((resolve) => {
            const id = 'confirmModal' + Date.now();
            const { modal, backdrop } = _createBase(
                id,
                'modal-sm',
                ` modal-confirm modal-${type}`,
                ''
            );

            const iconMap = {
                default: 'fa-solid fa-circle-question',
                warning: 'fa-solid fa-triangle-exclamation',
                danger: 'fa-solid fa-trash-can',
                info: 'fa-solid fa-circle-info',
                success: 'fa-solid fa-circle-check'
            };

            const confirmBtnClass = type === 'danger' ? 'btn-danger' :
                                    type === 'success' ? 'btn-success' :
                                    type === 'warning' ? 'btn-warning' : 'btn-primary';

            modal.innerHTML = `
                <div class="modal-body">
                    <div class="modal-confirm-icon">
                        <i class="${iconMap[type] || iconMap.warning}"></i>
                    </div>
                    <div class="modal-confirm-content">
                        <h3 class="modal-confirm-title">${title}</h3>
                        <p class="modal-confirm-message">${message}</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" data-action="cancel">${cancelText}</button>
                    <button class="btn ${confirmBtnClass}" data-action="confirm">${confirmText}</button>
                </div>
            `;

            const close = (confirmed) => {
                _animateClose(modal, backdrop, () => {
                    if (confirmed && onConfirm) onConfirm();
                    if (!confirmed && onCancel) onCancel();
                    resolve(confirmed);
                });
            };

            modal.querySelector('[data-action="confirm"]').onclick = () => close(true);
            modal.querySelector('[data-action="cancel"]').onclick = () => close(false);
            backdrop.onclick = () => close(false);
        });
    }

    // ════════════════════════════════════════
    //  show — نافذة بمحتوى مخصص
    // ════════════════════════════════════════
    function show(options = {}) {
        const {
            title = '',
            html = '',
            size = 'md',
            type = '',
            extraClass = '',
            iconClass = '',
            showClose = true,
            showFooter = false,
            footerButtons = [],
            footerHtml = '',
            onOpen = null,
            onClose = null
        } = options;

        const id = 'modal' + Date.now();
        const typeClass = type ? ` modal-${type}` : '';
        const extraCls = extraClass ? ` ${extraClass}` : '';
        const { modal, backdrop } = _createBase(id, `modal-${size}`, typeClass, extraCls);

        let modalHTML = '';

        if (title) {
            modalHTML += `
                <div class="modal-header">
                    <div class="modal-header-content">
                        ${iconClass ? `<div class="modal-icon"><i class="fa-solid ${iconClass}"></i></div>` : ''}
                        <h2 class="modal-title">${title}</h2>
                    </div>
                    ${showClose ? '<button class="modal-close" data-action="close"><i class="fa-solid fa-xmark"></i></button>' : ''}
                </div>
            `;
        }

        modalHTML += `<div class="modal-body">${html}</div>`;

        if (showFooter || footerHtml || footerButtons.length > 0) {
            if (footerHtml) {
                modalHTML += `<div class="modal-footer">${footerHtml}</div>`;
            } else if (footerButtons.length > 0) {
                modalHTML += '<div class="modal-footer">';
                footerButtons.forEach((btn, i) => {
                    modalHTML += `<button class="btn ${btn.class || 'btn-outline'}" data-action="btn-${i}">${btn.text}</button>`;
                });
                modalHTML += '</div>';
            }
        }

        modal.innerHTML = modalHTML;

        const closeModal = (result = null) => {
            _animateClose(modal, backdrop, () => {
                if (onClose) onClose(result);
            });
        };

        if (showClose) {
            const closeBtn = modal.querySelector('[data-action="close"]');
            if (closeBtn) closeBtn.onclick = () => closeModal(null);
        }

        footerButtons.forEach((btn, i) => {
            const btnEl = modal.querySelector(`[data-action="btn-${i}"]`);
            if (btnEl) {
                btnEl.onclick = () => {
                    if (btn.callback) btn.callback();
                    if (!btn.keepOpen) closeModal(btn.value || i);
                };
            }
        });

        backdrop.onclick = () => closeModal(null);

        if (onOpen) setTimeout(onOpen, 100);

        return { element: modal, close: closeModal };
    }

    // ════════════════════════════════════════
    //  form — نافذة بنموذج
    // ════════════════════════════════════════
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
                    formHTML += `<label>${field.label}${field.required ? ' <span class="required-dot">*</span>' : ''}</label>`;
                }

                switch (field.type) {
                    case 'textarea':
                        formHTML += `<textarea class="form-textarea" name="${field.name}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}>${field.value || ''}</textarea>`;
                        break;
                    case 'select':
                        formHTML += `<select class="form-select" name="${field.name}" ${field.required ? 'required' : ''}>`;
                        if (field.placeholder) formHTML += `<option value="">${field.placeholder}</option>`;
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

                if (field.hint) formHTML += `<small class="form-hint">${field.hint}</small>`;
                formHTML += `</div>`;
            });

            formHTML += '</form>';

            const { close } = show({
                title,
                html: formHTML,
                size: 'md',
                extraClass: 'modal-form',
                showFooter: true,
                footerButtons: [
                    {
                        text: cancelText,
                        class: 'btn btn-secondary',
                        callback: () => { if (onCancel) onCancel(); }
                    },
                    {
                        text: submitText,
                        class: 'btn btn-primary',
                        callback: async () => {
                            const formEl = document.getElementById('modalForm');
                            if (formEl && formEl.checkValidity()) {
                                const formData = new FormData(formEl);
                                const data = {};
                                for (let [key, value] of formData.entries()) data[key] = value;
                                fields.forEach(f => {
                                    if (f.type === 'checkbox' && !data[f.name]) data[f.name] = '';
                                });
                                const imageInputs = formEl.querySelectorAll('input[data-image-upload="true"]');
                                for (const imgInput of imageInputs) {
                                    if (imgInput.files && imgInput.files[0] && window.ImageUploadHelper) {
                                        const folder = imgInput.dataset.folder || 'general';
                                        const fieldName = imgInput.dataset.fieldName;
                                        try {
                                            const result = await window.ImageUploadHelper.uploadImage(imgInput.files[0], folder);
                                            if (result && result.success) data[fieldName] = result.url;
                                            else throw new Error(result?.error || 'فشل رفع الصورة');
                                        } catch (err) {
                                            console.error('Image upload error:', err);
                                            if (window.Toast) Toast.error('فشل رفع الصورة: ' + err.message);
                                            return;
                                        }
                                    }
                                }
                                try {
                                    if (onSubmit) await onSubmit(data);
                                    resolve(data);
                                    close();
                                } catch (error) {
                                    console.error('Error in form submit:', error);
                                }
                            } else {
                                formEl.reportValidity();
                            }
                        },
                        keepOpen: true
                    }
                ]
            });
        });
    }

    // ════════════════════════════════════════
    //  closeAll — إغلاق جميع النوافذ النشطة
    // ════════════════════════════════════════
    function closeAll() {
        document.querySelectorAll('.modal.active').forEach(modal => {
            const backdrop = document.getElementById(modal.id + '-backdrop');
            _animateClose(modal, backdrop);
        });
    }

    return { confirm, show, form, closeAll };
})();

// اختصارات عامة
window.showModal = window.ModalHelper.show;
window.confirmModal = window.ModalHelper.confirm;
window.formModal = window.ModalHelper.form;
