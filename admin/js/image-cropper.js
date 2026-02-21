/**
 * نظام قص الصور - Adeeb Image Cropper
 * يوفر واجهة لقص الصور قبل رفعها
 */

window.ImageCropper = (function() {
    let currentCropData = null;
    let cropCallback = null;
    let cropCanvas = null;
    let cropCtx = null;
    let originalImage = null;
    let cropArea = { x: 0, y: 0, width: 0, height: 0 };
    let isDragging = false;
    let isResizing = false;
    let dragStart = { x: 0, y: 0 };
    let aspectRatio = null; // null = free, 16/9, 4/3, 1/1

    /**
     * فتح نافذة قص الصورة
     */
    function openCropper(file, options = {}) {
        return new Promise((resolve, reject) => {
            const {
                aspectRatio: ar = null,
                minWidth = 200,
                minHeight = 200,
                maxWidth = 1920,
                maxHeight = 1080,
                quality = 0.9
            } = options;

            aspectRatio = ar;
            cropCallback = resolve;

            const reader = new FileReader();
            reader.onload = function(e) {
                showCropperModal(e.target.result, { minWidth, minHeight, maxWidth, maxHeight, quality });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * عرض نافذة القص
     */
    function showCropperModal(imageSrc, options) {
        // إزالة أي modal سابق
        const existingModal = document.getElementById('imageCropperModal');
        if (existingModal) existingModal.remove();

        const modalHTML = `
            <div id="imageCropperModal" class="image-cropper-modal">
                <div class="image-cropper-backdrop"></div>
                <div class="image-cropper-container">
                    <div class="image-cropper-header">
                        <h3><i class="fa-solid fa-crop"></i> قص الصورة</h3>
                        <button type="button" class="image-cropper-close" id="cropperCloseBtn">
                            <i class="fa-solid fa-times"></i>
                        </button>
                    </div>
                    <div class="image-cropper-body">
                        <div class="image-cropper-preview-container">
                            <canvas id="cropperCanvas"></canvas>
                            <div id="cropperOverlay" class="cropper-overlay">
                                <div id="cropperSelection" class="cropper-selection">
                                    <div class="cropper-handle nw"></div>
                                    <div class="cropper-handle ne"></div>
                                    <div class="cropper-handle sw"></div>
                                    <div class="cropper-handle se"></div>
                                    <div class="cropper-handle n"></div>
                                    <div class="cropper-handle s"></div>
                                    <div class="cropper-handle e"></div>
                                    <div class="cropper-handle w"></div>
                                </div>
                            </div>
                        </div>
                        <div class="image-cropper-controls">
                            <div class="cropper-aspect-buttons">
                                <button type="button" class="cropper-aspect-btn ${!aspectRatio ? 'active' : ''}" data-ratio="free">حر</button>
                                <button type="button" class="cropper-aspect-btn ${aspectRatio === 16/9 ? 'active' : ''}" data-ratio="16:9">16:9</button>
                                <button type="button" class="cropper-aspect-btn ${aspectRatio === 4/3 ? 'active' : ''}" data-ratio="4:3">4:3</button>
                                <button type="button" class="cropper-aspect-btn ${aspectRatio === 1 ? 'active' : ''}" data-ratio="1:1">1:1</button>
                            </div>
                            <div class="cropper-preview-box">
                                <span>معاينة:</span>
                                <canvas id="cropperPreviewCanvas" width="120" height="80"></canvas>
                            </div>
                        </div>
                    </div>
                    <div class="image-cropper-footer">
                        <button type="button" class="btn btn--outline btn--outline-secondary" id="cropperCancelBtn">
                            <i class="fa-solid fa-times"></i> إلغاء
                        </button>
                        <button type="button" class="btn btn--primary" id="cropperApplyBtn">
                            <i class="fa-solid fa-check"></i> تطبيق القص
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.body.classList.add('modal-open');

        // تحميل الصورة
        originalImage = new Image();
        originalImage.onload = function() {
            initCropper(options);
        };
        originalImage.src = imageSrc;

        // إضافة المستمعات
        setupCropperEvents(options);
    }

    /**
     * تهيئة القص
     */
    function initCropper(options) {
        cropCanvas = document.getElementById('cropperCanvas');
        cropCtx = cropCanvas.getContext('2d');

        const container = cropCanvas.parentElement;
        const maxContainerWidth = container.clientWidth - 40;
        const maxContainerHeight = 400;

        // حساب الأبعاد المناسبة
        let displayWidth = originalImage.width;
        let displayHeight = originalImage.height;

        if (displayWidth > maxContainerWidth) {
            const ratio = maxContainerWidth / displayWidth;
            displayWidth = maxContainerWidth;
            displayHeight *= ratio;
        }

        if (displayHeight > maxContainerHeight) {
            const ratio = maxContainerHeight / displayHeight;
            displayHeight = maxContainerHeight;
            displayWidth *= ratio;
        }

        cropCanvas.width = displayWidth;
        cropCanvas.height = displayHeight;
        cropCanvas.style.width = displayWidth + 'px';
        cropCanvas.style.height = displayHeight + 'px';

        // رسم الصورة
        cropCtx.drawImage(originalImage, 0, 0, displayWidth, displayHeight);

        // تهيئة منطقة القص الافتراضية
        const initialSize = Math.min(displayWidth, displayHeight) * 0.8;
        cropArea = {
            x: (displayWidth - initialSize) / 2,
            y: (displayHeight - initialSize) / 2,
            width: initialSize,
            height: aspectRatio ? initialSize / aspectRatio : initialSize
        };

        updateCropSelection();
        updatePreview();
    }

    /**
     * تحديث منطقة القص المرئية
     */
    function updateCropSelection() {
        const selection = document.getElementById('cropperSelection');
        const overlay = document.getElementById('cropperOverlay');
        
        if (!selection || !overlay) return;

        overlay.style.width = cropCanvas.width + 'px';
        overlay.style.height = cropCanvas.height + 'px';

        selection.style.left = cropArea.x + 'px';
        selection.style.top = cropArea.y + 'px';
        selection.style.width = cropArea.width + 'px';
        selection.style.height = cropArea.height + 'px';
    }

    /**
     * تحديث المعاينة
     */
    function updatePreview() {
        const previewCanvas = document.getElementById('cropperPreviewCanvas');
        if (!previewCanvas) return;

        const previewCtx = previewCanvas.getContext('2d');
        const scaleX = originalImage.width / cropCanvas.width;
        const scaleY = originalImage.height / cropCanvas.height;

        const sourceX = cropArea.x * scaleX;
        const sourceY = cropArea.y * scaleY;
        const sourceWidth = cropArea.width * scaleX;
        const sourceHeight = cropArea.height * scaleY;

        // حساب أبعاد المعاينة
        const previewRatio = sourceWidth / sourceHeight;
        let previewWidth = 120;
        let previewHeight = 80;

        if (previewRatio > 1.5) {
            previewHeight = previewWidth / previewRatio;
        } else {
            previewWidth = previewHeight * previewRatio;
        }

        previewCanvas.width = previewWidth;
        previewCanvas.height = previewHeight;

        previewCtx.clearRect(0, 0, previewWidth, previewHeight);
        previewCtx.drawImage(
            originalImage,
            sourceX, sourceY, sourceWidth, sourceHeight,
            0, 0, previewWidth, previewHeight
        );
    }

    /**
     * إعداد مستمعات الأحداث
     */
    function setupCropperEvents(options) {
        const modal = document.getElementById('imageCropperModal');
        const selection = document.getElementById('cropperSelection');
        const overlay = document.getElementById('cropperOverlay');

        // إغلاق
        document.getElementById('cropperCloseBtn').onclick = closeCropper;
        document.getElementById('cropperCancelBtn').onclick = closeCropper;
        modal.querySelector('.image-cropper-backdrop').onclick = closeCropper;

        // تطبيق القص
        document.getElementById('cropperApplyBtn').onclick = () => applyCrop(options);

        // أزرار نسبة العرض
        modal.querySelectorAll('.cropper-aspect-btn').forEach(btn => {
            btn.onclick = function() {
                modal.querySelectorAll('.cropper-aspect-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                const ratio = this.dataset.ratio;
                if (ratio === 'free') {
                    aspectRatio = null;
                } else if (ratio === '16:9') {
                    aspectRatio = 16 / 9;
                } else if (ratio === '4:3') {
                    aspectRatio = 4 / 3;
                } else if (ratio === '1:1') {
                    aspectRatio = 1;
                }

                if (aspectRatio) {
                    cropArea.height = cropArea.width / aspectRatio;
                    if (cropArea.y + cropArea.height > cropCanvas.height) {
                        cropArea.height = cropCanvas.height - cropArea.y;
                        cropArea.width = cropArea.height * aspectRatio;
                    }
                }

                updateCropSelection();
                updatePreview();
            };
        });

        // سحب منطقة القص
        selection.onmousedown = function(e) {
            if (e.target.classList.contains('cropper-handle')) {
                isResizing = e.target.className.replace('cropper-handle ', '');
            } else {
                isDragging = true;
            }
            dragStart = { x: e.clientX, y: e.clientY };
            e.preventDefault();
        };

        document.onmousemove = function(e) {
            if (!isDragging && !isResizing) return;

            const dx = e.clientX - dragStart.x;
            const dy = e.clientY - dragStart.y;
            dragStart = { x: e.clientX, y: e.clientY };

            if (isDragging) {
                cropArea.x = Math.max(0, Math.min(cropCanvas.width - cropArea.width, cropArea.x + dx));
                cropArea.y = Math.max(0, Math.min(cropCanvas.height - cropArea.height, cropArea.y + dy));
            } else if (isResizing) {
                handleResize(isResizing, dx, dy);
            }

            updateCropSelection();
            updatePreview();
        };

        document.onmouseup = function() {
            isDragging = false;
            isResizing = false;
        };

        // دعم اللمس
        selection.ontouchstart = function(e) {
            const touch = e.touches[0];
            if (e.target.classList.contains('cropper-handle')) {
                isResizing = e.target.className.replace('cropper-handle ', '');
            } else {
                isDragging = true;
            }
            dragStart = { x: touch.clientX, y: touch.clientY };
            e.preventDefault();
        };

        document.ontouchmove = function(e) {
            if (!isDragging && !isResizing) return;
            const touch = e.touches[0];

            const dx = touch.clientX - dragStart.x;
            const dy = touch.clientY - dragStart.y;
            dragStart = { x: touch.clientX, y: touch.clientY };

            if (isDragging) {
                cropArea.x = Math.max(0, Math.min(cropCanvas.width - cropArea.width, cropArea.x + dx));
                cropArea.y = Math.max(0, Math.min(cropCanvas.height - cropArea.height, cropArea.y + dy));
            } else if (isResizing) {
                handleResize(isResizing, dx, dy);
            }

            updateCropSelection();
            updatePreview();
        };

        document.ontouchend = function() {
            isDragging = false;
            isResizing = false;
        };
    }

    /**
     * معالجة تغيير الحجم
     */
    function handleResize(handle, dx, dy) {
        const minSize = 50;

        switch (handle) {
            case 'se':
                cropArea.width = Math.max(minSize, Math.min(cropCanvas.width - cropArea.x, cropArea.width + dx));
                if (aspectRatio) {
                    cropArea.height = cropArea.width / aspectRatio;
                } else {
                    cropArea.height = Math.max(minSize, Math.min(cropCanvas.height - cropArea.y, cropArea.height + dy));
                }
                break;
            case 'sw':
                const newWidthSW = Math.max(minSize, cropArea.width - dx);
                if (cropArea.x + cropArea.width - newWidthSW >= 0) {
                    cropArea.x = cropArea.x + cropArea.width - newWidthSW;
                    cropArea.width = newWidthSW;
                }
                if (aspectRatio) {
                    cropArea.height = cropArea.width / aspectRatio;
                } else {
                    cropArea.height = Math.max(minSize, Math.min(cropCanvas.height - cropArea.y, cropArea.height + dy));
                }
                break;
            case 'ne':
                cropArea.width = Math.max(minSize, Math.min(cropCanvas.width - cropArea.x, cropArea.width + dx));
                if (aspectRatio) {
                    const newHeight = cropArea.width / aspectRatio;
                    cropArea.y = cropArea.y + cropArea.height - newHeight;
                    cropArea.height = newHeight;
                } else {
                    const newHeightNE = Math.max(minSize, cropArea.height - dy);
                    if (cropArea.y + cropArea.height - newHeightNE >= 0) {
                        cropArea.y = cropArea.y + cropArea.height - newHeightNE;
                        cropArea.height = newHeightNE;
                    }
                }
                break;
            case 'nw':
                const newWidthNW = Math.max(minSize, cropArea.width - dx);
                if (cropArea.x + cropArea.width - newWidthNW >= 0) {
                    cropArea.x = cropArea.x + cropArea.width - newWidthNW;
                    cropArea.width = newWidthNW;
                }
                if (aspectRatio) {
                    const newHeight = cropArea.width / aspectRatio;
                    cropArea.y = cropArea.y + cropArea.height - newHeight;
                    cropArea.height = newHeight;
                } else {
                    const newHeightNW = Math.max(minSize, cropArea.height - dy);
                    if (cropArea.y + cropArea.height - newHeightNW >= 0) {
                        cropArea.y = cropArea.y + cropArea.height - newHeightNW;
                        cropArea.height = newHeightNW;
                    }
                }
                break;
            case 'n':
                if (!aspectRatio) {
                    const newHeightN = Math.max(minSize, cropArea.height - dy);
                    if (cropArea.y + cropArea.height - newHeightN >= 0) {
                        cropArea.y = cropArea.y + cropArea.height - newHeightN;
                        cropArea.height = newHeightN;
                    }
                }
                break;
            case 's':
                if (!aspectRatio) {
                    cropArea.height = Math.max(minSize, Math.min(cropCanvas.height - cropArea.y, cropArea.height + dy));
                }
                break;
            case 'e':
                cropArea.width = Math.max(minSize, Math.min(cropCanvas.width - cropArea.x, cropArea.width + dx));
                if (aspectRatio) {
                    cropArea.height = cropArea.width / aspectRatio;
                }
                break;
            case 'w':
                const newWidthW = Math.max(minSize, cropArea.width - dx);
                if (cropArea.x + cropArea.width - newWidthW >= 0) {
                    cropArea.x = cropArea.x + cropArea.width - newWidthW;
                    cropArea.width = newWidthW;
                }
                if (aspectRatio) {
                    cropArea.height = cropArea.width / aspectRatio;
                }
                break;
        }

        // التأكد من عدم تجاوز الحدود
        if (cropArea.y + cropArea.height > cropCanvas.height) {
            cropArea.height = cropCanvas.height - cropArea.y;
            if (aspectRatio) {
                cropArea.width = cropArea.height * aspectRatio;
            }
        }
    }

    /**
     * تطبيق القص
     */
    function applyCrop(options) {
        const scaleX = originalImage.width / cropCanvas.width;
        const scaleY = originalImage.height / cropCanvas.height;

        const sourceX = cropArea.x * scaleX;
        const sourceY = cropArea.y * scaleY;
        const sourceWidth = cropArea.width * scaleX;
        const sourceHeight = cropArea.height * scaleY;

        // إنشاء canvas للصورة المقصوصة
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = Math.min(sourceWidth, options.maxWidth || 1920);
        outputCanvas.height = Math.min(sourceHeight, options.maxHeight || 1080);

        // الحفاظ على النسبة
        const outputRatio = sourceWidth / sourceHeight;
        if (outputCanvas.width / outputCanvas.height !== outputRatio) {
            if (outputCanvas.width / outputRatio > outputCanvas.height) {
                outputCanvas.width = outputCanvas.height * outputRatio;
            } else {
                outputCanvas.height = outputCanvas.width / outputRatio;
            }
        }

        const outputCtx = outputCanvas.getContext('2d');
        outputCtx.drawImage(
            originalImage,
            sourceX, sourceY, sourceWidth, sourceHeight,
            0, 0, outputCanvas.width, outputCanvas.height
        );

        // تحويل إلى Blob
        outputCanvas.toBlob(function(blob) {
            closeCropper();
            if (cropCallback) {
                cropCallback(blob);
            }
        }, 'image/jpeg', options.quality || 0.9);
    }

    /**
     * إغلاق نافذة القص
     */
    function closeCropper() {
        const modal = document.getElementById('imageCropperModal');
        if (modal) {
            modal.remove();
        }
        document.body.classList.remove('modal-open');
        
        // تنظيف المستمعات
        document.onmousemove = null;
        document.onmouseup = null;
        document.ontouchmove = null;
        document.ontouchend = null;
    }

    return {
        openCropper,
        closeCropper
    };
})();
