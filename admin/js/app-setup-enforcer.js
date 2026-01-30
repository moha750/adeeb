/**
 * نظام إجبار المستخدم على تثبيت التطبيق وتفعيل الإشعارات
 * يعرض modal مبتكر وجذاب للمستخدمين الذين لم يثبتوا التطبيق أو يفعلوا الإشعارات
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'adeeb_app_setup_status';
    const REMINDER_INTERVAL = 24 * 60 * 60 * 1000; // 24 ساعة
    
    let enforcerModal = null;
    let setupStatus = {
        appInstalled: false,
        notificationsEnabled: false,
        lastReminder: null,
        reminderCount: 0
    };

    /**
     * تهيئة النظام
     */
    function init() {
        loadSetupStatus();
        checkSetupStatus();
        
        // التحقق من الحالة كل 30 ثانية
        setInterval(checkSetupStatus, 30000);
        
        // مراقبة التنقل بين الأقسام
        setupNavigationWatcher();
    }

    /**
     * إعداد مراقب التنقل بين الأقسام
     */
    function setupNavigationWatcher() {
        // مراقبة النقر على روابط القائمة الجانبية
        document.addEventListener('click', (e) => {
            const navLink = e.target.closest('.nav-link');
            if (navLink) {
                const targetSection = navLink.getAttribute('data-section');
                
                // إذا كان المستخدم يحاول الانتقال لقسم غير الإعدادات
                // وكان الإعداد غير مكتمل، أظهر النافذة
                if (targetSection && targetSection !== 'settings-section') {
                    if (!setupStatus.appInstalled || !setupStatus.notificationsEnabled) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // إظهار النافذة مباشرة
                        if (!enforcerModal) {
                            showEnforcerModal();
                        }
                    }
                }
            }
        }, true); // استخدام capture phase للتأكد من التنفيذ قبل أي معالجات أخرى
    }

    /**
     * تحميل حالة الإعداد من localStorage
     */
    function loadSetupStatus() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setupStatus = { ...setupStatus, ...JSON.parse(stored) };
            }
        } catch (error) {
            console.error('Error loading setup status:', error);
        }
    }

    /**
     * حفظ حالة الإعداد
     */
    function saveSetupStatus() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(setupStatus));
        } catch (error) {
            console.error('Error saving setup status:', error);
        }
    }

    /**
     * التحقق من حالة الإعداد
     */
    async function checkSetupStatus() {
        // التحقق من تثبيت التطبيق
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
            || window.navigator.standalone 
            || document.referrer.includes('android-app://');
        
        setupStatus.appInstalled = isStandalone;

        // التحقق من تفعيل الإشعارات
        if ('Notification' in window) {
            setupStatus.notificationsEnabled = Notification.permission === 'granted';
        }

        // عرض Modal إذا لم يكتمل الإعداد
        if (!setupStatus.appInstalled || !setupStatus.notificationsEnabled) {
            const shouldShow = shouldShowReminder();
            if (shouldShow) {
                showEnforcerModal();
            }
        }

        saveSetupStatus();
    }

    /**
     * تحديد ما إذا كان يجب عرض التذكير
     */
    function shouldShowReminder() {
        // عرض النافذة دائماً إذا لم يكتمل الإعداد
        // (تم إزالة نظام التذكير كل 24 ساعة)
        return true;
    }

    /**
     * عرض Modal الإجبار المبتكر
     */
    function showEnforcerModal() {
        if (enforcerModal) return; // لا تعرض إذا كان معروضاً بالفعل

        const missingSteps = [];
        if (!setupStatus.appInstalled) {
            missingSteps.push({
                icon: 'fa-mobile-screen-button',
                title: 'تثبيت التطبيق',
                description: 'ثبّت التطبيق للحصول على تجربة أسرع وأفضل',
                action: 'install',
                color: '#3d8fd6'
            });
        }
        if (!setupStatus.notificationsEnabled) {
            missingSteps.push({
                icon: 'fa-bell',
                title: 'تفعيل الإشعارات',
                description: 'فعّل الإشعارات لتبقى على اطلاع بكل جديد',
                action: 'notifications',
                color: '#8b5cf6'
            });
        }

        const modalHTML = createModalHTML(missingSteps);
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        enforcerModal = document.getElementById('appSetupEnforcerModal');
        
        // إضافة الأنيميشن
        setTimeout(() => {
            enforcerModal.classList.add('active');
        }, 100);

        // ربط الأحداث
        bindModalEvents(missingSteps);

        // تحديث آخر تذكير
        setupStatus.lastReminder = new Date().toISOString();
        setupStatus.reminderCount++;
        saveSetupStatus();
    }

    /**
     * إنشاء HTML للـ Modal
     */
    function createModalHTML(steps) {
        const stepsHTML = steps.map((step, index) => `
            <div class="setup-step" data-action="${step.action}" style="animation-delay: ${index * 0.1}s;">
                <div class="step-icon" style="background: linear-gradient(135deg, ${step.color}, ${adjustColor(step.color, -20)});">
                    <i class="fa-solid ${step.icon}"></i>
                </div>
                <div class="step-content">
                    <h3>${step.title}</h3>
                    <p>${step.description}</p>
                </div>
                <div class="step-action">
                    <button class="setup-action-btn" data-action="${step.action}">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                </div>
            </div>
        `).join('');

        return `
            <div id="appSetupEnforcerModal" class="app-setup-enforcer-modal">
                <div class="enforcer-backdrop"></div>
                <div class="enforcer-container">
                    <div class="enforcer-header">
                        <div class="enforcer-logo">
                            <i class="fa-solid fa-rocket"></i>
                        </div>
                        <h2>حسّن تجربتك مع أدِيب</h2>
                        <p>للاستفادة الكاملة من المنصة، يُرجى إكمال الخطوات التالية:</p>
                    </div>
                    
                    <div class="enforcer-body">
                        ${stepsHTML}
                    </div>

                    <div class="enforcer-footer">
                        <div class="reminder-info">
                            <i class="fa-solid fa-exclamation-circle"></i>
                            <span>يجب إكمال هذه الخطوات للاستفادة الكاملة من المنصة</span>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .app-setup-enforcer-modal {
                    position: fixed;
                    inset: 0;
                    z-index: 99999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1rem;
                    opacity: 0;
                    visibility: hidden;
                    transition: opacity 0.3s ease, visibility 0.3s ease;
                }

                .app-setup-enforcer-modal.active {
                    opacity: 1;
                    visibility: visible;
                }

                .enforcer-backdrop {
                    position: absolute;
                    inset: 0;
                    background: rgba(39, 64, 96, 0.85);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                }

                .enforcer-container {
                    position: relative;
                    max-width: 600px;
                    width: 100%;
                    background: white;
                    border-radius: 24px;
                    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
                    overflow: hidden;
                    transform: scale(0.9) translateY(20px);
                    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }

                .app-setup-enforcer-modal.active .enforcer-container {
                    transform: scale(1) translateY(0);
                }

                .enforcer-header {
                    background: linear-gradient(135deg, #f8f9fa 0%, #e6f0f9 100%);
                    padding: 2.5rem 2rem;
                    text-align: center;
                    border-bottom: 1px solid rgba(61, 143, 214, 0.15);
                    position: relative;
                }

                .enforcer-header::before {
                    content: "";
                    position: absolute;
                    top: 0;
                    right: 0;
                    width: 100%;
                    height: 4px;
                    background: linear-gradient(90deg, #3d8fd6, #8b5cf6, #f59e0b);
                }

                .enforcer-logo {
                    width: 80px;
                    height: 80px;
                    margin: 0 auto 1.5rem;
                    background: linear-gradient(135deg, #3d8fd6, #274060);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 10px 30px rgba(61, 143, 214, 0.3);
                    animation: pulse 2s ease-in-out infinite;
                }

                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }

                .enforcer-logo i {
                    font-size: 2.5rem;
                    color: white;
                }

                .enforcer-header h2 {
                    margin: 0 0 0.75rem 0;
                    color: #274060;
                    font-size: 1.75rem;
                    font-weight: bold;
                }

                .enforcer-header p {
                    margin: 0;
                    color: #64748b;
                    font-size: 1rem;
                    line-height: 1.6;
                }

                .enforcer-body {
                    padding: 2rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .setup-step {
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                    padding: 1.25rem;
                    background: linear-gradient(135deg, rgba(61, 143, 214, 0.03), rgba(61, 143, 214, 0.01));
                    border: 1px solid rgba(61, 143, 214, 0.15);
                    border-radius: 16px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    animation: slideIn 0.5s ease forwards;
                    opacity: 0;
                }

                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateX(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                .setup-step:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(61, 143, 214, 0.15);
                    border-color: rgba(61, 143, 214, 0.3);
                }

                .step-icon {
                    width: 60px;
                    height: 60px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
                }

                .step-icon i {
                    font-size: 1.75rem;
                    color: white;
                }

                .step-content {
                    flex: 1;
                }

                .step-content h3 {
                    margin: 0 0 0.5rem 0;
                    color: #274060;
                    font-size: 1.1rem;
                    font-weight: bold;
                }

                .step-content p {
                    margin: 0;
                    color: #64748b;
                    font-size: 0.9rem;
                    line-height: 1.5;
                }

                .step-action {
                    flex-shrink: 0;
                }

                .setup-action-btn {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    border: none;
                    background: linear-gradient(135deg, #3d8fd6, #274060);
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 12px rgba(61, 143, 214, 0.25);
                }

                .setup-action-btn:hover {
                    transform: translateX(-4px);
                    box-shadow: 0 6px 16px rgba(61, 143, 214, 0.35);
                }

                .setup-action-btn i {
                    font-size: 1.1rem;
                }

                .enforcer-footer {
                    padding: 1.5rem 2rem;
                    background: #f8fafc;
                    border-top: 1px solid #e2e8f0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1rem;
                }

                .btn-later {
                    padding: 0.75rem 2rem;
                    border-radius: 12px;
                    border: 1px solid rgba(61, 143, 214, 0.3);
                    background: white;
                    color: #274060;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .btn-later:hover {
                    background: #f8fafc;
                    border-color: rgba(61, 143, 214, 0.5);
                }

                .reminder-info {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: #64748b;
                    font-size: 0.85rem;
                }

                .reminder-info i {
                    color: #3d8fd6;
                }

                @keyframes shake {
                    0%, 100% { transform: scale(1) translateY(0) translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: scale(1) translateY(0) translateX(-5px); }
                    20%, 40%, 60%, 80% { transform: scale(1) translateY(0) translateX(5px); }
                }

                @media (max-width: 640px) {
                    .enforcer-container {
                        margin: 1rem;
                    }

                    .enforcer-header {
                        padding: 2rem 1.5rem;
                    }

                    .enforcer-body {
                        padding: 1.5rem;
                    }

                    .setup-step {
                        flex-direction: column;
                        text-align: center;
                    }

                    .step-action {
                        width: 100%;
                    }

                    .setup-action-btn {
                        width: 100%;
                    }
                }
            </style>
        `;
    }

    /**
     * تعديل لون (تفتيح أو تغميق)
     */
    function adjustColor(color, amount) {
        const num = parseInt(color.replace('#', ''), 16);
        const r = Math.max(0, Math.min(255, (num >> 16) + amount));
        const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
        const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
        return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    }

    /**
     * ربط أحداث Modal
     */
    function bindModalEvents(steps) {
        // أزرار الإجراءات
        const actionBtns = enforcerModal.querySelectorAll('.setup-action-btn');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const action = btn.getAttribute('data-action');
                console.log('Action button clicked:', action);
                handleAction(action);
            });
        });

        // النقر على الخطوة نفسها
        const setupSteps = enforcerModal.querySelectorAll('.setup-step');
        setupSteps.forEach(step => {
            step.addEventListener('click', (e) => {
                // تجاهل النقر إذا كان على الزر نفسه
                if (e.target.closest('.setup-action-btn')) {
                    return;
                }
                const action = step.getAttribute('data-action');
                console.log('Step clicked:', action);
                handleAction(action);
            });
        });

        // منع الإغلاق عند النقر على الخلفية
        const backdrop = enforcerModal.querySelector('.enforcer-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', (e) => {
                e.preventDefault();
                // إضافة تأثير اهتزاز للتنبيه
                const container = enforcerModal.querySelector('.enforcer-container');
                if (container) {
                    container.style.animation = 'shake 0.5s ease';
                    setTimeout(() => {
                        container.style.animation = '';
                    }, 500);
                }
            });
        }
    }

    /**
     * معالجة الإجراء
     */
    function handleAction(action) {
        console.log('handleAction called with:', action);
        
        if (!action) {
            console.error('No action provided');
            return;
        }
        
        // إغلاق النافذة أولاً
        console.log('Closing modal...');
        closeModal();
        
        // الانتقال للقسم المناسب
        setTimeout(() => {
            console.log('Navigating to settings:', action);
            if (action === 'install') {
                navigateToSettings('pwa');
            } else if (action === 'notifications') {
                navigateToSettings('notifications');
            }
        }, 350);
    }

    /**
     * الانتقال لقسم الإعدادات
     */
    function navigateToSettings(section) {
        // إخفاء جميع الأقسام
        document.querySelectorAll('.admin-section').forEach(s => {
            s.style.display = 'none';
        });

        // عرض قسم الإعدادات
        const settingsSection = document.getElementById('settings-section');
        if (settingsSection) {
            settingsSection.style.display = 'block';
            
            // التمرير للقسم المطلوب
            setTimeout(() => {
                if (section === 'pwa') {
                    const pwaCard = settingsSection.querySelector('.card');
                    if (pwaCard) {
                        pwaCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        pwaCard.style.animation = 'highlight 1s ease';
                    }
                } else if (section === 'notifications') {
                    const notifCard = settingsSection.querySelectorAll('.card')[1];
                    if (notifCard) {
                        notifCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        notifCard.style.animation = 'highlight 1s ease';
                    }
                }
            }, 300);
        }

        // تحديث القائمة الجانبية
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === 'settings-section') {
                link.classList.add('active');
            }
        });
    }

    /**
     * إغلاق Modal
     */
    function closeModal() {
        console.log('closeModal called, enforcerModal:', enforcerModal);
        
        if (!enforcerModal) {
            console.warn('enforcerModal is null, cannot close');
            return;
        }

        console.log('Removing active class...');
        enforcerModal.classList.remove('active');
        
        setTimeout(() => {
            console.log('Removing modal from DOM...');
            if (enforcerModal && enforcerModal.parentNode) {
                enforcerModal.remove();
            }
            enforcerModal = null;
            console.log('Modal closed successfully');
        }, 300);
    }

    /**
     * تحديث حالة الإعداد من الخارج
     */
    function updateSetupStatus(updates) {
        setupStatus = { ...setupStatus, ...updates };
        saveSetupStatus();
        
        // إغلاق Modal إذا اكتمل الإعداد
        if (setupStatus.appInstalled && setupStatus.notificationsEnabled) {
            closeModal();
        }
    }

    // تصدير الوظائف
    window.appSetupEnforcer = {
        init,
        updateSetupStatus,
        showEnforcerModal,
        checkSetupStatus
    };

    // التهيئة التلقائية عند تحميل الصفحة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
