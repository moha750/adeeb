/**
 * SweetAlert2 Compatibility Shim
 * يحوّل استدعاءات Swal.fire إلى ModalHelper تلقائياً
 * بديل كامل لمكتبة SweetAlert2 الخارجية
 */

(function() {
    'use strict';

    const MH = window.ModalHelper;
    if (!MH) {
        console.warn('[SwalShim] ModalHelper not found');
        return;
    }

    // Toast helper
    function showToast(message, type) {
        if (window.Toast) {
            if (type === 'success') window.Toast.success(message);
            else if (type === 'error') window.Toast.error(message);
            else if (type === 'warning') window.Toast.warning(message);
            else if (type === 'info') window.Toast.info(message);
            else window.Toast.show(message);
        }
    }

    // تتبع المودال الحالي لـ showValidationMessage
    let currentValidationContainer = null;

    /**
     * Swal.fire compatibility
     * يدعم:
     * - confirm dialogs (showCancelButton)
     * - form dialogs (html + preConfirm)
     * - alert/success/error dialogs
     * - timer auto-close
     */
    async function swalFire(options) {
        // Handle string arguments: Swal.fire('title', 'text', 'icon')
        if (typeof options === 'string') {
            options = {
                title: arguments[0],
                text: arguments[1],
                icon: arguments[2]
            };
        }

        const {
            title = '',
            text = '',
            html = '',
            icon = '',
            showCancelButton = false,
            showConfirmButton = true,
            confirmButtonText = 'موافق',
            cancelButtonText = 'إلغاء',
            confirmButtonColor,
            cancelButtonColor,
            timer = 0,
            showConfirmButton: showBtn = true,
            preConfirm = null,
            width,
            customClass,
            allowOutsideClick = true,
            allowEscapeKey = true,
            focusConfirm = true,
            didOpen,
            willClose,
            input,
            inputLabel,
            inputPlaceholder,
            inputValue,
            inputOptions,
            inputValidator,
        } = options;

        // Simple alert with timer (success/error notifications)
        if (timer > 0 && !showCancelButton && !preConfirm) {
            const typeMap = { success: 'success', error: 'error', warning: 'warning', info: 'info' };
            showToast(text || title, typeMap[icon] || 'info');
            return { isConfirmed: true, isDismissed: false, value: true };
        }

        // Simple alert without cancel (just OK button)
        if (!showCancelButton && !preConfirm && !html) {
            showToast(text || title, icon || 'info');
            return { isConfirmed: true, isDismissed: false, value: true };
        }

        // Confirm dialog (delete confirmations etc.)
        if (showCancelButton && !preConfirm && !html) {
            const typeMap = { warning: 'warning', error: 'danger', question: 'info' };
            const confirmed = await MH.confirm({
                title: stripHtml(title),
                message: text,
                type: typeMap[icon] || 'warning',
                confirmText: confirmButtonText,
                cancelText: cancelButtonText
            });
            return {
                isConfirmed: confirmed,
                isDismissed: !confirmed,
                value: confirmed
            };
        }

        // Form dialog (html + preConfirm)
        if (html && preConfirm) {
            return new Promise((resolve) => {
                // Determine size from width
                let size = 'md';
                if (width) {
                    const w = parseInt(width);
                    if (w >= 800) size = 'lg';
                    else if (w >= 600) size = 'md';
                    else size = 'sm';
                }

                // Add validation message container
                const bodyHtml = `
                    <div id="swalShimValidation" class="validation-message validation-message--hidden"></div>
                    ${html}
                `;

                const modalResult = MH.show({
                    title: stripHtml(title),
                    html: bodyHtml,
                    size: size,
                    extraClass: 'modal-form',
                    showFooter: true,
                    footerButtons: [
                        {
                            text: cancelButtonText,
                            class: 'btn--outline btn--outline-secondary',
                            callback: () => {},
                            value: 'cancel'
                        },
                        {
                            text: confirmButtonText,
                            class: 'btn--primary',
                            callback: async () => {
                                // Set validation container
                                currentValidationContainer = document.getElementById('swalShimValidation');
                                if (currentValidationContainer) {
                                    currentValidationContainer.style.display = 'none';
                                }

                                try {
                                    const result = await preConfirm();
                                    if (result === false) return; // validation failed

                                    // Close modal
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

                                    resolve({
                                        isConfirmed: true,
                                        isDismissed: false,
                                        value: result
                                    });
                                } catch (error) {
                                    console.error('[SwalShim] preConfirm error:', error);
                                    if (currentValidationContainer) {
                                        currentValidationContainer.textContent = error.message || 'حدث خطأ';
                                        currentValidationContainer.style.display = 'block';
                                    }
                                }
                            },
                            keepOpen: true
                        }
                    ],
                    onClose: () => {
                        resolve({
                            isConfirmed: false,
                            isDismissed: true,
                            value: undefined
                        });
                    }
                });

                // Call didOpen if provided
                if (didOpen) {
                    setTimeout(() => {
                        const modal = document.querySelector('.modal.active');
                        if (modal) didOpen(modal);
                    }, 50);
                }
            });
        }

        // Form dialog with html but no preConfirm (just show content)
        if (html || showCancelButton) {
            return new Promise((resolve) => {
                const buttons = [];
                if (showCancelButton) {
                    buttons.push({
                        text: cancelButtonText,
                        class: 'btn--outline btn--outline-secondary',
                        value: 'cancel'
                    });
                }
                if (showBtn !== false) {
                    buttons.push({
                        text: confirmButtonText,
                        class: 'btn--primary',
                        value: 'confirm'
                    });
                }

                MH.show({
                    title: stripHtml(title),
                    html: html || `<p>${text}</p>`,
                    size: 'md',
                    extraClass: html ? 'modal-form' : '',
                    showFooter: buttons.length > 0,
                    footerButtons: buttons,
                    onClose: (result) => {
                        resolve({
                            isConfirmed: result === 'confirm' || result === 1,
                            isDismissed: result !== 'confirm' && result !== 1,
                            value: result === 'confirm' || result === 1 ? true : undefined
                        });
                    }
                });
            });
        }

        // Fallback
        showToast(text || title, icon || 'info');
        return { isConfirmed: true, isDismissed: false, value: true };
    }

    // Swal.showValidationMessage compatibility
    function showValidationMessage(message) {
        const container = currentValidationContainer || document.getElementById('swalShimValidation');
        if (container) {
            container.textContent = message;
            container.style.display = 'block';
        }
    }

    // Strip HTML tags from title
    function stripHtml(html) {
        if (!html) return '';
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    // Swal.close compatibility
    function swalClose() {
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
    }

    // Register global Swal object
    window.Swal = {
        fire: swalFire,
        close: swalClose,
        showValidationMessage: showValidationMessage,
        isVisible: () => !!document.querySelector('.modal.active'),
        getHtmlContainer: () => document.querySelector('.modal.active .modal-body'),
        getPopup: () => document.querySelector('.modal.active'),
        getTitle: () => document.querySelector('.modal.active .modal-header h3'),
        mixin: function(options) {
            return {
                fire: (overrides) => swalFire({ ...options, ...overrides })
            };
        }
    };

})();
