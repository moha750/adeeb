/**
 * نظام رفع الصور - Supabase Storage
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
            if (!allowedTypes.includes(file.type)) {
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
            const fileExt = file.name.split('.').pop();
            const fileName = `${folder}/${timestamp}-${randomString}.${fileExt}`;

            // رفع الملف
            const { data, error } = await sb.storage
                .from(BUCKET_NAME)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
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
            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">
                    ${options.label || 'صورة'}
                </label>
                
                <!-- معاينة الصورة الحالية -->
                ${currentImageUrl ? `
                    <div style="margin-bottom: 1rem;">
                        <img id="${previewId}_current" 
                             src="${currentImageUrl}" 
                             alt="الصورة الحالية" 
                             style="max-width: 200px; max-height: 200px; border-radius: 8px; object-fit: cover;">
                    </div>
                ` : ''}
                
                <!-- معاينة الصورة الجديدة -->
                <div id="${previewId}" style="margin-bottom: 1rem; display: none;">
                    <img id="${previewId}_img" 
                         src="" 
                         alt="معاينة الصورة" 
                         style="max-width: 200px; max-height: 200px; border-radius: 8px; object-fit: cover;">
                    <button type="button" 
                            onclick="document.getElementById('${inputId}').value=''; document.getElementById('${previewId}').style.display='none';"
                            style="display: block; margin-top: 0.5rem; padding: 0.5rem 1rem; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fa-solid fa-times"></i> إلغاء
                    </button>
                </div>
                
                <!-- حقل رفع الصورة -->
                <input type="file" 
                       id="${inputId}" 
                       accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                       style="width: 100%; padding: 0.75rem; border: 2px dashed #d1d5db; border-radius: 8px; cursor: pointer;"
                       onchange="window.ImageUploadHelper.previewImage('${inputId}', '${previewId}')">
                
                <p style="font-size: 0.875rem; color: #6b7280; margin-top: 0.5rem;">
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

    return {
        uploadImage,
        deleteImage,
        createImageUploadInput,
        previewImage,
        uploadFromInput
    };
})();
