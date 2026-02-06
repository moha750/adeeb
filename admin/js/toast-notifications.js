/**
 * نظام Toast Notifications - نادي أدِيب
 * بديل خفيف وأنيق لـ SweetAlert2
 */

window.Toast = (function() {
    let container = null;
    let toastCounter = 0;

    // تهيئة الحاوية
    function initContainer() {
        if (container) return;
        
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // إنشاء Toast
    function show(options = {}) {
        initContainer();

        const {
            type = 'info',
            title = '',
            message = '',
            duration = 4000,
            closable = true,
            icon = null,
            actions = null,
            image = null,
            persistent = false,
            onClose = null
        } = options;

        const toastId = `toast-${++toastCounter}`;
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast toast-${type}`;
        
        if (persistent) {
            toast.classList.add('toast-persistent');
        }

        if (image) {
            toast.classList.add('toast-with-image');
        }

        // بناء المحتوى
        let html = '';

        // الأيقونة
        const iconMap = {
            success: '<i class="fa-solid fa-circle-check"></i>',
            error: '<i class="fa-solid fa-circle-xmark"></i>',
            warning: '<i class="fa-solid fa-triangle-exclamation"></i>',
            info: '<i class="fa-solid fa-circle-info"></i>',
            loading: '<i class="fa-solid fa-spinner"></i>'
        };

        html += `<div class="toast-icon">${icon || iconMap[type] || iconMap.info}</div>`;

        // الصورة (إن وجدت)
        if (image) {
            html += `<img src="${image}" alt="" class="toast-image">`;
        }

        // المحتوى
        html += '<div class="toast-content">';
        if (title) {
            html += `<div class="toast-title">${title}</div>`;
        }
        if (message) {
            html += `<div class="toast-message">${message}</div>`;
        }

        // الأزرار (إن وجدت)
        if (actions && actions.length > 0) {
            html += '<div class="toast-actions">';
            actions.forEach(action => {
                html += `<button class="toast-action-btn ${action.type || 'secondary'}" onclick="Toast.handleAction('${toastId}', ${action.callback})">${action.label}</button>`;
            });
            html += '</div>';
        }

        html += '</div>';

        // زر الإغلاق - تم إزالته حسب الطلب
        // الإغلاق يتم تلقائياً بعد انتهاء المدة

        // شريط التقدم
        if (!persistent && duration > 0) {
            html += `<div class="toast-progress" style="animation-duration: ${duration}ms;"></div>`;
        }

        toast.innerHTML = html;
        container.appendChild(toast);

        // الإغلاق التلقائي
        if (!persistent && duration > 0) {
            setTimeout(() => {
                close(toastId, onClose);
            }, duration);
        }

        return toastId;
    }

    // إغلاق Toast
    function close(toastId, callback) {
        const toast = document.getElementById(toastId);
        if (!toast) return;

        toast.classList.add('hiding');
        
        setTimeout(() => {
            toast.remove();
            if (callback) callback();
            
            // إزالة الحاوية إذا كانت فارغة
            if (container && container.children.length === 0) {
                container.remove();
                container = null;
            }
        }, 300);
    }

    // إغلاق جميع Toast
    function closeAll() {
        if (!container) return;
        
        const toasts = container.querySelectorAll('.toast');
        toasts.forEach(toast => {
            toast.classList.add('hiding');
        });

        setTimeout(() => {
            if (container) {
                container.remove();
                container = null;
            }
        }, 300);
    }

    // معالج الأزرار
    function handleAction(toastId, callback) {
        if (callback && typeof callback === 'function') {
            callback();
        }
        close(toastId);
    }

    // دوال مختصرة
    function success(message, title = 'نجح') {
        return show({
            type: 'success',
            title: title,
            message: message
        });
    }

    function error(message, title = 'خطأ') {
        return show({
            type: 'error',
            title: title,
            message: message,
            duration: 5000
        });
    }

    function warning(message, title = 'تنبيه') {
        return show({
            type: 'warning',
            title: title,
            message: message
        });
    }

    function info(message, title = 'معلومة') {
        return show({
            type: 'info',
            title: title,
            message: message
        });
    }

    function loading(message, title = 'جاري التحميل...') {
        return show({
            type: 'loading',
            title: title,
            message: message,
            persistent: true,
            closable: false
        });
    }

    // Toast مع تأكيد
    function confirm(options = {}) {
        const {
            title = 'هل أنت متأكد؟',
            message = '',
            confirmText = 'تأكيد',
            cancelText = 'إلغاء',
            onConfirm = null,
            onCancel = null,
            type = 'warning'
        } = options;

        return show({
            type: type,
            title: title,
            message: message,
            persistent: true,
            actions: [
                {
                    label: cancelText,
                    type: 'secondary',
                    callback: onCancel
                },
                {
                    label: confirmText,
                    type: 'primary',
                    callback: onConfirm
                }
            ]
        });
    }

    // Toast مع إدخال (بسيط)
    function prompt(options = {}) {
        const {
            title = 'أدخل قيمة',
            message = '',
            placeholder = '',
            defaultValue = '',
            confirmText = 'تأكيد',
            cancelText = 'إلغاء',
            onConfirm = null,
            onCancel = null
        } = options;

        // إنشاء modal بسيط بدلاً من toast
        const modal = document.createElement('div');
        modal.className = 'modal modal-sm active';
        modal.innerHTML = `
            <div class="modal-header">
                <h3>${title}</h3>
            </div>
            <div class="modal-body">
                ${message ? `<p>${message}</p>` : ''}
                <input type="text" class="form-input" id="promptInput" placeholder="${placeholder}" value="${defaultValue}" style="width: 100%; margin-top: 0.5rem;">
            </div>
            <div class="modal-footer">
                <button class="btn btn--outline btn--outline-secondary" onclick="Toast.closePrompt(false)">${cancelText}</button>
                <button class="btn btn--primary" onclick="Toast.closePrompt(true)">${confirmText}</button>
            </div>
        `;

        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop active';
        backdrop.onclick = () => closePrompt(false);

        document.body.appendChild(backdrop);
        document.body.appendChild(modal);
        document.body.classList.add('modal-open');

        // تخزين callbacks
        window._promptCallbacks = { onConfirm, onCancel };

        // التركيز على الإدخال
        setTimeout(() => {
            const input = document.getElementById('promptInput');
            if (input) {
                input.focus();
                input.select();
            }
        }, 100);
    }

    function closePrompt(confirmed) {
        const input = document.getElementById('promptInput');
        const value = input ? input.value : '';
        
        const callbacks = window._promptCallbacks || {};
        
        if (confirmed && callbacks.onConfirm) {
            callbacks.onConfirm(value);
        } else if (!confirmed && callbacks.onCancel) {
            callbacks.onCancel();
        }

        // إزالة العناصر
        const modal = document.querySelector('.modal.active');
        const backdrop = document.querySelector('.modal-backdrop.active');
        
        if (modal) modal.remove();
        if (backdrop) backdrop.remove();
        document.body.classList.remove('modal-open');
        
        delete window._promptCallbacks;
    }

    // عرض Toast مجمّع
    function group(options = {}) {
        const {
            title = 'إشعارات',
            count = 0,
            message = `لديك ${count} إشعار جديد`,
            type = 'info',
            onClick = null
        } = options;

        const toastId = show({
            type: type,
            title: `<span class="toast-group-badge">${count}</span>${title}`,
            message: message,
            persistent: false,
            duration: 5000
        });

        if (onClick) {
            const toast = document.getElementById(toastId);
            if (toast) {
                toast.classList.add('toast-group');
                toast.style.cursor = 'pointer';
                toast.onclick = () => {
                    onClick();
                    close(toastId);
                };
            }
        }

        return toastId;
    }

    return {
        show,
        close,
        closeAll,
        success,
        error,
        warning,
        info,
        loading,
        confirm,
        prompt,
        closePrompt,
        group,
        handleAction
    };
})();

// اختصارات عامة
window.showToast = window.Toast.show;
window.toastSuccess = window.Toast.success;
window.toastError = window.Toast.error;
window.toastWarning = window.Toast.warning;
window.toastInfo = window.Toast.info;
window.toastLoading = window.Toast.loading;
