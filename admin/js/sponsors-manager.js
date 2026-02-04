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
                <div style="text-align: center; padding: 3rem; color: #6b7280;">
                    <i class="fa-solid fa-inbox fa-3x" style="margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p style="font-size: 1.125rem; font-weight: 500;">لا توجد شركاء</p>
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
                            <td><img src="${sponsor.logo_url || 'https://via.placeholder.com/50'}" alt="${sponsor.name}" style="width: 50px; height: 50px; object-fit: contain; border-radius: 4px;" onerror="this.src='https://via.placeholder.com/50'"/></td>
                            <td><strong>${sponsor.name}</strong></td>
                            <td>${sponsor.badge || '-'}</td>
                            <td>${sponsor.order || 0}</td>
                            <td class="action-buttons">
                                <button class="btn-sm btn-outline" onclick="SponsorsManager.editSponsor('${sponsor.id}')">
                                    <i class="fa-solid fa-edit"></i>
                                </button>
                                <button class="btn-sm btn-outline btn-danger" onclick="SponsorsManager.deleteSponsor('${sponsor.id}')">
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
        const { value: formValues } = await Swal.fire({
            title: '<i class="fa-solid fa-handshake"></i> إضافة شريك جديد',
            html: `
                <div style="text-align: right;">
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">اسم الشريك</label>
                        <input type="text" id="sponsorName" class="swal2-input" placeholder="اسم الشريك" style="width: 100%; margin: 0;">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">الوسام</label>
                        <input type="text" id="sponsorBadge" class="swal2-input" placeholder="مثال: شريك ذهبي، شريك استراتيجي" style="width: 100%; margin: 0;">
                    </div>
                    ${window.ImageUploadHelper ? window.ImageUploadHelper.createImageUploadInput({
                        label: 'شعار الشريك',
                        inputId: 'sponsorLogoUpload',
                        previewId: 'sponsorLogoPreview',
                        folder: 'sponsors'
                    }) : `
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">رابط الشعار</label>
                            <input type="url" id="sponsorLogoUrl" class="swal2-input" placeholder="https://example.com/logo.png" style="width: 100%; margin: 0;">
                        </div>
                    `}
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">رابط الموقع</label>
                        <input type="url" id="sponsorLinkUrl" class="swal2-input" placeholder="https://example.com" style="width: 100%; margin: 0;">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">الوصف</label>
                        <textarea id="sponsorDescription" class="swal2-textarea" rows="2" placeholder="وصف مختصر عن الشريك" style="width: 100%; margin: 0;"></textarea>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">الترتيب</label>
                        <input type="number" id="sponsorOrder" class="swal2-input" value="0" min="0" style="width: 100%; margin: 0;">
                    </div>
                </div>
            `,
            width: '600px',
            showCancelButton: true,
            confirmButtonText: 'إضافة',
            cancelButtonText: 'إلغاء',
            preConfirm: async () => {
                const name = document.getElementById('sponsorName').value;
                const badge = document.getElementById('sponsorBadge').value;
                const linkUrl = document.getElementById('sponsorLinkUrl').value;
                const description = document.getElementById('sponsorDescription').value;
                const order = parseInt(document.getElementById('sponsorOrder').value) || 0;

                if (!name) {
                    Swal.showValidationMessage('يرجى إدخال اسم الشريك');
                    return false;
                }

                let logoUrl = null;
                if (window.ImageUploadHelper) {
                    try {
                        logoUrl = await window.ImageUploadHelper.uploadFromInput('sponsorLogoUpload', 'sponsors');
                    } catch (error) {
                        Swal.showValidationMessage('حدث خطأ أثناء رفع الشعار: ' + error.message);
                        return false;
                    }
                } else {
                    logoUrl = document.getElementById('sponsorLogoUrl')?.value;
                }

                return { name, badge, logoUrl, linkUrl, description, order };
            }
        });

        if (formValues) {
            try {
                const sponsorData = {
                    name: formValues.name,
                    badge: formValues.badge,
                    logo_url: formValues.logoUrl,
                    link_url: formValues.linkUrl,
                    description: formValues.description,
                    order: formValues.order,
                    created_by: currentUser?.id
                };

                const { error } = await sb.from('sponsors').insert([sponsorData]);

                if (error) throw error;

                await Swal.fire({
                    title: 'تم بنجاح',
                    text: 'تم إضافة الشريك بنجاح',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });

                await loadSponsors();
            } catch (error) {
                console.error('Error adding sponsor:', error);
                Swal.fire({
                    title: 'خطأ',
                    text: 'حدث خطأ أثناء إضافة الشريك',
                    icon: 'error'
                });
            }
        }
    }

    async function editSponsor(sponsorId) {
        const sponsor = allSponsors.find(s => s.id === sponsorId);
        if (!sponsor) return;

        const { value: formValues } = await Swal.fire({
            title: '<i class="fa-solid fa-edit"></i> تعديل الشريك',
            html: `
                <div style="text-align: right;">
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">اسم الشريك</label>
                        <input type="text" id="sponsorName" class="swal2-input" value="${sponsor.name}" style="width: 100%; margin: 0;">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">الوسام</label>
                        <input type="text" id="sponsorBadge" class="swal2-input" value="${sponsor.badge || ''}" style="width: 100%; margin: 0;">
                    </div>
                    ${window.ImageUploadHelper ? window.ImageUploadHelper.createImageUploadInput({
                        label: 'شعار الشريك',
                        inputId: 'sponsorLogoUpload',
                        previewId: 'sponsorLogoPreview',
                        folder: 'sponsors',
                        currentImageUrl: sponsor.logo_url
                    }) : `
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">رابط الشعار</label>
                            <input type="url" id="sponsorLogoUrl" class="swal2-input" value="${sponsor.logo_url || ''}" style="width: 100%; margin: 0;">
                        </div>
                    `}
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">رابط الموقع</label>
                        <input type="url" id="sponsorLinkUrl" class="swal2-input" value="${sponsor.link_url || ''}" style="width: 100%; margin: 0;">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">الوصف</label>
                        <textarea id="sponsorDescription" class="swal2-textarea" rows="2" style="width: 100%; margin: 0;">${sponsor.description || ''}</textarea>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">الترتيب</label>
                        <input type="number" id="sponsorOrder" class="swal2-input" value="${sponsor.order || 0}" min="0" style="width: 100%; margin: 0;">
                    </div>
                </div>
            `,
            width: '600px',
            showCancelButton: true,
            confirmButtonText: 'حفظ',
            cancelButtonText: 'إلغاء',
            preConfirm: async () => {
                const name = document.getElementById('sponsorName').value;
                const badge = document.getElementById('sponsorBadge').value;
                const linkUrl = document.getElementById('sponsorLinkUrl').value;
                const description = document.getElementById('sponsorDescription').value;
                const order = parseInt(document.getElementById('sponsorOrder').value) || 0;

                if (!name) {
                    Swal.showValidationMessage('يرجى إدخال اسم الشريك');
                    return false;
                }

                let logoUrl = sponsor.logo_url;
                if (window.ImageUploadHelper) {
                    try {
                        const newLogoUrl = await window.ImageUploadHelper.uploadFromInput('sponsorLogoUpload', 'sponsors');
                        if (newLogoUrl) logoUrl = newLogoUrl;
                    } catch (error) {
                        Swal.showValidationMessage('حدث خطأ أثناء رفع الشعار: ' + error.message);
                        return false;
                    }
                } else {
                    const urlInput = document.getElementById('sponsorLogoUrl');
                    if (urlInput) logoUrl = urlInput.value;
                }

                return { name, badge, logoUrl, linkUrl, description, order };
            }
        });

        if (formValues) {
            try {
                const sponsorData = {
                    name: formValues.name,
                    badge: formValues.badge,
                    logo_url: formValues.logoUrl,
                    link_url: formValues.linkUrl,
                    description: formValues.description,
                    order: formValues.order
                };

                const { error } = await sb.from('sponsors').update(sponsorData).eq('id', sponsorId);

                if (error) throw error;

                await Swal.fire({
                    title: 'تم بنجاح',
                    text: 'تم تحديث الشريك بنجاح',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });

                await loadSponsors();
            } catch (error) {
                console.error('Error updating sponsor:', error);
                Swal.fire({
                    title: 'خطأ',
                    text: 'حدث خطأ أثناء تحديث الشريك',
                    icon: 'error'
                });
            }
        }
    }

    async function deleteSponsor(sponsorId) {
        const result = await Swal.fire({
            title: 'تأكيد الحذف',
            text: 'هل أنت متأكد من حذف هذا الشريك؟',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'نعم، احذف',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#dc2626'
        });

        if (result.isConfirmed) {
            try {
                const { error } = await sb.from('sponsors').delete().eq('id', sponsorId);

                if (error) throw error;

                await Swal.fire({
                    title: 'تم الحذف',
                    text: 'تم حذف الشريك بنجاح',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });

                await loadSponsors();
            } catch (error) {
                console.error('Error deleting sponsor:', error);
                Swal.fire({
                    title: 'خطأ',
                    text: 'حدث خطأ أثناء حذف الشريك',
                    icon: 'error'
                });
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
        loadSponsors,
        addSponsor,
        editSponsor,
        deleteSponsor
    };
})();
