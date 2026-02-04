/**
 * نظام إدارة أعمالنا - نادي أدِيب
 */

window.WorksManager = (function() {
    const sb = window.sbClient;
    let currentUser = null;
    let allWorks = [];

    async function init(user) {
        currentUser = user;
        await loadWorks();
        setupEventListeners();
    }

    async function loadWorks() {
        try {
            const { data, error } = await sb
                .from('works')
                .select('*')
                .order('order', { ascending: true });

            if (error) throw error;

            allWorks = data || [];
            renderWorksList();
        } catch (error) {
            console.error('Error loading works:', error);
            showError('حدث خطأ في تحميل الأعمال');
        }
    }

    function renderWorksList() {
        const container = document.getElementById('websiteWorksGrid');
        if (!container) return;

        if (allWorks.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #6b7280;">
                    <i class="fa-solid fa-inbox fa-3x" style="margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p style="font-size: 1.125rem; font-weight: 500;">لا توجد أعمال</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>الصورة</th>
                        <th>العنوان</th>
                        <th>الفئة</th>
                        <th>الترتيب</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    ${allWorks.map(work => `
                        <tr>
                            <td><img src="${work.image_url || 'https://via.placeholder.com/50'}" alt="${work.title}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" onerror="this.src='https://via.placeholder.com/50'"/></td>
                            <td><strong>${work.title}</strong></td>
                            <td>${work.category || '-'}</td>
                            <td>${work.order || 0}</td>
                            <td class="action-buttons">
                                <button class="btn-sm btn-outline" onclick="WorksManager.editWork('${work.id}')">
                                    <i class="fa-solid fa-edit"></i>
                                </button>
                                <button class="btn-sm btn-outline btn-danger" onclick="WorksManager.deleteWork('${work.id}')">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async function addWork() {
        const { value: formValues } = await Swal.fire({
            title: '<i class="fa-solid fa-briefcase"></i> إضافة عمل جديد',
            html: `
                <div style="text-align: right;">
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">عنوان العمل</label>
                        <input type="text" id="workTitle" class="swal2-input" placeholder="عنوان العمل" style="width: 100%; margin: 0;">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">الفئة</label>
                        <input type="text" id="workCategory" class="swal2-input" placeholder="مثال: تصميم، برمجة، كتابة" style="width: 100%; margin: 0;">
                    </div>
                    ${window.ImageUploadHelper ? window.ImageUploadHelper.createImageUploadInput({
                        label: 'صورة العمل',
                        inputId: 'workImageUpload',
                        previewId: 'workImagePreview',
                        folder: 'works'
                    }) : `
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">رابط الصورة</label>
                            <input type="url" id="workImageUrl" class="swal2-input" placeholder="https://example.com/image.jpg" style="width: 100%; margin: 0;">
                        </div>
                    `}
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">رابط العمل</label>
                        <input type="url" id="workLinkUrl" class="swal2-input" placeholder="https://example.com" style="width: 100%; margin: 0;">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">الترتيب</label>
                        <input type="number" id="workOrder" class="swal2-input" value="0" min="0" style="width: 100%; margin: 0;">
                    </div>
                </div>
            `,
            width: '600px',
            showCancelButton: true,
            confirmButtonText: 'إضافة',
            cancelButtonText: 'إلغاء',
            preConfirm: async () => {
                const title = document.getElementById('workTitle').value;
                const category = document.getElementById('workCategory').value;
                const linkUrl = document.getElementById('workLinkUrl').value;
                const order = parseInt(document.getElementById('workOrder').value) || 0;

                if (!title) {
                    Swal.showValidationMessage('يرجى إدخال عنوان العمل');
                    return false;
                }

                let imageUrl = null;
                if (window.ImageUploadHelper) {
                    try {
                        imageUrl = await window.ImageUploadHelper.uploadFromInput('workImageUpload', 'works');
                    } catch (error) {
                        Swal.showValidationMessage('حدث خطأ أثناء رفع الصورة: ' + error.message);
                        return false;
                    }
                } else {
                    imageUrl = document.getElementById('workImageUrl')?.value;
                }

                return { title, category, imageUrl, linkUrl, order };
            }
        });

        if (formValues) {
            try {
                const workData = {
                    title: formValues.title,
                    category: formValues.category,
                    image_url: formValues.imageUrl,
                    link_url: formValues.linkUrl,
                    order: formValues.order,
                    created_by: currentUser?.id
                };

                const { error } = await sb.from('works').insert([workData]);

                if (error) throw error;

                await Swal.fire({
                    title: 'تم بنجاح',
                    text: 'تم إضافة العمل بنجاح',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });

                await loadWorks();
            } catch (error) {
                console.error('Error adding work:', error);
                Swal.fire({
                    title: 'خطأ',
                    text: 'حدث خطأ أثناء إضافة العمل',
                    icon: 'error'
                });
            }
        }
    }

    async function editWork(workId) {
        const work = allWorks.find(w => w.id === workId);
        if (!work) return;

        const { value: formValues } = await Swal.fire({
            title: '<i class="fa-solid fa-edit"></i> تعديل العمل',
            html: `
                <div style="text-align: right;">
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">عنوان العمل</label>
                        <input type="text" id="workTitle" class="swal2-input" value="${work.title}" style="width: 100%; margin: 0;">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">الفئة</label>
                        <input type="text" id="workCategory" class="swal2-input" value="${work.category || ''}" style="width: 100%; margin: 0;">
                    </div>
                    ${window.ImageUploadHelper ? window.ImageUploadHelper.createImageUploadInput({
                        label: 'صورة العمل',
                        inputId: 'workImageUpload',
                        previewId: 'workImagePreview',
                        folder: 'works',
                        currentImageUrl: work.image_url
                    }) : `
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">رابط الصورة</label>
                            <input type="url" id="workImageUrl" class="swal2-input" value="${work.image_url || ''}" style="width: 100%; margin: 0;">
                        </div>
                    `}
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">رابط العمل</label>
                        <input type="url" id="workLinkUrl" class="swal2-input" value="${work.link_url || ''}" style="width: 100%; margin: 0;">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">الترتيب</label>
                        <input type="number" id="workOrder" class="swal2-input" value="${work.order || 0}" min="0" style="width: 100%; margin: 0;">
                    </div>
                </div>
            `,
            width: '600px',
            showCancelButton: true,
            confirmButtonText: 'حفظ',
            cancelButtonText: 'إلغاء',
            preConfirm: async () => {
                const title = document.getElementById('workTitle').value;
                const category = document.getElementById('workCategory').value;
                const linkUrl = document.getElementById('workLinkUrl').value;
                const order = parseInt(document.getElementById('workOrder').value) || 0;

                if (!title) {
                    Swal.showValidationMessage('يرجى إدخال عنوان العمل');
                    return false;
                }

                let imageUrl = work.image_url;
                if (window.ImageUploadHelper) {
                    try {
                        const newImageUrl = await window.ImageUploadHelper.uploadFromInput('workImageUpload', 'works');
                        if (newImageUrl) imageUrl = newImageUrl;
                    } catch (error) {
                        Swal.showValidationMessage('حدث خطأ أثناء رفع الصورة: ' + error.message);
                        return false;
                    }
                } else {
                    const urlInput = document.getElementById('workImageUrl');
                    if (urlInput) imageUrl = urlInput.value;
                }

                return { title, category, imageUrl, linkUrl, order };
            }
        });

        if (formValues) {
            try {
                const workData = {
                    title: formValues.title,
                    category: formValues.category,
                    image_url: formValues.imageUrl,
                    link_url: formValues.linkUrl,
                    order: formValues.order
                };

                const { error } = await sb.from('works').update(workData).eq('id', workId);

                if (error) throw error;

                await Swal.fire({
                    title: 'تم بنجاح',
                    text: 'تم تحديث العمل بنجاح',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });

                await loadWorks();
            } catch (error) {
                console.error('Error updating work:', error);
                Swal.fire({
                    title: 'خطأ',
                    text: 'حدث خطأ أثناء تحديث العمل',
                    icon: 'error'
                });
            }
        }
    }

    async function deleteWork(workId) {
        const result = await Swal.fire({
            title: 'تأكيد الحذف',
            text: 'هل أنت متأكد من حذف هذا العمل؟',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'نعم، احذف',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#dc2626'
        });

        if (result.isConfirmed) {
            try {
                const { error } = await sb.from('works').delete().eq('id', workId);

                if (error) throw error;

                await Swal.fire({
                    title: 'تم الحذف',
                    text: 'تم حذف العمل بنجاح',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });

                await loadWorks();
            } catch (error) {
                console.error('Error deleting work:', error);
                Swal.fire({
                    title: 'خطأ',
                    text: 'حدث خطأ أثناء حذف العمل',
                    icon: 'error'
                });
            }
        }
    }

    function setupEventListeners() {
        const addBtn = document.getElementById('addWorkBtn');
        if (addBtn) {
            addBtn.addEventListener('click', addWork);
        }
    }

    function showError(message) {
        if (window.Swal) {
            Swal.fire({
                title: 'خطأ',
                text: message,
                icon: 'error'
            });
        } else {
            alert(message);
        }
    }

    return {
        init,
        loadWorks,
        addWork,
        editWork,
        deleteWork
    };
})();
