/**
 * نافذة الترحيب لأعضاء نادي أدِيب
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'adeeb_welcome_shown';
    let currentUser = null;
    let userCommittee = null;

    /**
     * التحقق من عرض النافذة
     */
    function shouldShowWelcome() {
        const hasShown = localStorage.getItem(STORAGE_KEY);
        return !hasShown;
    }

    /**
     * إنشاء وعرض نافذة الترحيب
     */
    async function showWelcomeModal() {
        if (!shouldShowWelcome()) {
            return;
        }

        // جلب بيانات المستخدم واللجنة
        await loadUserData();

        // إنشاء النافذة
        const modal = createModalHTML();
        document.body.insertAdjacentHTML('beforeend', modal);

        // إضافة الأنيميشن
        setTimeout(() => {
            const modalElement = document.getElementById('welcomeModal');
            if (modalElement) {
                modalElement.classList.add('active');
            }
        }, 100);

        // ربط الأحداث
        bindEvents();
    }

    /**
     * جلب بيانات المستخدم
     */
    async function loadUserData() {
        try {
            const { data: { user } } = await window.sbClient.auth.getUser();
            if (!user) return;

            currentUser = user;

            // جلب بيانات العضو
            const { data: memberDetails } = await window.sbClient
                .from('member_details')
                .select('committee_id, committees(committee_name_ar, group_link)')
                .eq('user_id', user.id)
                .single();

            if (memberDetails && memberDetails.committees) {
                userCommittee = memberDetails.committees;
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    /**
     * إنشاء HTML النافذة
     */
    function createModalHTML() {
        const committeeSection = userCommittee ? `
            <div class="welcome-item">
                <div class="welcome-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                    <i class="fa-solid fa-users-gear"></i>
                </div>
                <div class="welcome-content">
                    <h3>لجنتك: ${userCommittee.committee_name_ar}</h3>
                    <p>انضم إلى قروب لجنتك للتواصل مع أعضاء الفريق</p>
                    ${userCommittee.group_link ? `<a href="${userCommittee.group_link}" target="_blank" class="welcome-link">
                        <i class="fa-brands fa-whatsapp"></i>
                        انضم للقروب
                    </a>` : ''}
                </div>
            </div>
        ` : '';

        return `
            <div id="welcomeModal" class="welcome-modal">
                <div class="welcome-overlay"></div>
                <div class="welcome-container">
                    <div class="welcome-header">
                        <div class="welcome-logo">
                            <img src="https://lh3.googleusercontent.com/d/195w-tUBF_VKwFOm3Sh06fmwnlYzIyw0e" alt="شعار أدِيب">
                        </div>
                        <h1>مرحباً بك في نادي أدِيب! 🎉</h1>
                        <p>نحن سعداء بانضمامك إلى عائلة أدِيب </p>
                    </div>

                    <div class="welcome-body">
                        <!-- قروب مجلس أدِيب العام -->
                        <div class="welcome-item">
                            <div class="welcome-icon" style="background: linear-gradient(135deg, #3d8fd6, #274060);">
                                <i class="fa-solid fa-users"></i>
                            </div>
                            <div class="welcome-content">
                                <h3>قروب مجلس أدِيب العام</h3>
                                <p>مجلس عام لجميع الأُدباء للنقاشات العامة والدردشة</p>
                                <a href="#" id="welcomeGeneralGroupLink" class="welcome-link">
                                    <i class="fa-brands fa-whatsapp"></i>
                                    انضم الآن
                                </a>
                            </div>
                        </div>

                        <!-- قروب مجلس أدِيبات -->
                        <div class="welcome-item" id="welcomeFemaleGroupItem">
                            <div class="welcome-icon" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);">
                                <i class="fa-solid fa-user-group"></i>
                            </div>
                            <div class="welcome-content">
                                <h3>قروب مجلس أدِيبات</h3>
                                <p>مجلس خاص للأديبات البنات فقط</p>
                                <a href="#" id="welcomeFemaleGroupLink" class="welcome-link">
                                    <i class="fa-brands fa-whatsapp"></i>
                                    انضم الآن
                                </a>
                            </div>
                        </div>

                        ${committeeSection}

                        <!-- تثبيت التطبيق -->
                        <div class="welcome-item">
                            <div class="welcome-icon" style="background: linear-gradient(135deg, #10b981, #059669);">
                                <i class="fa-solid fa-mobile-screen-button"></i>
                            </div>
                            <div class="welcome-content">
                                <h3>ثبّت التطبيق</h3>
                                <p>احصل على تجربة أفضل بتثبيت التطبيق على جهازك</p>
                                <button class="welcome-link" onclick="window.location.hash='settings-section'">
                                    <i class="fa-solid fa-download"></i>
                                    اذهب للإعدادات
                                </button>
                            </div>
                        </div>

                        <!-- تفعيل الإشعارات -->
                        <div class="welcome-item">
                            <div class="welcome-icon" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);">
                                <i class="fa-solid fa-bell"></i>
                            </div>
                            <div class="welcome-content">
                                <h3>فعّل الإشعارات</h3>
                                <p>ابقَ على اطلاع بآخر الأخبار والفعاليات</p>
                                <button class="welcome-link" onclick="window.location.hash='settings-section'">
                                    <i class="fa-solid fa-bell-plus"></i>
                                    اذهب للإعدادات
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="welcome-footer">
                        <button id="welcomeDoneBtn" class="welcome-done-btn">
                            <i class="fa-solid fa-check"></i>
                            تم، شكراً!
                        </button>
                    </div>
                </div>

                <style>
                    .welcome-modal {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        z-index: 10000;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        opacity: 0;
                        visibility: hidden;
                        transition: opacity 0.3s ease, visibility 0.3s ease;
                    }

                    .welcome-modal.active {
                        opacity: 1;
                        visibility: visible;
                    }

                    .welcome-overlay {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.7);
                        backdrop-filter: blur(8px);
                    }

                    .welcome-container {
                        position: relative;
                        background: white;
                        border-radius: 24px;
                        max-width: 700px;
                        width: 90%;
                        max-height: 90vh;
                        overflow-y: auto;
                        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
                        transform: scale(0.9);
                        transition: transform 0.3s ease;
                    }

                    .welcome-modal.active .welcome-container {
                        transform: scale(1);
                    }

                    .welcome-header {
                        text-align: center;
                        padding: 2rem 2rem 1.5rem;
                        background: linear-gradient(135deg, #3d8fd6, #274060);
                        color: white;
                        border-radius: 24px 24px 0 0;
                    }

                    .welcome-logo img {
                        width: 8rem;
                        height: auto;
                        margin-bottom: 1rem;
                        filter: brightness(0) invert(1);
                    }

                    .welcome-header h1 {
                        margin: 0 0 0.5rem 0;
                        font-size: 1.75rem;
                        font-weight: bold;
                    }

                    .welcome-header p {
                        margin: 0;
                        font-size: 1rem;
                        opacity: 0.9;
                    }

                    .welcome-body {
                        padding: 2rem;
                        display: grid;
                        gap: 1.5rem;
                    }

                    .welcome-item {
                        display: flex;
                        gap: 1.25rem;
                        padding: 1.5rem;
                        background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
                        border-radius: 16px;
                        border: 1px solid #e2e8f0;
                        transition: all 0.3s ease;
                    }

                    .welcome-item:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
                    }

                    .welcome-icon {
                        width: 60px;
                        height: 60px;
                        border-radius: 14px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    }

                    .welcome-icon i {
                        font-size: 1.75rem;
                        color: white;
                    }

                    .welcome-content {
                        flex: 1;
                    }

                    .welcome-content h3 {
                        margin: 0 0 0.5rem 0;
                        color: #274060;
                        font-size: 1.1rem;
                        font-weight: bold;
                    }

                    .welcome-content p {
                        margin: 0 0 1rem 0;
                        color: #64748b;
                        font-size: 0.9rem;
                        line-height: 1.5;
                    }

                    .welcome-link {
                        display: inline-flex;
                        align-items: center;
                        gap: 0.5rem;
                        padding: 0.625rem 1.25rem;
                        background: linear-gradient(135deg, #3d8fd6, #274060);
                        color: white;
                        text-decoration: none;
                        border-radius: 8px;
                        font-size: 0.9rem;
                        font-weight: 600;
                        transition: all 0.3s ease;
                        border: none;
                        cursor: pointer;
                    }

                    .welcome-link:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(61, 143, 214, 0.3);
                    }

                    .welcome-footer {
                        padding: 1.5rem 2rem 2rem;
                        text-align: center;
                        border-top: 1px solid #e2e8f0;
                    }

                    .welcome-done-btn {
                        padding: 1rem 3rem;
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        border: none;
                        border-radius: 12px;
                        font-size: 1.1rem;
                        font-weight: bold;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                        display: inline-flex;
                        align-items: center;
                        gap: 0.75rem;
                    }

                    .welcome-done-btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
                    }

                    @media (max-width: 768px) {
                        .welcome-container {
                            width: 95%;
                            max-height: 95vh;
                        }

                        .welcome-header h1 {
                            font-size: 1.5rem;
                        }

                        .welcome-body {
                            padding: 1.5rem;
                        }

                        .welcome-item {
                            flex-direction: column;
                            text-align: center;
                        }

                        .welcome-icon {
                            margin: 0 auto;
                        }
                    }
                </style>
            </div>
        `;
    }

    /**
     * ربط الأحداث
     */
    function bindEvents() {
        const doneBtn = document.getElementById('welcomeDoneBtn');
        const generalGroupLink = document.getElementById('welcomeGeneralGroupLink');
        const femaleGroupLink = document.getElementById('welcomeFemaleGroupLink');
        const femaleGroupItem = document.getElementById('welcomeFemaleGroupItem');

        // زر تم
        if (doneBtn) {
            doneBtn.addEventListener('click', closeWelcomeModal);
        }

        // جلب روابط المجموعات
        loadGroupLinks(generalGroupLink, femaleGroupLink, femaleGroupItem);
    }

    /**
     * جلب روابط المجموعات
     */
    async function loadGroupLinks(generalLink, femaleLink, femaleItem) {
        try {
            // جلب الروابط من قاعدة البيانات
            const { data: settings } = await window.sbClient
                .from('site_settings')
                .select('setting_key, setting_value')
                .in('setting_key', ['whatsapp_general_group', 'whatsapp_female_group'])
                .eq('is_active', true);

            if (settings) {
                settings.forEach(setting => {
                    if (setting.setting_key === 'whatsapp_general_group' && generalLink) {
                        generalLink.href = setting.setting_value;
                        generalLink.target = '_blank';
                    } else if (setting.setting_key === 'whatsapp_female_group' && femaleLink) {
                        femaleLink.href = setting.setting_value;
                        femaleLink.target = '_blank';
                    }
                });
            }

            // التحقق من جنس المستخدم لمجلس أدِيبات
            if (femaleLink && currentUser) {
                const { data: profile } = await window.sbClient
                    .from('profiles')
                    .select('gender')
                    .eq('id', currentUser.id)
                    .single();

                if (profile && profile.gender !== 'female' && femaleItem) {
                    femaleItem.style.display = 'none';
                } else if (femaleLink) {
                    femaleLink.addEventListener('click', async (e) => {
                        e.preventDefault();
                        
                        if (profile && profile.gender === 'female') {
                            window.open(femaleLink.href, '_blank');
                        } else {
                            if (window.Swal) {
                                Swal.fire({
                                    title: 'عذراً',
                                    text: 'هذا المجلس مخصص للأديبات فقط',
                                    icon: 'warning',
                                    confirmButtonText: 'حسناً',
                                    confirmButtonColor: '#3d8fd6'
                                });
                            }
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error loading group links:', error);
        }
    }

    /**
     * إغلاق النافذة
     */
    function closeWelcomeModal() {
        const modal = document.getElementById('welcomeModal');
        if (!modal) return;

        // حفظ في localStorage
        localStorage.setItem(STORAGE_KEY, 'true');

        // إخفاء النافذة
        modal.classList.remove('active');

        setTimeout(() => {
            modal.remove();
        }, 300);
    }

    /**
     * التهيئة
     */
    function init() {
        // الانتظار قليلاً قبل عرض النافذة
        setTimeout(() => {
            showWelcomeModal();
        }, 1000);
    }

    // تهيئة عند تحميل DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // تصدير الوظائف
    window.welcomeModal = {
        show: showWelcomeModal,
        close: closeWelcomeModal
    };
})();
