/**
 * نظام إدارة الشركاء - نادي أدِيب
 */

window.SponsorsManager = (function() {
    const sb = window.sbClient;
    let currentUser = null;
    let allSponsors = [];

    async function init(user) {
        currentUser = user;
        await loadSponsors();
        setupEventListeners();
    }

    async function loadSponsors() {
        try {
            const { data, error } = await sb
                .from('sponsors')
                .select('*')
                .order('order', { ascending: true });

            if (error) throw error;

            allSponsors = data || [];
            renderSponsorsList();
        } catch (error) {
            console.error('Error loading sponsors:', error);
            showError('حدث خطأ في تحميل الشركاء');
        }
    }

    function renderSponsorsList() {
        const container = document.getElementById('websiteSponsorsGrid');
        if (!container) return;

        if (allSponsors.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-inbox empty-state__icon"></i>
                    <p class="empty-state__title">لا توجد شركاء</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>الشعار</th>
                        <th>الاسم</th>
                        <th>الوسام</th>
                        <th>الترتيب</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    ${allSponsors.map(sponsor => `
                        <tr>
                            <td><img src="${sponsor.logo_url || 'https://via.placeholder.com/50'}" alt="${sponsor.name}" class="sponsor-logo" onerror="this.src='https://via.placeholder.com/50'"/></td>
                            <td><strong>${sponsor.name}</strong></td>
                            <td>${sponsor.badge || '-'}</td>
                            <td>${sponsor.order || 0}</td>
                            <td class="action-buttons">
                                <button class=" btn-outline" onclick="SponsorsManager.editSponsor('${sponsor.id}')">
                                    <i class="fa-solid fa-edit"></i>
                                </button>
                                <button class=" btn-outline btn-danger" onclick="SponsorsManager.deleteSponsor('${sponsor.id}')">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async function addSponsor() {
        const fields = [
            {
                name: 'name',
                type: 'text',
                label: 'اسم الشريك',
                placeholder: 'أدخل اسم الشريك',
                required: true
            },
            {
                name: 'badge',
                type: 'text',
                label: 'الوسام',
                placeholder: 'مثال: شريك ذهبي، شريك استراتيجي'
            },
            {
                name: 'logo_url',
                type: 'image',
                label: 'شعار الشريك',
                folder: 'sponsors'
            },
            {
                name: 'link_url',
                type: 'url',
                label: 'رابط الموقع',
                placeholder: 'https://example.com'
            },
            {
                name: 'description',
                type: 'textarea',
                label: 'الوصف',
                placeholder: 'وصف مختصر عن الشريك'
            },
            {
                name: 'order',
                type: 'number',
                label: 'الترتيب',
                value: '0',
                min: 0
            }
        ];

        try {
            await ModalHelper.form({
                title: '🤝 إضافة شريك جديد',
                fields: fields,
                submitText: 'إضافة',
                cancelText: 'إلغاء',
                onSubmit: async (formData) => {
                    const loadingToast = Toast.loading('جاري إضافة الشريك...');

                    try {
                        const sponsorData = {
                            name: formData.name,
                            badge: formData.badge || null,
                            logo_url: formData.logo_url || null,
                            link_url: formData.link_url || null,
                            description: formData.description || null,
                            order: parseInt(formData.order) || 0,
                            created_by: currentUser?.id
                        };

                        const { error } = await sb.from('sponsors').insert([sponsorData]);

                        if (error) throw error;

                        Toast.close(loadingToast);
                        Toast.success('تم إضافة الشريك بنجاح');
                        await loadSponsors();
                    } catch (error) {
                        Toast.close(loadingToast);
                        Toast.error('حدث خطأ أثناء إضافة الشريك');
                        console.error('Error adding sponsor:', error);
                        throw error;
                    }
                }
            });
        } catch (error) {
            console.error('Error in addSponsor:', error);
        }
    }

    async function editSponsor(sponsorId) {
        const sponsor = allSponsors.find(s => s.id === sponsorId);
        if (!sponsor) return;

        const fields = [
            {
                name: 'name',
                type: 'text',
                label: 'اسم الشريك',
                placeholder: 'أدخل اسم الشريك',
                value: sponsor.name,
                required: true
            },
            {
                name: 'badge',
                type: 'text',
                label: 'الوسام',
                placeholder: 'مثال: شريك ذهبي، شريك استراتيجي',
                value: sponsor.badge || ''
            },
            {
                name: 'logo_url',
                type: 'image',
                label: 'شعار الشريك',
                folder: 'sponsors',
                value: sponsor.logo_url || ''
            },
            {
                name: 'link_url',
                type: 'url',
                label: 'رابط الموقع',
                placeholder: 'https://example.com',
                value: sponsor.link_url || ''
            },
            {
                name: 'description',
                type: 'textarea',
                label: 'الوصف',
                placeholder: 'وصف مختصر عن الشريك',
                value: sponsor.description || ''
            },
            {
                name: 'order',
                type: 'number',
                label: 'الترتيب',
                value: String(sponsor.order || 0),
                min: 0
            }
        ];

        try {
            await ModalHelper.form({
                title: '✏️ تعديل الشريك',
                fields: fields,
                submitText: 'حفظ التعديلات',
                cancelText: 'إلغاء',
                onSubmit: async (formData) => {
                    const loadingToast = Toast.loading('جاري حفظ التعديلات...');

                    try {
                        const sponsorData = {
                            name: formData.name,
                            badge: formData.badge || null,
                            logo_url: formData.logo_url || sponsor.logo_url,
                            link_url: formData.link_url || null,
                            description: formData.description || null,
                            order: parseInt(formData.order) || 0
                        };

                        const { error } = await sb.from('sponsors').update(sponsorData).eq('id', sponsorId);

                        if (error) throw error;

                        Toast.close(loadingToast);
                        Toast.success('تم تحديث الشريك بنجاح');
                        await loadSponsors();
                    } catch (error) {
                        Toast.close(loadingToast);
                        Toast.error('حدث خطأ أثناء تحديث الشريك');
                        console.error('Error updating sponsor:', error);
                        throw error;
                    }
                }
            });
        } catch (error) {
            console.error('Error in editSponsor:', error);
        }
    }

    async function deleteSponsor(sponsorId) {
        const confirmed = await ModalHelper.confirm({
            title: 'تأكيد الحذف',
            message: 'هل أنت متأكد من حذف هذا الشريك؟',
            type: 'danger',
            confirmText: 'نعم، احذف',
            cancelText: 'إلغاء'
        });

        if (confirmed) {
            const loadingToast = Toast.loading('جاري الحذف...');
            try {
                const { error } = await sb.from('sponsors').delete().eq('id', sponsorId);

                if (error) throw error;

                Toast.close(loadingToast);
                Toast.success('تم حذف الشريك بنجاح');
                await loadSponsors();
            } catch (error) {
                Toast.close(loadingToast);
                Toast.error('حدث خطأ أثناء حذف الشريك');
                console.error('Error deleting sponsor:', error);
            }
        }
    }

    function setupEventListeners() {
        const addBtn = document.getElementById('addSponsorBtn');
        if (addBtn) {
            addBtn.addEventListener('click', addSponsor);
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
        loadSponsors,
        addSponsor,
        editSponsor,
        deleteSponsor
    };
})();
