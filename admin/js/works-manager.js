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
                <div class="empty-state">
                    <i class="fa-solid fa-inbox empty-state__icon"></i>
                    <p class="empty-state__title">لا توجد أعمال</p>
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
                            <td><img src="${work.image_url || 'https://via.placeholder.com/50'}" alt="${work.title}" class="work-thumbnail" onerror="this.src='https://via.placeholder.com/50'"/></td>
                            <td><strong>${work.title}</strong></td>
                            <td>${work.category || '-'}</td>
                            <td>${work.order || 0}</td>
                            <td class="action-buttons">
                                <button class=" btn-outline" onclick="WorksManager.editWork('${work.id}')">
                                    <i class="fa-solid fa-edit"></i>
                                </button>
                                <button class=" btn-outline btn-danger" onclick="WorksManager.deleteWork('${work.id}')">
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
        ModalHelper.form({
            title: '📁 إضافة عمل جديد',
            fields: [
                { name: 'title', type: 'text', label: 'عنوان العمل', placeholder: 'أدخل عنوان العمل', required: true },
                { name: 'category', type: 'text', label: 'الفئة', placeholder: 'مثال: تصميم، برمجة، تسويق' },
                { name: 'image_url', type: 'image', label: 'صورة العمل', folder: 'works', required: true },
                { name: 'link_url', type: 'url', label: 'رابط العمل', placeholder: 'https://example.com' },
                { name: 'order', type: 'number', label: 'الترتيب', value: '0' }
            ],
            submitText: 'إضافة',
            cancelText: 'إلغاء',
            onSubmit: async (formData) => {
                const loadingToast = Toast.loading('جاري إضافة العمل...');
                try {
                    const { error } = await sb.from('works').insert([{
                        title: formData.title,
                        category: formData.category || null,
                        image_url: formData.image_url,
                        link_url: formData.link_url || null,
                        order: parseInt(formData.order) || 0,
                        created_by: currentUser?.id
                    }]);
                    if (error) throw error;
                    Toast.close(loadingToast);
                    Toast.success('تم إضافة العمل بنجاح');
                    await loadWorks();
                } catch (error) {
                    Toast.close(loadingToast);
                    Toast.error('حدث خطأ أثناء إضافة العمل');
                    console.error(error);
                    throw error;
                }
            }
        });
    }

    async function editWork(workId) {
        const work = allWorks.find(w => w.id === workId);
        if (!work) return;

        ModalHelper.form({
            title: '✏️ تعديل العمل',
            fields: [
                { name: 'title', type: 'text', label: 'عنوان العمل', value: work.title, required: true },
                { name: 'category', type: 'text', label: 'الفئة', value: work.category || '' },
                { name: 'image_url', type: 'image', label: 'صورة العمل', folder: 'works', value: work.image_url, required: true },
                { name: 'link_url', type: 'url', label: 'رابط العمل', value: work.link_url || '' },
                { name: 'order', type: 'number', label: 'الترتيب', value: String(work.order || 0) }
            ],
            submitText: 'حفظ التعديلات',
            cancelText: 'إلغاء',
            onSubmit: async (formData) => {
                const loadingToast = Toast.loading('جاري حفظ التعديلات...');
                try {
                    const { error } = await sb.from('works').update({
                        title: formData.title,
                        category: formData.category || null,
                        image_url: formData.image_url,
                        link_url: formData.link_url || null,
                        order: parseInt(formData.order) || 0
                    }).eq('id', workId);
                    if (error) throw error;
                    Toast.close(loadingToast);
                    Toast.success('تم تحديث العمل بنجاح');
                    await loadWorks();
                } catch (error) {
                    Toast.close(loadingToast);
                    Toast.error('حدث خطأ أثناء تحديث العمل');
                    console.error(error);
                    throw error;
                }
            }
        });
    }

    async function deleteWork(workId) {
        const confirmed = await ModalHelper.confirm({
            title: 'تأكيد الحذف',
            message: 'هل أنت متأكد من حذف هذا العمل؟',
            type: 'danger',
            confirmText: 'نعم، احذف',
            cancelText: 'إلغاء'
        });

        if (confirmed) {
            const loadingToast = Toast.loading('جاري الحذف...');
            try {
                const { error } = await sb.from('works').delete().eq('id', workId);

                if (error) throw error;

                Toast.close(loadingToast);
                Toast.success('تم حذف العمل بنجاح');
                await loadWorks();
            } catch (error) {
                Toast.close(loadingToast);
                Toast.error('حدث خطأ أثناء حذف العمل');
                console.error('Error deleting work:', error);
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
        if (window.Toast) {
            Toast.error(message);
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
