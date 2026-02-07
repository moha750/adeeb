/**
 * نظام رفع الصور المحسن - Supabase Storage
 * يدعم قص الصور ومعرض الصور
 */

window.ImageUploadHelper = (function() {
    const sb = window.sbClient;
    const BUCKET_NAME = 'images';

    /**
     * رفع صورة إلى Supabase Storage
     */
    async function uploadImage(file, folder = 'general') {
        try {
            if (!file) {
                throw new Error('لم يتم اختيار ملف');
            }

            // التحقق من نوع الملف
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
            
            // إذا كان Blob من cropper، نتحقق بطريقة مختلفة
            const fileType = file.type || 'image/jpeg';
            if (!allowedTypes.includes(fileType)) {
                throw new Error('نوع الملف غير مدعوم. يرجى اختيار صورة (JPG, PNG, WEBP, GIF)');
            }

            // التحقق من حجم الملف (5MB)
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                throw new Error('حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت');
            }

            // إنشاء اسم فريد للملف
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(2, 8);
            const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
            const fileName = `${folder}/${timestamp}-${randomString}.${fileExt}`;

            // رفع الملف
            const { data, error } = await sb.storage
                .from(BUCKET_NAME)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: fileType
                });

            if (error) throw error;

            // الحصول على الرابط العام
            const { data: urlData } = sb.storage
                .from(BUCKET_NAME)
                .getPublicUrl(fileName);

            return {
                success: true,
                url: urlData.publicUrl,
                path: fileName
            };

        } catch (error) {
            console.error('Error uploading image:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * رفع صورة مع قص
     */
    async function uploadImageWithCrop(file, folder = 'general', cropOptions = {}) {
        try {
            if (!file) {
                throw new Error('لم يتم اختيار ملف');
            }

            // فتح نافذة القص إذا كان ImageCropper متاحاً
            let fileToUpload = file;
            if (window.ImageCropper) {
                const croppedBlob = await window.ImageCropper.openCropper(file, cropOptions);
                if (croppedBlob) {
                    fileToUpload = croppedBlob;
                }
            }

            // رفع الصورة
            return await uploadImage(fileToUpload, folder);

        } catch (error) {
            console.error('Error uploading image with crop:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * حذف صورة من Supabase Storage
     */
    async function deleteImage(imagePath) {
        try {
            if (!imagePath) return { success: true };

            // استخراج المسار من الرابط الكامل إذا لزم الأمر
            let path = imagePath;
            if (imagePath.includes('/storage/v1/object/public/')) {
                path = imagePath.split('/storage/v1/object/public/' + BUCKET_NAME + '/')[1];
            }

            const { error } = await sb.storage
                .from(BUCKET_NAME)
                .remove([path]);

            if (error) throw error;

            return { success: true };

        } catch (error) {
            console.error('Error deleting image:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * إنشاء عنصر input لرفع الصورة مع معاينة
     */
    function createImageUploadInput(options = {}) {
        const {
            currentImageUrl = null,
            inputId = 'imageUpload',
            previewId = 'imagePreview',
            folder = 'general'
        } = options;

        return `
            <div class="form-group">
                <label class="form-label">
                    ${options.label || 'صورة'}
                </label>
                
                <!-- معاينة الصورة الحالية -->
                ${currentImageUrl ? `
                    <div class="image-preview-container">
                        <img id="${previewId}_current" 
                             src="${currentImageUrl}" 
                             alt="الصورة الحالية" 
                             class="image-preview">
                    </div>
                ` : ''}
                
                <!-- معاينة الصورة الجديدة -->
                <div id="${previewId}" class="image-preview-container image-preview-container--hidden">
                    <img id="${previewId}_img" 
                         src="" 
                         alt="معاينة الصورة" 
                         class="image-preview">
                    <button type="button" 
                            onclick="document.getElementById('${inputId}').value=''; document.getElementById('${previewId}').style.display='none';"
                            class="btn btn--danger btn--sm">
                        <i class="fa-solid fa-times"></i> إلغاء
                    </button>
                </div>
                
                <!-- حقل رفع الصورة -->
                <input type="file" 
                       id="${inputId}" 
                       accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                       class="file-input"
                       onchange="window.ImageUploadHelper.previewImage('${inputId}', '${previewId}')">
                
                <p class="form-hint">
                    <i class="fa-solid fa-info-circle"></i> 
                    الصيغ المدعومة: JPG, PNG, WEBP, GIF (الحد الأقصى: 5 ميجابايت)
                </p>
                
                <!-- حقل مخفي للرابط -->
                <input type="hidden" id="${inputId}_url" value="${currentImageUrl || ''}">
                <input type="hidden" id="${inputId}_path" value="">
            </div>
        `;
    }

    /**
     * معاينة الصورة قبل الرفع
     */
    function previewImage(inputId, previewId) {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        const previewImg = document.getElementById(previewId + '_img');
        const currentPreview = document.getElementById(previewId + '_current');

        if (input.files && input.files[0]) {
            const reader = new FileReader();

            reader.onload = function(e) {
                previewImg.src = e.target.result;
                preview.style.display = 'block';
                if (currentPreview) {
                    currentPreview.style.display = 'none';
                }
            };

            reader.readAsDataURL(input.files[0]);
        }
    }

    /**
     * رفع الصورة من input وإرجاع الرابط
     */
    async function uploadFromInput(inputId, folder = 'general') {
        const input = document.getElementById(inputId);
        const urlInput = document.getElementById(inputId + '_url');
        const pathInput = document.getElementById(inputId + '_path');

        // إذا لم يتم اختيار صورة جديدة، إرجاع الرابط الحالي
        if (!input.files || !input.files[0]) {
            return urlInput ? urlInput.value : null;
        }

        // رفع الصورة الجديدة
        const result = await uploadImage(input.files[0], folder);

        if (result.success) {
            if (urlInput) urlInput.value = result.url;
            if (pathInput) pathInput.value = result.path;
            return result.url;
        } else {
            throw new Error(result.error);
        }
    }

    /**
     * رفع صورة من input مع قص
     */
    async function uploadFromInputWithCrop(inputId, folder = 'general', cropOptions = {}) {
        const input = document.getElementById(inputId);
        const urlInput = document.getElementById(inputId + '_url');
        const pathInput = document.getElementById(inputId + '_path');

        // إذا لم يتم اختيار صورة جديدة، إرجاع الرابط الحالي
        if (!input.files || !input.files[0]) {
            return urlInput ? urlInput.value : null;
        }

        // رفع الصورة مع القص
        const result = await uploadImageWithCrop(input.files[0], folder, cropOptions);

        if (result.success) {
            if (urlInput) urlInput.value = result.url;
            if (pathInput) pathInput.value = result.path;
            return result.url;
        } else {
            throw new Error(result.error);
        }
    }

    /**
     * إنشاء معرض صور للأخبار (2-4 صور إجبارية)
     */
    function createNewsGalleryUploader(options = {}) {
        const {
            containerId = 'newsGalleryContainer',
            minImages = 2,
            maxImages = 4,
            currentImages = [],
            currentPhotographers = [],
            folder = 'news/gallery',
            required = true
        } = options;

        const galleryId = containerId + '_gallery';
        
        return `
            <div class="news-gallery-uploader ${currentImages.length > 0 ? 'has-images' : ''}" id="${galleryId}" data-max-images="${maxImages}">
                <div class="gallery-header">
                    <h4><i class="fa-solid fa-images"></i> معرض صور الخبر ${required ? '<span class="required">*</span>' : ''}</h4>
                    <span class="gallery-counter ${currentImages.length >= minImages ? 'valid' : 'invalid'}" id="${galleryId}_counter">
                        ${currentImages.length} / ${maxImages}
                    </span>
                </div>
                
                <div class="gallery-images-grid" id="${galleryId}_grid">
                    ${currentImages.map((img, index) => `
                        <div class="gallery-image-item" data-index="${index}">
                            <img src="${img}" alt="صورة ${index + 1}">
                            <div class="gallery-image-photographer">
                                <input type="text" 
                                       class="form-input gallery-photographer-input" 
                                       placeholder="اسم المصور"
                                       value="${currentPhotographers[index] || ''}"
                                       data-index="${index}"
                                       onchange="window.ImageUploadHelper.updateGalleryPhotographer('${galleryId}', ${index}, this.value)">
                            </div>
                            <button type="button" class="remove-btn" onclick="window.ImageUploadHelper.removeGalleryImage('${galleryId}', ${index})">
                                <i class="fa-solid fa-times"></i>
                            </button>
                        </div>
                    `).join('')}
                    
                    ${currentImages.length < maxImages ? `
                        <div class="gallery-add-btn" onclick="document.getElementById('${galleryId}_input').click()">
                            <i class="fa-solid fa-plus"></i>
                            <span>إضافة صورة</span>
                        </div>
                    ` : ''}
                </div>
                
                <input type="file" 
                       id="${galleryId}_input" 
                       accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                       class="hidden-input"
                       onchange="window.ImageUploadHelper.handleGalleryImageSelect('${galleryId}', '${folder}', ${maxImages})">
                
                <input type="hidden" id="${galleryId}_urls" value='${JSON.stringify(currentImages)}'>
                <input type="hidden" id="${galleryId}_photographers" value='${JSON.stringify(currentPhotographers)}'>
                
                <div class="gallery-hint ${currentImages.length < minImages && required ? 'error' : ''}" id="${galleryId}_hint">
                    <i class="fa-solid fa-info-circle"></i>
                    ${required ? `يجب إضافة ${minImages} صور على الأقل (الحد الأقصى: ${maxImages} صور) مع اسم المصور لكل صورة` : `يمكنك إضافة حتى ${maxImages} صور`}
                </div>
            </div>
        `;
    }

    /**
     * معالجة اختيار صورة للمعرض
     */
    async function handleGalleryImageSelect(galleryId, folder, maxImages) {
        const input = document.getElementById(galleryId + '_input');
        const urlsInput = document.getElementById(galleryId + '_urls');
        
        if (!input.files || !input.files[0]) return;

        const file = input.files[0];
        let currentUrls = [];
        
        try {
            currentUrls = JSON.parse(urlsInput.value || '[]');
        } catch (e) {
            currentUrls = [];
        }

        if (currentUrls.length >= maxImages) {
            if (window.Toast) {
                Toast.warning(`الحد الأقصى ${maxImages} صور`);
            } else {
                alert(`الحد الأقصى ${maxImages} صور`);
            }
            input.value = '';
            return;
        }

        // عرض مؤشر التحميل
        const grid = document.getElementById(galleryId + '_grid');
        const addBtn = grid.querySelector('.gallery-add-btn');
        if (addBtn) {
            addBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>جاري الرفع...</span>';
            addBtn.classList.add('disabled');
        }

        try {
            // رفع الصورة مع القص
            let result;
            if (window.ImageCropper) {
                const croppedBlob = await window.ImageCropper.openCropper(file, { aspectRatio: 16/9 });
                if (croppedBlob) {
                    result = await uploadImage(croppedBlob, folder);
                } else {
                    // المستخدم ألغى القص
                    input.value = '';
                    updateGalleryUI(galleryId, currentUrls, maxImages);
                    return;
                }
            } else {
                result = await uploadImage(file, folder);
            }

            if (result.success) {
                currentUrls.push(result.url);
                urlsInput.value = JSON.stringify(currentUrls);
                
                // إضافة مصور فارغ للصورة الجديدة
                const photographersInput = document.getElementById(galleryId + '_photographers');
                let currentPhotographers = [];
                try {
                    currentPhotographers = JSON.parse(photographersInput?.value || '[]');
                } catch (e) {
                    currentPhotographers = [];
                }
                currentPhotographers.push('');
                if (photographersInput) {
                    photographersInput.value = JSON.stringify(currentPhotographers);
                }
                
                updateGalleryUI(galleryId, currentUrls, maxImages, currentPhotographers);
                
                if (window.Toast) {
                    Toast.success('تم رفع الصورة بنجاح');
                }
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error uploading gallery image:', error);
            if (window.Toast) {
                Toast.error('حدث خطأ: ' + error.message);
            } else {
                alert('حدث خطأ: ' + error.message);
            }
        }

        input.value = '';
    }

    /**
     * إزالة صورة من المعرض
     */
    function removeGalleryImage(galleryId, index) {
        const urlsInput = document.getElementById(galleryId + '_urls');
        const photographersInput = document.getElementById(galleryId + '_photographers');
        let currentUrls = [];
        let currentPhotographers = [];
        
        try {
            currentUrls = JSON.parse(urlsInput.value || '[]');
        } catch (e) {
            currentUrls = [];
        }
        
        try {
            currentPhotographers = JSON.parse(photographersInput?.value || '[]');
        } catch (e) {
            currentPhotographers = [];
        }

        if (index >= 0 && index < currentUrls.length) {
            currentUrls.splice(index, 1);
            currentPhotographers.splice(index, 1);
            urlsInput.value = JSON.stringify(currentUrls);
            if (photographersInput) {
                photographersInput.value = JSON.stringify(currentPhotographers);
            }
            
            // الحصول على maxImages من الـ container
            const container = document.getElementById(galleryId);
            const maxImages = parseInt(container?.dataset?.maxImages) || 4;
            
            updateGalleryUI(galleryId, currentUrls, maxImages, currentPhotographers);
        }
    }

    /**
     * تحديث واجهة المعرض
     */
    function updateGalleryPhotographer(galleryId, index, value) {
        const photographersInput = document.getElementById(galleryId + '_photographers');
        let currentPhotographers = [];
        
        try {
            currentPhotographers = JSON.parse(photographersInput?.value || '[]');
        } catch (e) {
            currentPhotographers = [];
        }
        
        currentPhotographers[index] = value;
        if (photographersInput) {
            photographersInput.value = JSON.stringify(currentPhotographers);
        }
    }

    function updateGalleryUI(galleryId, urls, maxImages, photographers = []) {
        const grid = document.getElementById(galleryId + '_grid');
        const counter = document.getElementById(galleryId + '_counter');
        const hint = document.getElementById(galleryId + '_hint');
        const container = document.getElementById(galleryId);
        const minImages = 2;

        if (!grid) return;

        // تحديث الشبكة مع حقول أسماء المصورين
        grid.innerHTML = urls.map((img, index) => `
            <div class="gallery-image-item" data-index="${index}">
                <img src="${img}" alt="صورة ${index + 1}">
                <div class="gallery-image-photographer">
                    <input type="text" 
                           class="form-input gallery-photographer-input" 
                           placeholder="اسم المصور"
                           value="${photographers[index] || ''}"
                           data-index="${index}"
                           onchange="window.ImageUploadHelper.updateGalleryPhotographer('${galleryId}', ${index}, this.value)">
                </div>
                <button type="button" class="remove-btn" onclick="window.ImageUploadHelper.removeGalleryImage('${galleryId}', ${index})">
                    <i class="fa-solid fa-times"></i>
                </button>
            </div>
        `).join('') + (urls.length < maxImages ? `
            <div class="gallery-add-btn" onclick="document.getElementById('${galleryId}_input').click()">
                <i class="fa-solid fa-plus"></i>
                <span>إضافة صورة</span>
            </div>
        ` : '');

        // تحديث العداد
        if (counter) {
            counter.textContent = `${urls.length} / ${maxImages}`;
            counter.className = `gallery-counter ${urls.length >= minImages ? 'valid' : 'invalid'}`;
        }

        // تحديث التلميح
        if (hint) {
            hint.className = `gallery-hint ${urls.length < minImages ? 'error' : ''}`;
        }

        // تحديث الحاوية
        if (container) {
            container.classList.toggle('has-images', urls.length > 0);
            container.dataset.maxImages = maxImages;
        }
    }

    /**
     * الحصول على روابط صور المعرض
     */
    function getGalleryUrls(galleryId) {
        const urlsInput = document.getElementById(galleryId + '_gallery_urls');
        try {
            return JSON.parse(urlsInput?.value || '[]');
        } catch (e) {
            return [];
        }
    }

    /**
     * الحصول على أسماء مصوري المعرض
     */
    function getGalleryPhotographers(galleryId) {
        const photographersInput = document.getElementById(galleryId + '_gallery_photographers');
        try {
            return JSON.parse(photographersInput?.value || '[]');
        } catch (e) {
            return [];
        }
    }

    /**
     * التحقق من صحة المعرض
     */
    function validateGallery(galleryId, minImages = 2) {
        const urls = getGalleryUrls(galleryId);
        return urls.length >= minImages;
    }

    /**
     * إنشاء رافع صورة الغلاف المحسن مع القص
     */
    function createCoverImageUploader(options = {}) {
        const {
            inputId = 'coverImageUpload',
            currentImageUrl = null,
            folder = 'news',
            required = true,
            aspectRatio = 16/9
        } = options;

        return `
            <div class="cover-image-uploader ${currentImageUrl ? 'has-image' : ''}" id="${inputId}_container">
                ${currentImageUrl ? `
                    <div class="cover-image-preview" id="${inputId}_preview">
                        <img src="${currentImageUrl}" alt="صورة الغلاف" id="${inputId}_img">
                        <button type="button" class="change-btn" onclick="document.getElementById('${inputId}').click()">
                            <i class="fa-solid fa-camera"></i> تغيير الصورة
                        </button>
                    </div>
                ` : `
                    <div class="cover-upload-area" id="${inputId}_area" onclick="document.getElementById('${inputId}').click()">
                        <i class="fa-solid fa-cloud-upload-alt"></i>
                        <p>اضغط لرفع صورة الغلاف ${required ? '<span class="required">*</span>' : ''}</p>
                        <span>JPG, PNG, WEBP (الحد الأقصى: 5MB)</span>
                    </div>
                `}
                
                <input type="file" 
                       id="${inputId}" 
                       accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                       class="hidden-input"
                       data-folder="${folder}"
                       data-aspect-ratio="${aspectRatio}"
                       onchange="window.ImageUploadHelper.handleCoverImageSelect('${inputId}')">
                
                <input type="hidden" id="${inputId}_url" value="${currentImageUrl || ''}">
            </div>
        `;
    }

    /**
     * معالجة اختيار صورة الغلاف
     */
    async function handleCoverImageSelect(inputId) {
        const input = document.getElementById(inputId);
        const urlInput = document.getElementById(inputId + '_url');
        const container = document.getElementById(inputId + '_container');
        
        if (!input.files || !input.files[0]) return;

        const file = input.files[0];
        const folder = input.dataset.folder || 'news';
        const aspectRatio = parseFloat(input.dataset.aspectRatio) || 16/9;

        // عرض مؤشر التحميل
        container.innerHTML = `
            <div class="loading-spinner">
                <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
                <p>جاري معالجة الصورة...</p>
            </div>
            <input type="file" id="${inputId}" class="hidden-input">
            <input type="hidden" id="${inputId}_url" value="${urlInput?.value || ''}">
        `;

        try {
            let result;
            if (window.ImageCropper) {
                const croppedBlob = await window.ImageCropper.openCropper(file, { aspectRatio });
                if (croppedBlob) {
                    result = await uploadImage(croppedBlob, folder);
                } else {
                    // المستخدم ألغى القص - إعادة الواجهة
                    restoreCoverUI(inputId, urlInput?.value, folder, aspectRatio);
                    return;
                }
            } else {
                result = await uploadImage(file, folder);
            }

            if (result.success) {
                // تحديث الواجهة بالصورة الجديدة
                container.innerHTML = `
                    <div class="cover-image-preview" id="${inputId}_preview">
                        <img src="${result.url}" alt="صورة الغلاف" id="${inputId}_img">
                        <button type="button" class="change-btn" onclick="document.getElementById('${inputId}').click()">
                            <i class="fa-solid fa-camera"></i> تغيير الصورة
                        </button>
                    </div>
                    <input type="file" 
                           id="${inputId}" 
                           accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                           class="hidden-input"
                           data-folder="${folder}"
                           data-aspect-ratio="${aspectRatio}"
                           onchange="window.ImageUploadHelper.handleCoverImageSelect('${inputId}')">
                    <input type="hidden" id="${inputId}_url" value="${result.url}">
                `;
                container.classList.add('has-image');

                if (window.Toast) {
                    Toast.success('تم رفع صورة الغلاف بنجاح');
                }
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error uploading cover image:', error);
            restoreCoverUI(inputId, urlInput?.value, folder, aspectRatio);
            
            if (window.Toast) {
                Toast.error('حدث خطأ: ' + error.message);
            }
        }
    }

    /**
     * استعادة واجهة صورة الغلاف
     */
    function restoreCoverUI(inputId, currentUrl, folder, aspectRatio) {
        const container = document.getElementById(inputId + '_container');
        if (!container) return;

        if (currentUrl) {
            container.innerHTML = `
                <div class="cover-image-preview" id="${inputId}_preview">
                    <img src="${currentUrl}" alt="صورة الغلاف" id="${inputId}_img">
                    <button type="button" class="change-btn" onclick="document.getElementById('${inputId}').click()">
                        <i class="fa-solid fa-camera"></i> تغيير الصورة
                    </button>
                </div>
                <input type="file" 
                       id="${inputId}" 
                       accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                       class="hidden-input"
                       data-folder="${folder}"
                       data-aspect-ratio="${aspectRatio}"
                       onchange="window.ImageUploadHelper.handleCoverImageSelect('${inputId}')">
                <input type="hidden" id="${inputId}_url" value="${currentUrl}">
            `;
        } else {
            container.innerHTML = `
                <div class="cover-upload-area" id="${inputId}_area" onclick="document.getElementById('${inputId}').click()">
                    <i class="fa-solid fa-cloud-upload-alt"></i>
                    <p>اضغط لرفع صورة الغلاف <span class="required">*</span></p>
                    <span>JPG, PNG, WEBP (الحد الأقصى: 5MB)</span>
                </div>
                <input type="file" 
                       id="${inputId}" 
                       accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                       class="hidden-input"
                       data-folder="${folder}"
                       data-aspect-ratio="${aspectRatio}"
                       onchange="window.ImageUploadHelper.handleCoverImageSelect('${inputId}')">
                <input type="hidden" id="${inputId}_url" value="">
            `;
        }
    }

    /**
     * الحصول على رابط صورة الغلاف
     */
    function getCoverImageUrl(inputId) {
        const urlInput = document.getElementById(inputId + '_url');
        return urlInput?.value || null;
    }

    return {
        uploadImage,
        uploadImageWithCrop,
        deleteImage,
        createImageUploadInput,
        previewImage,
        uploadFromInput,
        uploadFromInputWithCrop,
        createNewsGalleryUploader,
        handleGalleryImageSelect,
        removeGalleryImage,
        updateGalleryPhotographer,
        getGalleryUrls,
        getGalleryPhotographers,
        validateGallery,
        createCoverImageUploader,
        handleCoverImageSelect,
        getCoverImageUrl
    };
})();
