/**
 * نظام إدارة نادي أدِيب - لوحة التحكم الرئيسية
 */

(async function() {
    const sb = window.sbClient;
    let currentUser = null;
    let currentUserRole = null;
    let currentSection = 'dashboard';
    let chartsLoaded = false;

    // التحقق من المصادقة وتحميل البيانات
    async function init() {
        showLoading(true);
        
        try {
            // إعداد المستمعات مبكراً لضمان عمل زر القائمة حتى لو فشل تحميل البيانات
            setupEventListeners();

            // حماية الصفحة والتحقق من الصلاحيات (role_level = 3 لعضو لجنة)
            const authData = await window.AuthManager.protectPage(3);
            
            if (!authData) {
                showLoading(false);
                return;
            }
            
            currentUser = authData.user;
            currentUserRole = authData.role;
            
            // تحميل صلاحيات المستخدم
            if (window.PermissionsHelper) {
                await window.PermissionsHelper.loadUserPermissions(currentUser.id);
            }
            
            // تحديث واجهة المستخدم
            updateUserInfo();
            await buildNavigation();
            
            // تهيئة نظام الإشعارات
            if (window.notificationsManager) {
                await window.notificationsManager.init(currentUser);
            }
            
            // تهيئة نظام إرسال الإشعارات (لمن يملك manage_notifications)
            if (window.PermissionsHelper?.hasPermission('manage_notifications') && window.sendNotifications) {
                await window.sendNotifications.init(currentUser);
            }
            
            // فتح الصفحة الافتراضية (حسب تفضيلات المستخدم)
            const defaultLanding = window.settingsManager?.getDefaultLanding?.() || 'membership-card-section';
            navigateToSection(defaultLanding);
            
            showLoading(false);
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            showError('حدث خطأ أثناء تحميل لوحة التحكم');
            showLoading(false);
        }
    }

    // تحديث معلومات المستخدم في الهيدر
    function updateUserInfo() {
        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');
        const userAvatar = document.getElementById('userAvatar');
        const greetingText = document.getElementById('greetingText');
        
        // تحديد التحية حسب الوقت المحلي
        if (greetingText) {
            const currentHour = new Date().getHours();
            let greeting = '';
            
            if (currentHour >= 5 && currentHour < 12) {
                greeting = 'صباح الخير';
            } else if (currentHour >= 12 && currentHour < 17) {
                greeting = 'مساء الخير';
            } else if (currentHour >= 17 && currentHour < 21) {
                greeting = 'مساء الخير';
            } else {
                greeting = 'مساء الخير';
            }
            
            greetingText.textContent = greeting;
        }
        
        if (userName) userName.textContent = currentUser.full_name;
        if (userRole) userRole.textContent = currentUserRole.role_name_ar;
        
        if (userAvatar && currentUser.avatar_url) {
            userAvatar.src = currentUser.avatar_url;
        } else if (userAvatar) {
            userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.full_name)}&background=3d8fd6&color=fff`;
        }
    }

    // بناء القائمة الجانبية بناءً على الصلاحيات
    async function buildNavigation() {
        const nav = document.getElementById('mainNav');
        if (!nav) return;
        
        const menuItems = [];
        
        // دوال مساعدة للتحقق من الصلاحيات — المرجع الوحيد للتحكم في القائمة
        const hasPermission = (key) => window.PermissionsHelper?.hasPermission(key) || false;
        const hasAnyPermission = (keys) => window.PermissionsHelper?.hasAnyPermission(keys) || false;
        const roleName = currentUserRole.role_name;
        
        // بطاقة العضوية - جميع المستويات (أول تبويب)
        menuItems.push({
            id: 'membership-card',
            icon: 'fa-id-badge',
            label: 'بطاقة العضوية',
            section: 'membership-card-section'
        });
        
        // شجرة أدِيب — لمن يملك view_members أو view_pending_members
        if (hasAnyPermission(['view_members', 'view_pending_members', 'manage_member_data'])) {
            const adeebTreeSubItems = [];
            
            // أعضاء أديب — يحتاج view_members
            if (hasPermission('view_members')) {
                adeebTreeSubItems.push({
                    id: 'users',
                    icon: 'fa-users',
                    label: 'أعضاء أديب',
                    section: 'users-section'
                });
            }
            
            // الأعضاء المنتهية عضوياتهم — يحتاج view_members
            if (hasPermission('view_members')) {
                adeebTreeSubItems.push({
                    id: 'terminated-members',
                    icon: 'fa-user-xmark',
                    label: 'الأعضاء المنتهية عضوياتهم',
                    section: 'terminated-members-section'
                });
            }
            
            // غرفة العمليات الجراحية - باستخدام صلاحية manage_member_data
            if (hasPermission('manage_member_data')) {
                adeebTreeSubItems.push({
                    id: 'member-data-management',
                    icon: 'fa-user-gear',
                    label: 'غرفة العمليات الجراحية',
                    section: 'member-data-management-section'
                });
            }
            
            if (hasPermission('manage_positions')) {
                // إدارة الصلاحيات - لرئيس النادي فقط
                adeebTreeSubItems.push({
                    id: 'permissions',
                    icon: 'fa-shield-halved',
                    label: 'إدارة الصلاحيات',
                    section: 'permissions-section'
                });
            }
            
            // برج المراقبة - باستخدام صلاحية impersonate_users
            if (hasPermission('impersonate_users')) {
                adeebTreeSubItems.push({
                    id: 'impersonation',
                    icon: 'fa-user-secret',
                    label: 'برج المراقبة',
                    section: 'impersonation-section'
                });
            }
            
            // إدارة الأقسام واللجان - باستخدام صلاحية manage_committees
            if (hasPermission('manage_committees')) {
                adeebTreeSubItems.push({
                    id: 'committees',
                    icon: 'fa-sitemap',
                    label: 'إدارة الهيكلة',
                    section: 'committees-section'
                });
            }
            
            // الأعضاء المعلقين — يحتاج view_pending_members
            if (hasPermission('view_pending_members')) {
                adeebTreeSubItems.push({
                    id: 'pending-members',
                    icon: 'fa-clock',
                    label: 'الأعضاء المعلقين',
                    section: 'pending-members-section'
                });
            }
            
            if (adeebTreeSubItems.length === 0) return;
            menuItems.push({
                id: 'adeeb-tree',
                icon: 'fa-tree',
                label: 'شجرة أدِيب',
                isDropdown: true,
                subItems: adeebTreeSubItems
            });
        }
        
        // الانتخابات — يحتاج view_elections أو manage_elections
        if (hasAnyPermission(['view_elections', 'manage_elections'])) {
            const isElectionsAdmin = hasPermission('manage_elections');
            if (isElectionsAdmin) {
                menuItems.push({
                    id: 'elections',
                    icon: 'fa-check-to-slot',
                    label: 'الانتخابات',
                    isDropdown: true,
                    subItems: [
                        { id: 'elections-open',       icon: 'fa-door-open',       label: 'فتح باب انتخاب', section: 'elections-open' },
                        { id: 'elections-candidates', icon: 'fa-user-plus',       label: 'المرشحون',        section: 'elections-candidates' },
                        { id: 'elections-voting',     icon: 'fa-vote-yea',        label: 'إدارة التصويت',   section: 'elections-voting' },
                        { id: 'elections-results',    icon: 'fa-flag-checkered',  label: 'إعلان النتائج',   section: 'elections-results' },
                    ]
                });
            } else {
                menuItems.push({
                    id: 'elections',
                    icon: 'fa-hand-point-up',
                    label: 'ترشَّح الآن',
                    section: 'elections-section'
                });
            }
        }

        // إحصائيات الزيارات — يحتاج view_site_stats
        if (hasPermission('view_site_stats')) {
            menuItems.push({
                id: 'site-visits',
                icon: 'fa-chart-line',
                label: 'إحصائيات الزيارات',
                section: 'site-visits-section'
            });
        }
        
        // رسائل التواصل — يحتاج manage_contact
        if (hasPermission('manage_contact')) {
            menuItems.push({
                id: 'contact-messages',
                icon: 'fa-envelope',
                label: 'رسائل التواصل',
                section: 'contact-messages-section'
            });
        }
        
        // النشرة البريدية — يحتاج manage_newsletter
        if (hasPermission('manage_newsletter')) {
            menuItems.push({
                id: 'newsletter',
                icon: 'fa-envelope-open-text',
                label: 'النشرة البريدية',
                section: 'newsletter-section'
            });
        }
        
        // إدارة العضوية — لمن يملك أي صلاحية عضوية
        if (hasAnyPermission(['manage_registration', 'approve_applications', 'view_applications', 'manage_interviews', 'view_membership_archives'])) {
            const membershipSubItems = [];
            
            // باب التسجيل — يحتاج manage_registration
            const registrationSubItems = [];
            if (hasPermission('manage_registration')) {
                registrationSubItems.push({
                    id: 'membership-settings',
                    icon: 'fa-door-open',
                    label: 'فتح باب التسجيل',
                    section: 'membership-settings-section'
                });
                registrationSubItems.push({
                    id: 'membership-invitations',
                    icon: 'fa-envelope-open-text',
                    label: 'دعوات التسجيل',
                    section: 'membership-invitations-section'
                });
            }
            if (hasPermission('gift_membership')) {
                registrationSubItems.push({
                    id: 'gift-membership',
                    icon: 'fa-gift',
                    label: 'إهداء العضوية',
                    section: 'gift-membership-section'
                });
            }
            if (registrationSubItems.length > 0) {
                membershipSubItems.push({
                    id: 'registration-door',
                    icon: 'fa-door-open',
                    label: 'باب التسجيل',
                    isDropdown: true,
                    subItems: registrationSubItems
                });
            }
            
            // الفرز المبدئي — يحتاج view_applications أو approve_applications
            const sortingSubItems = [];
            if (hasPermission('view_applications')) {
                sortingSubItems.push({
                    id: 'membership-applications-view',
                    icon: 'fa-eye',
                    label: 'طلبات العضوية',
                    section: 'membership-applications-view-section'
                });
            }
            if (hasPermission('approve_applications')) {
                sortingSubItems.push({
                    id: 'membership-applications-review',
                    icon: 'fa-clipboard-check',
                    label: 'مراجعة الطلبات',
                    section: 'membership-applications-review-section'
                });
            }
            membershipSubItems.push({
                id: 'initial-sorting',
                icon: 'fa-filter',
                label: 'الفرز المبدئي',
                isDropdown: true,
                subItems: sortingSubItems
            });
            
            // المقابلات الشخصية — يحتاج manage_interviews
            if (hasPermission('manage_interviews')) {
                const interviewsSubItems = [
                    {
                        id: 'interview-sessions',
                        icon: 'fa-calendar-days',
                        label: 'جلسات المقابلات',
                        section: 'interview-sessions-section'
                    },
                    {
                        id: 'membership-interviews',
                        icon: 'fa-calendar-check',
                        label: 'المقابلات',
                        section: 'membership-interviews-section'
                    },
                    {
                        id: 'membership-barzakh',
                        icon: 'fa-hourglass-half',
                        label: 'البرزخ',
                        section: 'membership-barzakh-section'
                    }
                ];
                membershipSubItems.push({
                    id: 'personal-interviews',
                    icon: 'fa-comments',
                    label: 'المقابلات الشخصية',
                    isDropdown: true,
                    subItems: interviewsSubItems
                });
            }
            
            // نتائج العضوية - عنصر مباشر
            membershipSubItems.push({
                id: 'membership-accepted',
                icon: 'fa-user-check',
                label: 'نتائج العضوية',
                section: 'membership-accepted-section'
            });
            
            // ترحيل المقبولين - عنصر مباشر
            membershipSubItems.push({
                id: 'member-migration',
                icon: 'fa-users-gear',
                label: 'ترحيل المقبولين',
                section: 'member-migration-section'
            });
            
            // أرشيف التسجيل — يحتاج view_membership_archives
            if (hasPermission('view_membership_archives')) {
                membershipSubItems.push({
                    id: 'membership-archives',
                    icon: 'fa-box-archive',
                    label: 'أرشيف التسجيل',
                    section: 'membership-archives-section'
                });
            }
            
            menuItems.push({
                id: 'membership',
                icon: 'fa-user-plus',
                label: 'إدارة العضوية',
                isDropdown: true,
                subItems: membershipSubItems
            });
        }
        
        // إدارة الاستبيانات — يحتاج manage_surveys
        if (hasPermission('manage_surveys')) {
            const surveysSubItems = [
                {
                    id: 'surveys-all',
                    icon: 'fa-list',
                    label: 'استبياناتي',
                    section: 'surveys-all-section'
                },
                {
                    id: 'surveys-create',
                    icon: 'fa-plus-circle',
                    label: 'إنشاء استبيان',
                    section: 'surveys-create-section'
                },
                {
                    id: 'surveys-archived',
                    icon: 'fa-box-archive',
                    label: 'الاستبيانات المؤرشفة',
                    section: 'surveys-archived-section'
                },
                {
                    id: 'surveys-deleted',
                    icon: 'fa-trash',
                    label: 'الاستبيانات المحذوفة',
                    section: 'surveys-deleted-section'
                }
            ];
            
            menuItems.push({
                id: 'surveys',
                icon: 'fa-solid fa-clipboard-list',
                label: 'استبيانات أدِيب',
                isDropdown: true,
                subItems: surveysSubItems
            });
        }

        // أنشطة وبرامج — يحتاج manage_activities
        if (hasPermission('manage_activities')) {
            menuItems.push({
                id: 'activities',
                icon: 'fa-calendar-days',
                label: 'أنشطة وبرامج',
                isDropdown: true,
                subItems: [
                    { id: 'activities-list',         icon: 'fa-list',           label: 'جميع الأنشطة',  section: 'activities-list-section' },
                    { id: 'activities-create',       icon: 'fa-plus-circle',    label: 'إنشاء نشاط',    section: 'activities-create-section' },
                    { id: 'activities-reservations', icon: 'fa-calendar-check', label: 'إدارة الحجوزات', section: 'activities-reservations-section' },
                    { id: 'activities-visitors',     icon: 'fa-users',          label: 'بيانات الزوار',  section: 'activities-visitors-section' },
                ],
            });
        }

        // الأخبار - نظام متعدد التبويبات
        // استخدام نظام الصلاحيات الجديد
        const REPORTS_COMMITTEE_ID = 18; // معرف لجنة التقارير والأرشفة
        const isReportsCommittee = currentUserRole.committee_id === REPORTS_COMMITTEE_ID;
        const isReportsLeader = isReportsCommittee && currentUserRole.role_name === 'committee_leader';
        const canManageNews = hasAnyPermission(['manage_news', 'publish_news', 'instant_publish']) || isReportsLeader;

        if (canManageNews) {
            const newsSubItems = [
                {
                    id: 'news-drafts',
                    icon: 'fa-file-lines',
                    label: 'مسودات الأخبار',
                    section: 'news-drafts-section'
                },
                {
                    id: 'news-in-progress',
                    icon: 'fa-pen-to-square',
                    label: 'قيد الكتابة',
                    section: 'news-in-progress-section'
                },
                {
                    id: 'news-review',
                    icon: 'fa-clipboard-check',
                    label: 'جاهز للمراجعة',
                    section: 'news-review-section'
                }
            ];

            // إضافة تبويب النشر الفوري — يحتاج instant_publish أو قائدة لجنة التقارير والأرشفة
            if (hasPermission('instant_publish') || isReportsLeader) {
                newsSubItems.push({
                    id: 'news-instant-publish',
                    icon: 'fa-bolt',
                    label: 'نشر فوري',
                    section: 'news-instant-publish-section'
                });
            }

            newsSubItems.push(
                {
                    id: 'news-published',
                    icon: 'fa-newspaper',
                    label: 'الأخبار المنشورة',
                    section: 'news-published-section'
                },
                {
                    id: 'news-archived',
                    icon: 'fa-archive',
                    label: 'الأخبار المؤرشفة',
                    section: 'news-archived-section'
                }
            );
            
            menuItems.push({
                id: 'news',
                icon: 'fa-newspaper',
                label: 'الأخبار',
                isDropdown: true,
                subItems: newsSubItems
            });
        }
        
        // الأخبار المعينة لي - لأعضاء لجنة التقارير والأرشفة فقط (ما عدا القائد ورئيس النادي ورئيس المجلس التنفيذي)
        // النائب يستقبل تعيينات، القائد لا يستقبل
        const isReportsDeputy = isReportsCommittee && currentUserRole.role_name === 'deputy_committee_leader';
        const isReportsMember = isReportsCommittee && currentUserRole.role_name === 'committee_member';
        const canReceiveAssignments = isReportsDeputy || isReportsMember;
        
        if (canReceiveAssignments) {
            menuItems.push({
                id: 'news-my-assignments',
                icon: 'fa-pen-fancy',
                label: 'الأخبار المعينة لي',
                section: 'news-my-assignments-section'
            });
        }

        // إدارة الموقع — يحتاج manage_website
        if (hasPermission('manage_website')) {
            const websiteSubItems = [
                {
                    id: 'website-works',
                    icon: 'fa-briefcase',
                    label: 'أعمالنا',
                    section: 'website-works-section'
                },
                {
                    id: 'website-achievements',
                    icon: 'fa-trophy',
                    label: 'الإنجازات',
                    section: 'website-achievements-section'
                },
                {
                    id: 'website-sponsors',
                    icon: 'fa-handshake',
                    label: 'الشركاء',
                    section: 'website-sponsors-section'
                },
                {
                    id: 'website-faq',
                    icon: 'fa-circle-question',
                    label: 'الأسئلة الشائعة',
                    section: 'website-faq-section'
                }
            ];
            
            menuItems.push({
                id: 'website',
                icon: 'fa-globe',
                label: 'إدارة الموقع',
                isDropdown: true,
                subItems: websiteSubItems
            });
        }
        
        // الإعدادات - جميع المستويات
        menuItems.push({
            id: 'settings',
            icon: 'fa-gear',
            label: 'الإعدادات',
            section: 'settings-section'
        });

        // الملف الشخصي - جميع المستويات
        menuItems.push({
            id: 'profile',
            icon: 'fa-user-circle',
            label: 'الملف الشخصي',
            section: 'profile-section'
        });

        // لجنتي — لكل من ينتمي للجنة (له committee_id) ما عدا رئيس النادي ورئيس المجلس التنفيذي
        if (currentUserRole.committee_id &&
            roleName !== 'club_president' &&
            roleName !== 'executive_council_president') {
            menuItems.push({
                id: 'my-committee',
                icon: 'fa-users',
                label: 'لجنتي',
                section: 'my-committee-section'
            });
        }

        // دالة مساعدة لبناء عناصر القائمة (تدعم التداخل)
        function buildMenuItem(subItem) {
            if (subItem.isDropdown) {
                // قائمة منسدلة متداخلة
                return `
                    <div class="nav-dropdown-item-nested" data-nested-dropdown="${subItem.id}">
                        <a href="#" class="nav-dropdown-item" data-nested-toggle="${subItem.id}">
                            <i class="fa-solid ${subItem.icon}"></i>
                            <span>${subItem.label}</span>
                            <i class="fa-solid fa-chevron-left nested-arrow"></i>
                        </a>
                        <div class="nav-nested-menu">
                            ${subItem.subItems.map(nestedItem => `
                                <a href="#" class="nav-nested-item" data-section="${nestedItem.section}">
                                    <i class="fa-solid ${nestedItem.icon}"></i>
                                    <span>${nestedItem.label}</span>
                                </a>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else {
                // عنصر عادي
                return `
                    <a href="#" class="nav-dropdown-item" data-section="${subItem.section}">
                        <i class="fa-solid ${subItem.icon}"></i>
                        <span>${subItem.label}</span>
                    </a>
                `;
            }
        }
        
        // بناء القائمة
        nav.innerHTML = menuItems.map(item => {
            if (item.isDropdown) {
                // عنصر قائمة منسدلة
                return `
                    <div class="nav-item-dropdown" data-dropdown="${item.id}">
                        <a href="#" class="nav-item" data-dropdown-toggle="${item.id}">
                            <i class="fa-solid ${item.icon}"></i>
                            <span>${item.label}</span>
                        </a>
                        <div class="nav-dropdown-menu">
                            ${item.subItems.map(subItem => buildMenuItem(subItem)).join('')}
                        </div>
                    </div>
                `;
            } else {
                // عنصر قائمة عادي
                return `
                    <a href="#" class="nav-item ${item.id === 'membership-card' ? 'active' : ''}" data-section="${item.section}">
                        <i class="fa-solid ${item.icon}"></i>
                        <span>${item.label}</span>
                    </a>
                `;
            }
        }).join('');
        
        // إضافة مستمعات التنقل للعناصر العادية
        nav.querySelectorAll('.nav-item:not([data-dropdown-toggle])').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                navigateToSection(section);
            });
        });
        
        // إضافة مستمعات للقوائم المنسدلة
        nav.querySelectorAll('[data-dropdown-toggle]').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                const dropdownId = toggle.dataset.dropdownToggle;
                const dropdown = nav.querySelector(`[data-dropdown="${dropdownId}"]`);
                
                // إغلاق جميع القوائم المنسدلة الأخرى
                nav.querySelectorAll('.nav-item-dropdown').forEach(d => {
                    if (d !== dropdown) {
                        d.classList.remove('open');
                    }
                });
                
                // تبديل حالة القائمة الحالية
                dropdown.classList.toggle('open');
            });
        });
        
        // إضافة مستمعات للقوائم المتداخلة
        nav.querySelectorAll('[data-nested-toggle]').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const nestedId = toggle.dataset.nestedToggle;
                const nestedDropdown = toggle.closest('.nav-dropdown-item-nested');
                
                // إغلاق القوائم المتداخلة الأخرى في نفس المستوى
                const parent = nestedDropdown.parentElement;
                parent.querySelectorAll('.nav-dropdown-item-nested').forEach(d => {
                    if (d !== nestedDropdown) {
                        d.classList.remove('open');
                    }
                });
                
                // تبديل حالة القائمة المتداخلة الحالية
                nestedDropdown.classList.toggle('open');
            });
        });
        
        // إضافة مستمعات للعناصر المتداخلة
        nav.querySelectorAll('.nav-nested-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                navigateToSection(section);
            });
        });
        
        // إضافة مستمعات للعناصر الفرعية (غير المتداخلة)
        nav.querySelectorAll('.nav-dropdown-item:not([data-nested-toggle])').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                navigateToSection(section);
            });
        });
    }

    // خريطة الأقسام المحمية: sectionId → الصلاحية المطلوبة
    const PROTECTED_SECTIONS = {
        'users-section':                        'view_members',
        'terminated-members-section':           'view_members',
        'pending-members-section':              'view_pending_members',
        'impersonation-section':                'impersonate_users',
        'member-data-management-section':       'manage_member_data',
        'permissions-section':                  'manage_positions',
        'committees-section':                   'manage_committees',
        'site-visits-section':                  'view_site_stats',
        'contact-messages-section':             'manage_contact',
        'newsletter-section':                   'manage_newsletter',
        'membership-settings-section':          'manage_registration',
        'membership-invitations-section':       'manage_registration',
        'gift-membership-section':              'gift_membership',
        'membership-applications-view-section': 'view_applications',
        'membership-applications-review-section':'approve_applications',
        'interview-sessions-section':           'manage_interviews',
        'membership-interviews-section':        'manage_interviews',
        'membership-barzakh-section':           'manage_interviews',
        'membership-archives-section':          'view_membership_archives',
        'member-migration-section':             'approve_applications',
        'surveys-all-section':                  'manage_surveys',
        'surveys-create-section':               'manage_surveys',
        'surveys-results-section':              'manage_surveys',
        'surveys-archived-section':             'manage_surveys',
        'surveys-deleted-section':              'manage_surveys',
        'website-works-section':                'manage_website',
        'website-achievements-section':         'manage_website',
        'website-sponsors-section':             'manage_website',
        'website-faq-section':                  'manage_website',
        'elections-section':                    'view_elections',
        'elections-open':                       'manage_elections',
        'elections-open-section':               'manage_elections',
        'elections-candidates':                 'manage_elections',
        'elections-voting':                     'manage_elections',
        'elections-results':                    'manage_elections',
        'activities-list-section':              'manage_activities',
        'activities-create-section':            'manage_activities',
        'activities-reservations-section':      'manage_activities',
        'activities-visitors-section':          'manage_activities',
    };

    // خريطة مراحل الانتخابات: كل مرحلة لها قسم HTML منفصل أو فلتر مسبق
    const ELECTIONS_STAGE_MAP = {
        'elections-open':       { realSection: 'elections-open-section' },
        'elections-candidates': { realSection: 'elections-section', filter: 'candidacy_open' },
        'elections-voting':     { realSection: 'elections-section', filter: 'voting_open' },
        'elections-results':    { realSection: 'elections-section', filter: 'completed' },
    };

    // التنقل بين الأقسام
    // مكشوفة على window حتى تتمكّن الموديولات الأخرى من التنقّل برمجياً
    // (مثلاً زر "النتائج" داخل كارد استبيان في surveys-manager.js)
    window.navigateToSection = navigateToSection;
    function navigateToSection(sectionId) {
        // التحقق من مراحل الانتخابات (virtual section IDs)
        const elStage = ELECTIONS_STAGE_MAP[sectionId];
        const realSectionId = elStage ? elStage.realSection : sectionId;

        // حفظ فلتر المرحلة إذا كانت من مراحل الانتخابات
        if (elStage) {
            window.electionsStageFilter = elStage.filter;
        } else if (!sectionId.startsWith('elections-')) {
            window.electionsStageFilter = null;
        }

        // التحقق من الصلاحية إذا كان القسم محمياً
        const requiredPermission = PROTECTED_SECTIONS[sectionId] || PROTECTED_SECTIONS[realSectionId];
        if (requiredPermission) {
            const allowed = window.PermissionsHelper?.hasPermission(requiredPermission) || false;
            if (!allowed) {
                console.warn(`[Security] Blocked access to ${sectionId} — requires: ${requiredPermission}`);
                navigateToSection('membership-card-section');
                return;
            }
        }

        // إخفاء جميع الأقسام
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.add('d-none');
        });

        // إظهار القسم الحقيقي المطلوب
        const targetSection = document.getElementById(realSectionId);
        if (targetSection) {
            targetSection.classList.remove('d-none');
        }

        // تحديث القائمة النشطة
        document.querySelectorAll('.nav-item:not([data-dropdown-toggle])').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelectorAll('.nav-dropdown-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelectorAll('.nav-nested-item').forEach(item => {
            item.classList.remove('active');
        });

        // تفعيل العنصر المناسب (باستخدام الـ sectionId الأصلي للتمييز بين المراحل)
        const activeItem = document.querySelector(`[data-section="${sectionId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');

            // إذا كان العنصر داخل قائمة منسدلة، افتح القائمة
            const parentDropdown = activeItem.closest('.nav-item-dropdown');
            if (parentDropdown) {
                parentDropdown.classList.add('open');
            }
        }

        // إعادة scroll للبداية
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.scrollTop = 0;
        }
        window.scrollTo(0, 0);

        // تحميل بيانات القسم الحقيقي
        loadSectionData(realSectionId);

        // إغلاق القائمة الجانبية عندما تكون في وضع الطي
        if (window.innerWidth <= 1145) {
            document.getElementById('sidebar')?.classList.remove('active');
            document.getElementById('overlay')?.classList.remove('active');
            document.body.style.overflow = '';
        }
    }


    // تحميل بيانات القسم
    async function loadSectionData(sectionId) {
        switch(sectionId) {
            case 'pending-members-section':
                if (window.PendingMembersManager && !window.pendingMembersManagerInstance) {
                    window.pendingMembersManagerInstance = new window.PendingMembersManager();
                }
                if (window.pendingMembersManagerInstance) {
                    await window.pendingMembersManagerInstance.init('pendingMembersContainer');
                }
                break;
            case 'users-section':
                if (window.UsersManager && !window.usersManagerInstance) {
                    window.usersManagerInstance = new window.UsersManager();
                }
                if (window.usersManagerInstance) {
                    await window.usersManagerInstance.init();
                }
                break;
            case 'terminated-members-section':
                await loadTerminatedMembersSection();
                break;
            case 'impersonation-section':
                if (window.ImpersonationManager) {
                    await window.ImpersonationManager.initImpersonationPage();
                }
                break;
            case 'committees-section':
                window.loadCouncils = loadCouncils;
                window.loadDepartments = loadDepartments;
                window.loadCommittees = loadCommittees;
                window.loadAdminCommittees = loadAdminCommittees;
                await Promise.all([loadCouncils(), loadDepartments(), loadCommittees(), loadAdminCommittees(), loadCommitteesStats()]);
                break;
            case 'contact-messages-section':
                if (window.ContactMessagesManager) {
                    if (!window.contactMessagesManager) {
                        window.contactMessagesManager = new window.ContactMessagesManager();
                        await window.contactMessagesManager.init();
                    } else {
                        // إعادة تحميل البيانات إذا كان الـ manager موجود
                        await window.contactMessagesManager.loadMessages();
                    }
                }
                break;
            case 'newsletter-section':
                if (window.NewsletterManager) {
                    if (!window.newsletterManager) {
                        window.newsletterManager = new window.NewsletterManager();
                        await window.newsletterManager.init();
                    } else {
                        // إعادة تحميل البيانات إذا كان الـ manager موجود
                        await window.newsletterManager.loadSubscribers();
                    }
                }
                break;
            case 'membership-settings-section':
                if (window.membershipManager) {
                    await window.membershipManager.init(currentUser);
                }
                break;
            case 'membership-invitations-section':
                if (window.invitationsManager) {
                    await window.invitationsManager.init(currentUser);
                }
                break;
            case 'member-data-management-section':
                if (window.memberDataManager) {
                    await window.memberDataManager.init();
                }
                break;
            case 'permissions-section':
                if (window.initPermissionsSection) {
                    await window.initPermissionsSection();
                }
                break;
            case 'membership-applications-view-section':
                if (window.membershipManager) {
                    await window.membershipManager.loadApplicationsView();
                }
                break;
            case 'membership-applications-review-section':
                if (window.membershipManager) {
                    await window.membershipManager.loadApplicationsReview(currentUser);
                }
                break;
            case 'membership-archives-section':
                if (window.archivesManager) {
                    await window.archivesManager.init(currentUser);
                }
                break;
            case 'interview-sessions-section':
                if (window.interviewSessionsManager) {
                    await window.interviewSessionsManager.init(currentUser);
                }
                break;
            case 'membership-interviews-section':
                if (window.membershipManager) {
                    await window.membershipManager.loadInterviews();
                }
                break;
            case 'membership-barzakh-section':
                if (window.membershipManager) {
                    await window.membershipManager.loadBarzakh();
                }
                break;
            case 'membership-accepted-section':
                if (window.membershipDecisions) {
                    await window.membershipDecisions.load();
                }
                break;
            case 'member-migration-section':
                if (window.memberMigration) {
                    await window.memberMigration.init(currentUser);
                }
                break;
            case 'my-committee-section':
                if (window.profileManager) {
                    await window.profileManager.init(currentUser);
                }
                if (window.CommitteeMembersManager && !window.committeeMembersManager) {
                    window.committeeMembersManager = new window.CommitteeMembersManager();
                }
                break;
            case 'membership-card-section':
            case 'profile-section':
                if (window.profileManager) {
                    await window.profileManager.init(currentUser);
                }
                break;
            case 'website-works-section':
                await loadWebsiteWorksSection();
                break;
            case 'website-achievements-section':
                await loadWebsiteAchievementsSection();
                break;
            case 'website-sponsors-section':
                await loadWebsiteSponsorsSection();
                break;
            case 'website-faq-section':
                await loadWebsiteFaqSection();
                break;
            case 'profile-section':
                if (window.profileManager) {
                    await window.profileManager.init(currentUser);
                }
                break;
            case 'website-news-section':
                if (window.NewsManager && currentUser) {
                    await window.NewsManager.init(currentUser);
                }
                break;
            case 'news-drafts-section':
                if (window.NewsManagerEnhanced && currentUser) {
                    await window.NewsManagerEnhanced.init(currentUser, currentUserRole);
                }
                if (window.NewsDraftEditor && currentUser) {
                    await window.NewsDraftEditor.init(currentUser, currentUserRole);
                }
                break;
            case 'news-in-progress-section':
                if (window.NewsManagerEnhanced && currentUser) {
                    await window.NewsManagerEnhanced.init(currentUser, currentUserRole);
                }
                break;
            case 'news-review-section':
                if (window.NewsManagerEnhanced && currentUser) {
                    await window.NewsManagerEnhanced.init(currentUser, currentUserRole);
                }
                break;
            case 'news-published-section':
                if (window.NewsManagerEnhanced && currentUser) {
                    await window.NewsManagerEnhanced.init(currentUser, currentUserRole);
                }
                break;
            case 'news-archived-section':
                if (window.NewsManagerEnhanced && currentUser) {
                    await window.NewsManagerEnhanced.init(currentUser, currentUserRole);
                }
                break;
            case 'news-my-assignments-section':
                if (window.NewsWritersManager && currentUser) {
                    await window.NewsWritersManager.init(currentUser);
                }
                break;
            case 'news-instant-publish-section':
                await initInstantPublishSection();
                break;
            case 'website-works-section':
                if (window.WorksManager && currentUser) {
                    await window.WorksManager.init(currentUser);
                }
                break;
            case 'website-sponsors-section':
                if (window.SponsorsManager && currentUser) {
                    await window.SponsorsManager.init(currentUser);
                }
                break;
            case 'site-visits-section':
                await loadSiteVisitsSection();
                break;
            case 'surveys-all-section':
                if (window.surveysManager) {
                    if (currentUser) await window.surveysManager.init(currentUser);
                    await window.surveysManager.loadAllSurveys();
                }
                break;
            case 'surveys-create-section':
                if (window.surveysManager) {
                    if (currentUser) await window.surveysManager.init(currentUser);
                    await window.surveysManager.showCreateForm();
                }
                break;
            case 'surveys-results-section':
                if (window.resultsAnalytics) {
                    if (currentUser && window.surveysManager) {
                        await window.surveysManager.init(currentUser);
                    }
                    await window.resultsAnalytics.init();
                }
                break;
            case 'surveys-archived-section':
                if (window.surveysManager) {
                    if (currentUser) await window.surveysManager.init(currentUser);
                    await loadArchivedSurveysSection();
                }
                break;
            case 'surveys-deleted-section':
                if (window.surveysManager) {
                    if (currentUser) await window.surveysManager.init(currentUser);
                    await loadDeletedSurveysSection();
                }
                break;
            case 'settings-section':
                loadSettingsSection();
                break;

            case 'elections-open-section':
                if (window.ElectionsManager && !window.electionsManagerInstance) {
                    window.electionsManagerInstance = new window.ElectionsManager();
                }
                if (window.electionsManagerInstance) {
                    await window.electionsManagerInstance.initOpenSection();
                }
                break;

            case 'elections-section':
                if (window.ElectionsManager && !window.electionsManagerInstance) {
                    window.electionsManagerInstance = new window.ElectionsManager();
                }
                if (window.electionsManagerInstance) {
                    await window.electionsManagerInstance.init();
                    // إظهار زر الإنشاء لمن يملك الصلاحية
                    const createBtn = document.getElementById('createElectionBtn');
                    if (createBtn && window.PermissionsHelper?.hasPermission('manage_elections')) {
                        createBtn.style.display = '';
                    }
                    // تطبيق فلتر مرحلة الانتخاب إذا تم التنقل من dropdown المراحل
                    if (window.electionsStageFilter !== null && window.electionsStageFilter !== undefined) {
                        const filterSelect = document.getElementById('electionsStatusFilter');
                        if (filterSelect) {
                            filterSelect.value = window.electionsStageFilter;
                            filterSelect.dispatchEvent(new Event('change'));
                        }
                        window.electionsStageFilter = null;
                    }
                }
                break;

            case 'activities-list-section':
                if (window.ActivitiesManager && !window.activitiesManagerInstance) {
                    window.activitiesManagerInstance = new window.ActivitiesManager();
                }
                if (window.activitiesManagerInstance) {
                    await window.activitiesManagerInstance.init(currentUser);
                    await window.activitiesManagerInstance.loadActivitiesList();
                }
                break;

            case 'activities-create-section':
                if (window.ActivitiesManager && !window.activitiesManagerInstance) {
                    window.activitiesManagerInstance = new window.ActivitiesManager();
                }
                if (window.activitiesManagerInstance) {
                    await window.activitiesManagerInstance.init(currentUser);
                    if (typeof window.activitiesManagerInstance.showCreateForm === 'function') {
                        window.activitiesManagerInstance.showCreateForm();
                    }
                }
                break;

            case 'activities-reservations-section':
                if (window.ActivitiesManager && !window.activitiesManagerInstance) {
                    window.activitiesManagerInstance = new window.ActivitiesManager();
                }
                if (window.activitiesManagerInstance) {
                    await window.activitiesManagerInstance.init(currentUser);
                    await window.activitiesManagerInstance.loadReservations();
                }
                break;

            case 'activities-visitors-section':
                if (window.ActivitiesManager && !window.activitiesManagerInstance) {
                    window.activitiesManagerInstance = new window.ActivitiesManager();
                }
                if (window.activitiesManagerInstance) {
                    await window.activitiesManagerInstance.init(currentUser);
                    await window.activitiesManagerInstance.loadVisitors();
                }
                break;
        }
    }

    // ─── تهيئة تبويبات الإعدادات (محدود النطاق) ───
    function initSettingsTabs() {
        const container = document.getElementById('settingsTabsContainer');
        if (!container || container._tabsInitialized) return;
        container._tabsInitialized = true;

        const tabButtons = container.querySelectorAll('.settings-seg-btn');
        const tabContents = container.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetTab = button.getAttribute('data-tab');

                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    content.style.display = 'none';
                });

                button.classList.add('active');
                const targetContent = document.getElementById(`${targetTab}-tab`);
                if (targetContent) {
                    targetContent.classList.add('active');
                    targetContent.style.display = 'block';
                }
            });
        });
    }

    // ─── تحميل قسم الإعدادات ───
    function loadSettingsSection() {
        // تهيئة التبويبات
        initSettingsTabs();

        // ══════ تبويب: عام ══════
        const nameEl = document.getElementById('settingsFullName');
        const emailEl = document.getElementById('settingsEmail');
        const roleEl = document.getElementById('settingsRole');
        if (nameEl && currentUser) nameEl.textContent = currentUser.full_name || '—';
        if (emailEl && currentUser) emailEl.textContent = currentUser.email || '—';
        if (roleEl && currentUserRole) roleEl.textContent = currentUserRole.role_name_ar || '—';

        // الصفحة الافتراضية
        const landingSelect = document.getElementById('settingsDefaultLanding');
        if (landingSelect && !landingSelect._bound) {
            landingSelect._bound = true;
            const savedLanding = window.settingsManager?.getDefaultLanding?.() || 'membership-card-section';
            landingSelect.value = savedLanding;
            landingSelect.addEventListener('change', () => {
                window.settingsManager?.setDefaultLanding?.(landingSelect.value);
                window.showToast?.('تم حفظ الصفحة الافتراضية', 'success');
            });
        }

        // ══════ تبويب: الأمان ══════
        // زر تغيير كلمة المرور
        const changePassBtn = document.getElementById('settingsChangePasswordBtn');
        if (changePassBtn && !changePassBtn._bound) {
            changePassBtn._bound = true;
            changePassBtn.addEventListener('click', async () => {
                const newPass = document.getElementById('settingsNewPassword')?.value?.trim();
                const confirmPass = document.getElementById('settingsConfirmPassword')?.value?.trim();
                if (!newPass || !confirmPass) {
                    window.showToast?.('يرجى تعبئة حقول كلمة المرور', 'warning');
                    return;
                }
                if (newPass !== confirmPass) {
                    window.showToast?.('كلمتا المرور غير متطابقتين', 'error');
                    return;
                }
                if (newPass.length < 8) {
                    window.showToast?.('كلمة المرور يجب أن تكون 8 أحرف على الأقل', 'warning');
                    return;
                }
                changePassBtn.disabled = true;
                changePassBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...';
                const { error } = await window.sbClient.auth.updateUser({ password: newPass });
                changePassBtn.disabled = false;
                changePassBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> حفظ كلمة المرور';
                if (error) {
                    window.showToast?.('حدث خطأ أثناء تغيير كلمة المرور', 'error');
                } else {
                    window.showToast?.('تم تغيير كلمة المرور بنجاح', 'success');
                    document.getElementById('settingsCurrentPassword').value = '';
                    document.getElementById('settingsNewPassword').value = '';
                    document.getElementById('settingsConfirmPassword').value = '';
                }
            });
        }

        // سجل تسجيل الدخول
        const loginHistoryEl = document.getElementById('settingsLoginHistory');
        if (loginHistoryEl && currentUser) {
            const lastSign = currentUser.last_sign_in_at;
            if (lastSign) {
                const formatted = new Intl.DateTimeFormat('ar-SA', {
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                }).format(new Date(lastSign));
                loginHistoryEl.innerHTML = `
                    <div style="display:flex; align-items:center; gap:0.75rem; padding:0.75rem; background:var(--bg-secondary,#f8fafc); border-radius:0.5rem; border-right:3px solid var(--color-primary-light,#3d8fd6);">
                        <i class="fa-solid fa-circle-check" style="color:var(--color-success,#10b981);"></i>
                        <div>
                            <div style="font-size:0.85rem; font-weight:600; color:var(--text-primary);">آخر تسجيل دخول</div>
                            <div style="font-size:0.8rem; color:var(--text-muted);">${formatted}</div>
                        </div>
                    </div>
                `;
            } else {
                loginHistoryEl.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">لا توجد بيانات</p>';
            }
        }

        // معلومات المتصفح
        const browserEl = document.getElementById('settingsBrowser');
        if (browserEl) {
            const ua = navigator.userAgent;
            let browser = 'غير معروف';
            if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Google Chrome';
            else if (ua.includes('Firefox')) browser = 'Mozilla Firefox';
            else if (ua.includes('Edg')) browser = 'Microsoft Edge';
            else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Apple Safari';
            browserEl.textContent = browser;
        }

        // نظام التشغيل
        const osEl = document.getElementById('settingsOS');
        if (osEl) {
            const ua = navigator.userAgent;
            let os = 'غير معروف';
            if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
            else if (ua.includes('Windows')) os = 'Windows';
            else if (ua.includes('Mac OS X')) os = 'macOS';
            else if (ua.includes('Linux')) os = 'Linux';
            else if (ua.includes('Android')) os = 'Android';
            else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
            osEl.textContent = os;
        }

        // دقة الشاشة
        const screenEl = document.getElementById('settingsScreenRes');
        if (screenEl) {
            screenEl.textContent = `${screen.width} × ${screen.height}`;
        }

        // ══════ تبويب: الإشعارات ══════
        const notifPrefs = window.settingsManager?.getNotificationSettings?.() ||
            { membership: true, messages: true, activities: false, sound: true, desktop: false };

        const notifMap = {
            notifMembership: notifPrefs.membership,
            notifMessages: notifPrefs.messages,
            notifActivities: notifPrefs.activities,
            notifSound: notifPrefs.sound,
            notifDesktop: notifPrefs.desktop
        };
        Object.entries(notifMap).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el) el.checked = val ?? false;
        });

        const saveNotifBtn = document.getElementById('settingsSaveNotificationsBtn');
        if (saveNotifBtn && !saveNotifBtn._bound) {
            saveNotifBtn._bound = true;
            saveNotifBtn.addEventListener('click', () => {
                const settings = {
                    membership: document.getElementById('notifMembership')?.checked ?? true,
                    messages: document.getElementById('notifMessages')?.checked ?? true,
                    activities: document.getElementById('notifActivities')?.checked ?? false,
                    sound: document.getElementById('notifSound')?.checked ?? true,
                    desktop: document.getElementById('notifDesktop')?.checked ?? false
                };
                window.settingsManager?.saveNotificationSettings?.(settings);

                // طلب إذن إشعارات سطح المكتب
                if (settings.desktop && 'Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                    Notification.requestPermission();
                }

                window.showToast?.('تم حفظ إعدادات الإشعارات', 'success');
            });
        }

        // ══════ تبويب: المظهر ══════
        // حجم الخط
        const savedFontSize = localStorage.getItem(window.settingsManager?.STORAGE_KEYS?.fontSize) || 'medium';
        const fontRadio = document.querySelector(`input[name="settingsFontSize"][value="${savedFontSize}"]`);
        if (fontRadio) fontRadio.checked = true;

        // الوضع المضغوط
        const compactEl = document.getElementById('settingsCompactMode');
        if (compactEl) compactEl.checked = localStorage.getItem(window.settingsManager?.STORAGE_KEYS?.compactMode) === 'true';

        // القائمة الجانبية
        const savedSidebar = window.settingsManager?.getSidebarDefault?.() || 'expanded';
        const sidebarRadio = document.querySelector(`input[name="settingsSidebar"][value="${savedSidebar}"]`);
        if (sidebarRadio) sidebarRadio.checked = true;

        const saveAppearanceBtn = document.getElementById('settingsSaveAppearanceBtn');
        if (saveAppearanceBtn && !saveAppearanceBtn._bound) {
            saveAppearanceBtn._bound = true;
            saveAppearanceBtn.addEventListener('click', () => {
                const KEYS = window.settingsManager?.STORAGE_KEYS;
                if (!KEYS) return;

                // حفظ حجم الخط
                const fontSize = document.querySelector('input[name="settingsFontSize"]:checked')?.value || 'medium';
                localStorage.setItem(KEYS.fontSize, fontSize);
                window.settingsManager?.applyFontSize?.();

                // حفظ الوضع المضغوط
                const compact = document.getElementById('settingsCompactMode')?.checked ?? false;
                localStorage.setItem(KEYS.compactMode, compact);
                window.settingsManager?.applyCompactMode?.();

                // حفظ حالة القائمة الجانبية
                const sidebar = document.querySelector('input[name="settingsSidebar"]:checked')?.value || 'expanded';
                localStorage.setItem(KEYS.sidebarDefault, sidebar);

                window.showToast?.('تم حفظ إعدادات المظهر', 'success');
            });
        }

        // ══════ تبويب: حول النظام ══════
        // تاريخ آخر تحديث
        const lastUpdateEl = document.getElementById('settingsLastUpdate');
        if (lastUpdateEl) {
            lastUpdateEl.textContent = new Intl.DateTimeFormat('ar-SA', {
                year: 'numeric', month: 'long', day: 'numeric'
            }).format(new Date());
        }

        // إصدار النظام
        const versionEl = document.getElementById('settingsVersion');
        if (versionEl && window.CURRENT_VERSION) {
            versionEl.textContent = `نادي أدِيب ${window.CURRENT_VERSION}`;
        }

        // زر مسح ذاكرة التخزين المؤقت
        const clearCacheBtn = document.getElementById('settingsClearCacheBtn');
        if (clearCacheBtn && !clearCacheBtn._bound) {
            clearCacheBtn._bound = true;
            clearCacheBtn.addEventListener('click', async () => {
                if ('caches' in window) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(key => caches.delete(key)));
                }
                window.showToast?.('تم مسح ذاكرة التخزين المؤقت بنجاح', 'success');
            });
        }
    }

    // تحميل قسم الأعضاء المنتهية عضوياتهم
    async function loadTerminatedMembersSection() {
        const container = document.getElementById('terminatedMembersTable');
        const statsContainer = document.getElementById('terminatedMembersStatsGrid');
        if (!container) return;

        try {
            showLoading(true);
            
            // جلب الأعضاء المنتهية عضوياتهم (حالة suspended تعني إنهاء العضوية)
            const { data: terminatedMembers, error } = await sb
                .from('profiles')
                .select('*')
                .eq('account_status', 'suspended')
                .order('updated_at', { ascending: false });

            if (error) throw error;

            // عرض الإحصائيات
            if (statsContainer) {
                statsContainer.innerHTML = `
                    <div class="stat-card" style="--stat-color: #ef4444">
                        <div class="stat-card-wrapper">
                            <div class="stat-icon">
                                <i class="fa-solid fa-user-xmark"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-value">${terminatedMembers?.length || 0}</div>
                                <div class="stat-label">إجمالي الأعضاء المنتهية عضوياتهم</div>
                            </div>
                        </div>
                    </div>
                `;
            }

            if (!terminatedMembers || terminatedMembers.length === 0) {
                container.innerHTML = `
                    <div class="empty-state empty-state--success">
                        <div class="empty-state__icon"><i class="fa-solid fa-user-check"></i></div>
                        <p class="empty-state__title">لا يوجد أعضاء منتهية عضوياتهم</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <div class="uc-grid">
                    ${terminatedMembers.map(member => {
                        const terminationDuration = getTerminationDuration(member.updated_at);
                        return `
                        <div class="uc-card uc-card--danger" data-user-id="${member.id}">
                            <div class="uc-card__header uc-card__header--danger">
                                <div class="uc-card__header-inner">
                                    <div class="uc-card__icon">
                                        <i class="fa-solid fa-user-xmark"></i>
                                    </div>
                                    <div class="uc-card__header-info">
                                        <h3 class="uc-card__title">${member.full_name}</h3>
                                        <span class="uc-card__badge">
                                            <i class="fa-solid fa-user-xmark"></i>
                                            عضوية منتهية
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div class="uc-card__body">
                                ${member.email ? `
                                <div class="uc-card__info-item">
                                    <div class="uc-card__info-icon"><i class="fa-regular fa-envelope"></i></div>
                                    <div class="uc-card__info-content">
                                        <span class="uc-card__info-label">البريد الإلكتروني</span>
                                        <span class="uc-card__info-value">${member.email}</span>
                                    </div>
                                </div>` : ''}
                                ${member.phone ? `
                                <div class="uc-card__info-item">
                                    <div class="uc-card__info-icon"><i class="fa-solid fa-phone"></i></div>
                                    <div class="uc-card__info-content">
                                        <span class="uc-card__info-label">الجوال</span>
                                        <span class="uc-card__info-value">${member.phone}</span>
                                    </div>
                                </div>` : ''}
                                <div class="uc-card__info-item">
                                    <div class="uc-card__info-icon"><i class="fa-regular fa-calendar-xmark"></i></div>
                                    <div class="uc-card__info-content">
                                        <span class="uc-card__info-label">تاريخ الإنهاء</span>
                                        <span class="uc-card__info-value">${member.updated_at ? new Date(member.updated_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }) : 'غير محدد'}</span>
                                    </div>
                                </div>
                                <div class="uc-card__info-item">
                                    <div class="uc-card__info-icon"><i class="fa-solid fa-hourglass-half"></i></div>
                                    <div class="uc-card__info-content">
                                        <span class="uc-card__info-label">مدة الإنهاء</span>
                                        <span class="uc-card__info-value">${terminationDuration}</span>
                                    </div>
                                </div>
                                ${member.termination_reason ? `
                                <div class="uc-card__info-item">
                                    <div class="uc-card__info-icon"><i class="fa-solid fa-comment-dots"></i></div>
                                    <div class="uc-card__info-content">
                                        <span class="uc-card__info-label">سبب الإنهاء</span>
                                        <span class="uc-card__info-value">${member.termination_reason}</span>
                                    </div>
                                </div>` : ''}
                            </div>
                            <div class="uc-card__footer">
                                <button class="btn-restore-membership btn btn-block btn-success" data-user-id="${member.id}" data-user-name="${member.full_name}">
                                    <i class="fa-solid fa-rotate-left"></i>
                                    إعادة العضوية
                                </button>
                                <button class="btn-delete-permanently btn btn-block btn-danger" data-user-id="${member.id}" data-user-name="${member.full_name}">
                                    <i class="fa-solid fa-trash"></i>
                                    حذف نهائي
                                </button>
                            </div>
                        </div>
                    `;}).join('')}
                </div>
            `;

            // إضافة وظيفة البحث
            const searchInput = document.getElementById('terminatedMemberSearchInput');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    const cards = container.querySelectorAll('.uc-card');
                    let visibleCount = 0;
                    cards.forEach(card => {
                        const name = card.querySelector('.uc-card__title')?.textContent.toLowerCase() || '';
                        const email = card.querySelector('.uc-card__info-value')?.textContent.toLowerCase() || '';
                        if (name.includes(searchTerm) || email.includes(searchTerm)) {
                            card.style.display = '';
                            visibleCount++;
                        } else {
                            card.style.display = 'none';
                        }
                    });

                    // إظهار empty-state إذا لم تكن هناك نتائج
                    const cardsGrid = container.querySelector('.uc-grid');
                    let emptyState = container.querySelector('.empty-state');
                    
                    if (visibleCount === 0 && searchTerm) {
                        if (!emptyState) {
                            emptyState = document.createElement('div');
                            emptyState.className = 'empty-state';
                            emptyState.innerHTML = `
                                <i class="fa-solid fa-search"></i>
                                <p>لا توجد نتائج مطابقة للبحث</p>
                            `;
                            container.appendChild(emptyState);
                        }
                        emptyState.style.display = '';
                        if (cardsGrid) cardsGrid.style.display = 'none';
                    } else {
                        if (emptyState) emptyState.style.display = 'none';
                        if (cardsGrid) cardsGrid.style.display = '';
                    }
                });
            }

        // إضافة event listener لأزرار إعادة العضوية
            container.querySelectorAll('.btn-restore-membership').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const userId = e.currentTarget.dataset.userId;
                    const userName = e.currentTarget.dataset.userName;
                    await restoreMembership(userId, userName);
                });
            });

        // إضافة event listener لأزرار الحذف النهائي
            container.querySelectorAll('.btn-delete-permanently').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const userId = e.currentTarget.dataset.userId;
                    const userName = e.currentTarget.dataset.userName;
                    await deleteMemberPermanently(userId, userName);
                });
            });

        } catch (error) {
            console.error('Error loading terminated members:', error);
            container.innerHTML = '<div class="error-state">حدث خطأ أثناء تحميل البيانات</div>';
        } finally {
            showLoading(false);
        }
    }

    // إعادة عضوية عضو منتهية عضويته
    async function restoreMembership(userId, userName) {
        const confirmed = await ModalHelper.confirm({
            title: 'تأكيد إعادة العضوية',
            message: `هل أنت متأكد من إعادة عضوية <strong>${userName}</strong>؟<br><span style="font-size:0.875rem;color:#64748b;">سيتم تفعيل الحساب مجدداً وإتاحة الدخول للنظام.</span>`,
            type: 'info',
            confirmText: 'نعم، إعادة العضوية',
            cancelText: 'إلغاء'
        });

        if (!confirmed) return;

        try {
            showLoading(true);

            const { error } = await sb
                .from('profiles')
                .update({
                    account_status: 'active',
                    termination_reason: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) throw error;

            // إعادة تفعيل أدوار العضو
            await sb
                .from('user_roles')
                .update({ is_active: true })
                .eq('user_id', userId);

            Toast.success(`تمت إعادة عضوية ${userName} بنجاح`);
            await loadTerminatedMembersSection();
        } catch (error) {
            console.error('Error restoring membership:', error);
            Toast.error('حدث خطأ أثناء إعادة العضوية. يرجى المحاولة مرة أخرى.');
        } finally {
            showLoading(false);
        }
    }

    // حساب مدة انتهاء العضوية بشكل مقروء
    function getTerminationDuration(terminationDate) {
        if (!terminationDate) return 'غير محدد';
        
        const now = new Date();
        const termDate = new Date(terminationDate);
        const diffMs = now - termDate;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays < 1) {
            return 'اليوم';
        } else if (diffDays === 1) {
            return 'يوم واحد';
        } else if (diffDays === 2) {
            return 'يومان';
        } else if (diffDays < 7) {
            return `${diffDays} أيام`;
        } else if (diffDays < 14) {
            return 'أسبوع';
        } else if (diffDays < 21) {
            return 'أسبوعان';
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} أسابيع`;
        } else if (diffDays < 60) {
            return 'شهر';
        } else if (diffDays < 90) {
            return 'شهران';
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return `${months} أشهر`;
        } else if (diffDays < 730) {
            return 'سنة';
        } else if (diffDays < 1095) {
            return 'سنتان';
        } else {
            const years = Math.floor(diffDays / 365);
            return `${years} سنوات`;
        }
    }

    // حذف عضو نهائياً من قاعدة البيانات
    async function deleteMemberPermanently(userId, userName) {
        const confirmed = await ModalHelper.confirm({
            title: 'تأكيد الحذف النهائي',
            message: `هل أنت متأكد من حذف <strong>${userName}</strong> نهائياً؟<br><span style="font-size:0.875rem;color:#64748b;">سيُحذف العضو وجميع سجلاته من قاعدة البيانات ولا يمكن التراجع عن هذا الإجراء.</span>`,
            type: 'danger',
            confirmText: 'نعم، احذف نهائياً',
            cancelText: 'إلغاء'
        });

        if (!confirmed) return;

        try {
            showLoading(true);

            // 1. حذف من member_onboarding_tokens
            await sb.from('member_onboarding_tokens').delete().eq('user_id', userId);

            // 2. حذف من user_roles
            await sb.from('user_roles').delete().eq('user_id', userId);

            // 3. حذف من member_details
            await sb.from('member_details').delete().eq('user_id', userId);

            // 4. حذف من profiles
            const { error: profileError } = await sb.from('profiles').delete().eq('id', userId);

            if (profileError) throw profileError;

            Toast.success(`تم حذف ${userName} نهائياً من قاعدة البيانات`);

            // إعادة تحميل القسم
            await loadTerminatedMembersSection();

        } catch (error) {
            console.error('Error deleting member permanently:', error);
            Toast.error('حدث خطأ أثناء حذف العضو. قد تكون هناك بيانات مرتبطة تمنع الحذف.');
        } finally {
            showLoading(false);
        }
    }

    window.loadTerminatedMembersSection = loadTerminatedMembersSection;

    // تحميل قسم الاستبيانات المؤرشفة
    async function loadArchivedSurveysSection() {
        const container = document.getElementById('archivedSurveysListContainer');
        const countEl = document.getElementById('totalArchivedSurveysCount');
        const searchInput = document.getElementById('archivedSurveysSearchInput');
        if (!container) return;

        try {
            showLoading(true);
            const surveys = await window.surveysManager.loadArchivedSurveys();

            if (countEl) countEl.textContent = surveys.length;

            const renderList = (list) => {
                if (list.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state empty-state--gray">
                            <div class="empty-state__icon"><i class="fa-solid fa-box-archive"></i></div>
                            <h3 class="empty-state__title">لا توجد استبيانات مؤرشفة</h3>
                            <p class="empty-state__message">الاستبيانات المؤرشفة ستظهر هنا</p>
                        </div>
                    `;
                    return;
                }
                container.innerHTML = `
                    <div class="card card--neutral">
                        <div class="card-header">
                            <h3><i class="fa-solid fa-box-archive"></i> الاستبيانات المؤرشفة (${list.length})</h3>
                            <button class="btn btn-slate btn-icon btn-outline" title="تحديث" onclick="window.loadArchivedSurveysSection && window.loadArchivedSurveysSection()">
                                <i class="fa-solid fa-rotate"></i>
                            </button>
                        </div>
                        <div class="card-body">
                            <div class="uc-grid">
                                ${list.map(survey => `
                            <div class="uc-card uc-card--neutral">
                                <div class="uc-card__header uc-card__header--neutral">
                                    <div class="uc-card__header-inner">
                                        <div class="uc-card__icon">
                                            <i class="fa-solid fa-clipboard-question"></i>
                                        </div>
                                        <div class="uc-card__header-info">
                                            <h3 class="uc-card__title">${window.surveysManager.escapeHtml(survey.title)}</h3>
                                            <span class="uc-card__badge">
                                                <i class="fa-solid fa-box-archive"></i>
                                                مؤرشف
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div class="uc-card__body">
                                    <div class="uc-card__info-item">
                                        <div class="uc-card__info-icon"><i class="fa-solid fa-align-right"></i></div>
                                        <div class="uc-card__info-content">
                                            <span class="uc-card__info-label">الوصف</span>
                                            <span class="uc-card__info-value${survey.description ? '' : ' uc-card__info-value--empty'}">${survey.description ? window.surveysManager.escapeHtml(survey.description) : 'لا يوجد وصف'}</span>
                                        </div>
                                    </div>
                                    <div class="uc-card__info-item">
                                        <div class="uc-card__info-icon"><i class="fa-solid fa-calendar-xmark"></i></div>
                                        <div class="uc-card__info-content">
                                            <span class="uc-card__info-label">تاريخ الأرشفة</span>
                                            <span class="uc-card__info-value${survey.archived_at ? '' : ' uc-card__info-value--empty'}">${survey.archived_at ? new Date(survey.archived_at).toLocaleDateString('ar-SA') : 'غير محدد'}</span>
                                        </div>
                                    </div>
                                    <div class="uc-card__info-item">
                                        <div class="uc-card__info-icon"><i class="fa-solid fa-user"></i></div>
                                        <div class="uc-card__info-content">
                                            <span class="uc-card__info-label">أرشف بواسطة</span>
                                            <span class="uc-card__info-value${survey.archived_by_profile ? '' : ' uc-card__info-value--empty'}">${survey.archived_by_profile ? window.surveysManager.escapeHtml(survey.archived_by_profile.full_name) : 'غير معروف'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="uc-card__footer">
                                    <button class="btn btn-primary" onclick="window.surveysManager.viewSurveyDetails(${survey.id})">
                                        <i class="fa-solid fa-circle-info"></i>
                                        عرض التفاصيل
                                    </button>
                                    <button class="btn btn-slate" onclick="window.surveysManager.exportSurveyToExcel(${survey.id})">
                                        <i class="fa-solid fa-file-excel"></i>
                                        تحميل Excel
                                    </button>
                                    <button class="btn btn-success" onclick="window.surveysManager.unarchiveSurvey(${survey.id}); loadArchivedSurveysSection()">
                                        <i class="fa-solid fa-box-open"></i>
                                        إلغاء الأرشفة
                                    </button>
                                    <button class="btn btn-danger" onclick="window.surveysManager.deleteSurvey(${survey.id})">
                                        <i class="fa-solid fa-trash"></i>
                                        حذف
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                            </div>
                        </div>
                    </div>
                `;
            };

            renderList(surveys);

            if (searchInput) {
                searchInput.oninput = (e) => {
                    const term = e.target.value.toLowerCase();
                    const filtered = surveys.filter(s => s.title.toLowerCase().includes(term));
                    renderList(filtered);
                };
            }
        } catch (error) {
            console.error('Error loading archived surveys:', error);
            container.innerHTML = '<div class="error-state">حدث خطأ أثناء تحميل الاستبيانات المؤرشفة</div>';
        } finally {
            showLoading(false);
        }
    }

    // جعل الدالة متاحة عالمياً للاستخدام في الأزرار
    window.loadArchivedSurveysSection = loadArchivedSurveysSection;

    // تحميل قسم الاستبيانات المحذوفة
    async function loadDeletedSurveysSection() {
        const container = document.getElementById('deletedSurveysListContainer');
        const countEl = document.getElementById('totalDeletedSurveysCount');
        const searchInput = document.getElementById('deletedSurveysSearchInput');
        if (!container) return;

        try {
            showLoading(true);
            const surveys = await window.surveysManager.loadDeletedSurveys();

            if (countEl) countEl.textContent = surveys.length;

            const renderList = (list) => {
                if (list.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state empty-state--danger">
                            <div class="empty-state__icon"><i class="fa-solid fa-trash"></i></div>
                            <h3 class="empty-state__title">لا توجد استبيانات محذوفة</h3>
                            <p class="empty-state__message">الاستبيانات المحذوفة ستظهر هنا</p>
                        </div>
                    `;
                    return;
                }
                container.innerHTML = `
                    <div class="card card--danger">
                        <div class="card-header">
                            <h3><i class="fa-solid fa-trash"></i> الاستبيانات المحذوفة (${list.length})</h3>
                            <button class="btn btn-danger btn-icon btn-outline" id="deletedSurveysOptionsBtn" title="خيارات">
                                <i class="fa-solid fa-ellipsis-vertical"></i>
                            </button>
                        </div>
                        <div class="card-body">
                            <div class="uc-grid">
                                ${list.map(survey => {
                            let permanentDeleteDateObj = null;
                            if (survey.permanent_delete_at) {
                                permanentDeleteDateObj = new Date(survey.permanent_delete_at);
                            } else if (survey.deleted_at) {
                                permanentDeleteDateObj = new Date(survey.deleted_at);
                                permanentDeleteDateObj.setDate(permanentDeleteDateObj.getDate() + 30);
                            }
                            const permanentDeleteDate = permanentDeleteDateObj
                                ? permanentDeleteDateObj.toLocaleDateString('ar-SA')
                                : null;
                            const daysLeft = permanentDeleteDateObj
                                ? Math.max(0, Math.ceil((permanentDeleteDateObj - new Date()) / (1000 * 60 * 60 * 24)))
                                : null;
                            return `
                            <div class="uc-card uc-card--danger">
                                <div class="uc-card__header uc-card__header--danger">
                                    <div class="uc-card__header-inner">
                                        <div class="uc-card__icon">
                                            <i class="fa-solid fa-trash"></i>
                                        </div>
                                        <div class="uc-card__header-info">
                                            <h3 class="uc-card__title">${window.surveysManager.escapeHtml(survey.title)}</h3>
                                            <span class="uc-card__badge">
                                                <i class="fa-solid fa-trash"></i>
                                                محذوف
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div class="uc-card__body">
                                    <div class="uc-card__info-item">
                                        <div class="uc-card__info-icon"><i class="fa-solid fa-align-right"></i></div>
                                        <div class="uc-card__info-content">
                                            <span class="uc-card__info-label">الوصف</span>
                                            <span class="uc-card__info-value${survey.description ? '' : ' uc-card__info-value--empty'}">${survey.description ? window.surveysManager.escapeHtml(survey.description) : 'لا يوجد وصف'}</span>
                                        </div>
                                    </div>
                                    <div class="uc-card__info-item">
                                        <div class="uc-card__info-icon"><i class="fa-solid fa-calendar-xmark"></i></div>
                                        <div class="uc-card__info-content">
                                            <span class="uc-card__info-label">تاريخ الحذف</span>
                                            <span class="uc-card__info-value${survey.deleted_at ? '' : ' uc-card__info-value--empty'}">${survey.deleted_at ? new Date(survey.deleted_at).toLocaleDateString('ar-SA') : 'غير محدد'}</span>
                                        </div>
                                    </div>
                                    <div class="uc-card__info-item">
                                        <div class="uc-card__info-icon"><i class="fa-solid fa-clock"></i></div>
                                        <div class="uc-card__info-content">
                                            <span class="uc-card__info-label">الحذف النهائي في</span>
                                            <span class="uc-card__info-value" style="color:#ef4444;">${permanentDeleteDate ? `${permanentDeleteDate} (${daysLeft} يوم متبقي)` : 'غير محدد'}</span>
                                        </div>
                                    </div>
                                    <div class="uc-card__info-item">
                                        <div class="uc-card__info-icon"><i class="fa-solid fa-user"></i></div>
                                        <div class="uc-card__info-content">
                                            <span class="uc-card__info-label">حذف بواسطة</span>
                                            <span class="uc-card__info-value${survey.deleted_by_profile ? '' : ' uc-card__info-value--empty'}">${survey.deleted_by_profile ? window.surveysManager.escapeHtml(survey.deleted_by_profile.full_name) : 'غير معروف'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="uc-card__footer">
                                    <button class="btn btn-primary" onclick="window.surveysManager.viewSurveyDetails(${survey.id})">
                                        <i class="fa-solid fa-circle-info"></i>
                                        عرض التفاصيل
                                    </button>
                                    <button class="btn btn-slate" onclick="window.surveysManager.exportSurveyToExcel(${survey.id})">
                                        <i class="fa-solid fa-file-excel"></i>
                                        تحميل Excel
                                    </button>
                                    <button class="btn btn-success" onclick="window.surveysManager.restoreSurvey(${survey.id}).then(() => loadDeletedSurveysSection())">
                                        <i class="fa-solid fa-rotate-left"></i>
                                        استعادة
                                    </button>
                                    <button class="btn btn-danger" onclick="window.surveysManager.deleteSurveyPermanently(${survey.id}).then(() => loadDeletedSurveysSection())">
                                        <i class="fa-solid fa-trash"></i>
                                        حذف نهائي
                                    </button>
                                </div>
                            </div>
                        `;}).join('')}
                            </div>
                        </div>
                    </div>
                `;
            };

            renderList(surveys);

            // إنشاء القائمة المنسدلة في body
            let dropdown = document.getElementById('deletedSurveysDropdown');
            if (dropdown) dropdown.remove();
            dropdown = document.createElement('div');
            dropdown.id = 'deletedSurveysDropdown';
            dropdown.className = 'dropdown-menu';
            dropdown.innerHTML = `
                <button class="btn btn-slate btn-outline btn-block" id="refreshDeletedSurveysBtn">
                    <i class="fa-solid fa-rotate"></i> تحديث
                </button>
                <button class="btn btn-success btn-outline btn-block" id="restoreAllSurveysBtn">
                    <i class="fa-solid fa-rotate-left"></i> استعادة الكل
                </button>
                <div class="dropdown-divider"></div>
                <button class="btn btn-danger btn-outline btn-block" id="deleteAllSurveysBtn">
                    <i class="fa-solid fa-trash-can"></i> حذف الكل نهائياً
                </button>
            `;
            document.body.appendChild(dropdown);

            // فتح/إغلاق القائمة
            container.addEventListener('click', (e) => {
                const optionsBtn = e.target.closest('#deletedSurveysOptionsBtn');
                if (!optionsBtn) return;
                const isOpen = dropdown.classList.toggle('show');
                if (isOpen) {
                    const rect = optionsBtn.getBoundingClientRect();
                    dropdown.style.top = (rect.bottom + 6) + 'px';
                    dropdown.style.left = rect.left + 'px';
                }
            });

            // حذف الكل نهائياً
            dropdown.querySelector('#deleteAllSurveysBtn').addEventListener('click', async () => {
                dropdown.classList.remove('show');
                const confirmed = await ModalHelper.confirm({
                    title: 'حذف جميع الاستبيانات نهائياً',
                    message: `سيتم حذف ${surveys.length} استبيان وجميع بياناتها نهائياً. لا يمكن التراجع عن هذا الإجراء.`,
                    type: 'danger',
                    confirmText: 'حذف الكل',
                    cancelText: 'إلغاء'
                });
                if (!confirmed) return;
                for (const survey of surveys) {
                    await window.surveysManager.deleteSurveyPermanently(survey.id, true);
                }
                await loadDeletedSurveysSection();
            });

            // استعادة الكل
            dropdown.querySelector('#restoreAllSurveysBtn').addEventListener('click', async () => {
                dropdown.classList.remove('show');
                const confirmed = await ModalHelper.confirm({
                    title: 'استعادة جميع الاستبيانات',
                    message: `سيتم استعادة ${surveys.length} استبيان إلى المسودات.`,
                    type: 'success',
                    confirmText: 'استعادة الكل',
                    cancelText: 'إلغاء'
                });
                if (!confirmed) return;
                for (const survey of surveys) {
                    await sb.from('surveys').update({ status: 'draft', deleted_at: null, deleted_by: null, permanent_delete_at: null }).eq('id', survey.id);
                }
                await window.surveysManager.loadAllSurveys();
                await loadDeletedSurveysSection();
            });

            // إغلاق القائمة عند الضغط خارجها
            document.addEventListener('click', (e) => {
                if (!e.target.closest('#deletedSurveysOptionsBtn') && !e.target.closest('#deletedSurveysDropdown')) {
                    dropdown.classList.remove('show');
                }
            });

            if (searchInput) {
                searchInput.oninput = (e) => {
                    const term = e.target.value.toLowerCase();
                    const filtered = surveys.filter(s => s.title.toLowerCase().includes(term));
                    renderList(filtered);
                };
            }

            // زر التحديث في القائمة المنسدلة
            dropdown.querySelector('#refreshDeletedSurveysBtn').addEventListener('click', () => {
                dropdown.classList.remove('show');
                loadDeletedSurveysSection();
            });
        } catch (error) {
            console.error('Error loading deleted surveys:', error);
            container.innerHTML = '<div class="error-state">حدث خطأ أثناء تحميل الاستبيانات المحذوفة</div>';
        } finally {
            showLoading(false);
        }
    }

    window.loadDeletedSurveysSection = loadDeletedSurveysSection;

    // وظائف تحميل البيانات
    async function loadUsers() {
        const container = document.getElementById('usersTable');
        if (!container) return;

        try {
            showLoading(true);
            
            // جلب المستخدمين أولاً
            const { data: users, error: usersError } = await sb
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (usersError) throw usersError;

            // جلب الأدوار لكل مستخدم
            const usersWithRoles = await Promise.all(users.map(async (user) => {
                const { data: userRoles } = await sb
                    .from('user_roles')
                    .select(`
                        role:roles (
                            role_name_ar,
                            role_level
                        ),
                        committee:committees (
                            committee_name_ar
                        )
                    `)
                    .eq('user_id', user.id)
                    .eq('is_active', true)
                    .limit(1);

                return {
                    ...user,
                    user_roles: userRoles || []
                };
            }));

            if (!usersWithRoles || usersWithRoles.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state__icon"><i class="fa-solid fa-users"></i></div><p class="empty-state__title">لا يوجد مستخدمين</p></div>';
                return;
            }

            container.innerHTML = `
                <table class="table">
                    <thead>
                        <tr>
                            <th>الاسم</th>
                            <th>البريد الإلكتروني</th>
                            <th>الدور</th>
                            <th>الحالة</th>
                            <th>تاريخ الانضمام</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${usersWithRoles.map(user => {
                            const role = user.user_roles?.[0]?.role;
                            const status = user.account_status === 'active' ? 'نشط' : 
                                         user.account_status === 'inactive' ? 'غير نشط' : 'معلق';
                            const statusClass = user.account_status === 'active' ? 'success' : 'error';
                            
                            return `
                                <tr>
                                    <td>
                                        <div style="display: flex; align-items: center; gap: 10px;">
                                            <img src="${user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=3d8fd6&color=fff`}" 
                                                 style="width: 40px; height: 40px; border-radius: 50%;" />
                                            <strong>${user.full_name}</strong>
                                        </div>
                                    </td>
                                    <td>${user.email}</td>
                                    <td>${role?.role_name_ar || 'لا يوجد'}</td>
                                    <td><span class="badge ${statusClass}">${status}</span></td>
                                    <td>${new Date(user.created_at).toLocaleDateString('ar-SA')}</td>
                                    <td>
                                        <button class=" btn-outline" onclick="editUser('${user.id}')">
                                            <i class="fa-solid fa-edit"></i>
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        } catch (error) {
            console.error('Error loading users:', error);
            container.innerHTML = '<div class="error-state">حدث خطأ أثناء تحميل المستخدمين</div>';
        } finally {
            showLoading(false);
        }
    }

    // حساب عدد الأفاتارات المرئية وتحديث شارة العدد المتبقي
    const AVATAR_STACK_W = 30;
    const AVATAR_STACK_OVERLAP = 8;
    const AVATAR_BADGE_W = 30;

    function _calcStack(stack) {
        const avatars = Array.from(stack.querySelectorAll('.uc-card__avatar-item'));
        if (avatars.length === 0) return;

        avatars.forEach(a => { a.style.display = ''; });
        let badge = stack.querySelector('.uc-card__avatar-more');
        if (badge) badge.style.display = 'none';

        const stackW = stack.clientWidth;
        if (stackW === 0) return; // قسم مخفي — overflow:hidden يمنع الخروج مؤقتاً

        const totalW      = n => n <= 0 ? 0 : AVATAR_STACK_W + (n - 1) * (AVATAR_STACK_W - AVATAR_STACK_OVERLAP);
        const totalWBadge = n => totalW(n) + (n > 0 ? AVATAR_BADGE_W - AVATAR_STACK_OVERLAP : AVATAR_BADGE_W);

        if (totalW(avatars.length) <= stackW) return; // كلها تتسع

        let lo = 1, hi = avatars.length - 1, maxFit = 1;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (totalWBadge(mid) <= stackW) { maxFit = mid; lo = mid + 1; }
            else hi = mid - 1;
        }

        const hidden = avatars.length - maxFit;
        avatars.forEach((a, i) => { a.style.display = i < maxFit ? '' : 'none'; });

        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'uc-card__avatar-more';
            stack.appendChild(badge);
        }
        badge.textContent = '+' + hidden;
        badge.style.display = '';
    }

    function refreshAvatarStacks(container) {
        (container || document).querySelectorAll('.uc-card__avatar-stack').forEach(_calcStack);
    }

    // إعادة الحساب عند تغيير حجم الشاشة (مع تأخير للأداء)
    let _avatarResizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(_avatarResizeTimer);
        _avatarResizeTimer = setTimeout(() => {
            document.querySelectorAll('.uc-card__avatar-stack').forEach(_calcStack);
        }, 120);
    });

    async function loadCouncils() {
        const container = document.getElementById('councilsGrid');
        if (!container) return;

        try {
            const { data: councilRows } = await sb.from('councils').select('*').order('id', { ascending: true });

            const councilMeta = {
                administrative: { icon: 'fa-landmark', types: ['administrative', 'both'] },
                executive:      { icon: 'fa-landmark', types: ['executive', 'both'] },
            };

            const councils = (councilRows || []).map(row => ({
                ...row,
                ...councilMeta[row.id],
                name: row.name_ar,
            }));

            for (const council of councils) {
                const { data: members } = await sb
                    .from('user_roles')
                    .select('user_id, roles(role_name_ar, role_level, council_type), profiles!user_roles_user_id_fkey(full_name, avatar_url)')
                    .in('roles.council_type', council.types)
                    .eq('is_active', true)
                    .not('roles', 'is', null);

                const filtered = (members || []).filter(m => {
                    if (!m.roles || !council.types.includes(m.roles.council_type)) return false;
                    if (council.id === 'executive') return m.roles.role_level >= 5;
                    if (council.id === 'administrative') return m.roles.role_level >= 8;
                    return true;
                });
                filtered.sort((a, b) => (b.roles?.role_level || 0) - (a.roles?.role_level || 0));
                council.members = filtered;
                council.members_count = filtered.length;
                council.president = council.id === 'executive'
                    ? filtered.find(m => m.roles?.role_name_ar === 'رئيس المجلس التنفيذي')
                    : filtered.find(m => m.roles?.role_level >= 9);
            }

            container.innerHTML = councils.map(council => {
                const avatarStackHtml = council.members.slice(0, 8).map(m => {
                    const name   = m.profiles?.full_name || '؟';
                    const avatar = m.profiles?.avatar_url ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3d8fd6&color=fff&size=64`;
                    return `<img class="uc-card__avatar-item" src="${avatar}" alt="${name}" title="${name}" />`;
                }).join('');

                const presidentHtml = council.president ? `
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-star"></i></div>
                            <div class="uc-card__info-content">
                                <div class="uc-card__info-label">${council.president.roles?.role_name_ar || 'الرئيس'}</div>
                                <div class="uc-card__info-value">${council.president.profiles?.full_name || '—'}</div>
                            </div>
                        </div>` : '';

                return `
                <div class="uc-card" data-council-id="${council.id}">
                    <div class="uc-card__header">
                        <div class="uc-card__header-inner">
                            <div class="uc-card__icon">
                                <i class="fa-solid ${council.icon}"></i>
                            </div>
                            <div class="uc-card__header-info">
                                <h3 class="uc-card__title">${council.name}</h3>
                                <span class="uc-card__badge">
                                    <i class="fa-solid fa-users"></i>
                                    ${council.members_count} عضو
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="uc-card__body">
                        <div class="uc-card__info-item uc-card__info-item--full">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-align-right"></i></div>
                            <div class="uc-card__info-content">
                                <div class="uc-card__info-label">الوصف</div>
                                <div class="uc-card__info-value">${council.description || 'لا يوجد وصف'}</div>
                            </div>
                        </div>
                        ${presidentHtml}
                        ${council.group_link ? `
                        <div class="uc-card__info-item uc-card__info-item--full uc-card__info-item--link">
                            <div class="uc-card__info-icon"><i class="fa-brands fa-whatsapp"></i></div>
                            <div class="uc-card__info-content">
                                <div class="uc-card__info-label">رابط القروب</div>
                                <div class="uc-card__info-value">${council.group_link}</div>
                            </div>
                            <button class="uc-card__link-btn" onclick="event.stopPropagation(); window.open('${council.group_link}','_blank')" title="فتح الرابط">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                            </button>
                        </div>` : ''}
                        ${council.members.length > 0 ? `
                        <div class="uc-card__members">
                            <span class="uc-card__members-label">الأعضاء</span>
                            <div class="uc-card__avatar-stack">
                                ${avatarStackHtml}
                            </div>
                        </div>` : ''}
                    </div>
                    <div class="uc-card__footer">
                        <button class="btn btn-primary " onclick="viewCouncil('${council.id}')">
                            <i class="fa-solid fa-eye"></i>
                            عرض التفاصيل
                        </button>
                        <button class="btn btn-warning " onclick="editCouncil('${council.id}')">
                            <i class="fa-solid fa-pen"></i>
                            تعديل
                        </button>
                    </div>
                </div>`;
            }).join('');

            requestAnimationFrame(() => refreshAvatarStacks(container));
        } catch (error) {
            console.error('Error loading councils:', error);
            container.innerHTML = '<div class="error-state">حدث خطأ أثناء تحميل المجالس</div>';
        }
    }

    const councilMeta = {
        administrative: { icon: 'fa-landmark', types: ['administrative', 'both'] },
        executive:      { icon: 'fa-landmark', types: ['executive', 'both'] },
    };

    window.viewCouncil = async function(councilId) {
        try {
            showLoading(true);

            const { data: row } = await sb.from('councils').select('*').eq('id', councilId).single();
            if (!row) return;
            const council = { ...row, ...councilMeta[councilId], name: row.name_ar };

            const { data: members } = await sb
                .from('user_roles')
                .select('user_id, roles(role_name_ar, role_level, council_type), profiles!user_roles_user_id_fkey(full_name, avatar_url)')
                .in('roles.council_type', council.types)
                .eq('is_active', true)
                .not('roles', 'is', null);

            const filtered = (members || [])
                .filter(m => m.roles && council.types.includes(m.roles.council_type))
                .sort((a, b) => (b.roles?.role_level || 0) - (a.roles?.role_level || 0));

            const membersHtml = filtered.length > 0
                ? filtered.map(m => {
                    const name   = m.profiles?.full_name || 'غير محدد';
                    const avatar = m.profiles?.avatar_url ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3d8fd6&color=fff`;
                    const role   = m.roles?.role_name_ar || '';
                    return `
                    <div class="modal-detail-item" style="flex-direction:row;align-items:center;gap:0.75rem;">
                        <img src="${avatar}" alt="${name}"
                             style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0;" />
                        <div style="min-width:0;">
                            <div class="modal-detail-value" style="font-size:0.9rem;">${name}</div>
                            ${role ? `<div class="modal-detail-label" style="margin-top:0.15rem;">${role}</div>` : ''}
                        </div>
                    </div>`;
                }).join('')
                : `<p style="color:#64748b;text-align:center;padding:1rem;grid-column:1/-1;">لا يوجد أعضاء</p>`;

            const content = `
                <div class="modal-section">
                    <h3><i class="fa-solid fa-circle-info"></i> بيانات المجلس</h3>
                    <div class="modal-detail-grid">
                        <div class="modal-detail-item" style="grid-column:1/-1;">
                            <span class="modal-detail-label">الوصف</span>
                            <span class="modal-detail-value" style="white-space:normal;overflow:visible;">${council.description || 'لا يوجد وصف'}</span>
                        </div>
                        ${council.group_link ? `
                        <div class="modal-detail-item" style="grid-column:1/-1;">
                            <span class="modal-detail-label">رابط القروب</span>
                            <span class="modal-detail-value">${council.group_link}</span>
                            <div class="modal-detail-actions">
                                <button class="mdi-btn" onclick="window.open('${council.group_link}','_blank')" title="فتح الرابط">
                                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                                </button>
                            </div>
                        </div>` : ''}
                    </div>
                </div>
                <hr class="modal-divider">
                <div class="modal-section">
                    <h3><i class="fa-solid fa-users"></i> الأعضاء (${filtered.length})</h3>
                    <div class="modal-detail-grid">
                        ${membersHtml}
                    </div>
                </div>
            `;

            window.openModal(council.name, content, { icon: council.icon });
        } catch (error) {
            console.error('Error viewing council:', error);
            window.showErrorModal('خطأ', 'حدث خطأ في تحميل تفاصيل المجلس');
        } finally {
            showLoading(false);
        }
    };

    window.editCouncil = async function(councilId) {
        try {
            showLoading(true);
            const { data: row } = await sb.from('councils').select('*').eq('id', councilId).single();
            if (!row) return;


            const formHtml = `
                <div class="modal-form-grid">
                    <div class="form-group full-width">
                        <label class="form-label">
                            <span class="label-icon"><i class="fa-solid fa-landmark"></i></span>
                            اسم المجلس
                        </label>
                        <input type="text" class="form-input" value="${row.name_ar || ''}" readonly />
                    </div>
                    <div class="form-group full-width">
                        <label class="form-label">
                            <span class="label-icon"><i class="fa-solid fa-align-right"></i></span>
                            الوصف
                        </label>
                        <textarea id="council-description" rows="3" class="form-input form-textarea" placeholder="وصف المجلس...">${row.description || ''}</textarea>
                    </div>
                    <div class="form-group full-width">
                        <label class="form-label">
                            <span class="label-icon"><i class="fa-brands fa-whatsapp"></i></span>
                            رابط القروب <span class="required-dot">*</span>
                        </label>
                        <input type="url" id="council-grouplink" class="form-input" placeholder="https://chat.whatsapp.com/..." value="${row.group_link || ''}" required />
                    </div>
                </div>`;

            const footer = `
                <button class="btn btn-outline" onclick="closeModal()">
                    <i class="fa-solid fa-times"></i>
                    إلغاء
                </button>
                <button class="btn btn-warning" onclick="window._submitCouncilEdit('${councilId}')">
                    <i class="fa-solid fa-save"></i>
                    حفظ التعديلات
                </button>
            `;

            window._submitCouncilEdit = async function(id) {
                const description = document.getElementById('council-description')?.value.trim() || null;
                const group_link  = document.getElementById('council-grouplink')?.value.trim() || null;
                if (!group_link) {
                    document.getElementById('council-grouplink').focus();
                    return;
                }
                if ((description ?? '') === (row.description ?? '') && (group_link ?? '') === (row.group_link ?? '')) {
                    window.Toast.show({ type: 'info', title: 'لا تغييرات', message: 'لم تقم بأي تعديل' });
                    return;
                }
                try {
                    showLoading(true);
                    const { error } = await sb.from('councils')
                        .update({ description, group_link, updated_at: new Date().toISOString() })
                        .eq('id', id);
                    if (error) throw error;
                    window.closeModal();
                    await loadCouncils();
                    window.Toast.show({ type: 'success', title: 'تم الحفظ', message: 'تم تحديث بيانات المجلس بنجاح' });
                } catch (err) {
                    console.error('Error updating council:', err);
                    window.showErrorModal('خطأ', 'حدث خطأ أثناء حفظ التعديلات');
                } finally {
                    showLoading(false);
                }
            };

            window.openModal('تعديل مجلس', formHtml, { icon: 'fa-pen', variant: 'warning', footer });
        } catch (error) {
            console.error('Error editing council:', error);
            window.showErrorModal('خطأ', 'حدث خطأ أثناء تحميل بيانات المجلس');
        } finally {
            showLoading(false);
        }
    };

    async function loadCommitteesStats() {
        try {
            const [
                { count: councilsCount },
                { count: adminCount },
                { count: deptsCount },
                { count: committeesCount },
            ] = await Promise.all([
                sb.from('councils').select('*', { count: 'exact', head: true }),
                sb.from('committees').select('*', { count: 'exact', head: true }).eq('is_active', true).is('department_id', null),
                sb.from('departments').select('*', { count: 'exact', head: true }).eq('is_active', true),
                sb.from('committees').select('*', { count: 'exact', head: true }).eq('is_active', true).not('department_id', 'is', null),
            ]);

            const el = id => document.getElementById(id);
            if (el('statCouncils'))         el('statCouncils').textContent        = councilsCount ?? 0;
            if (el('statAdminCommittees'))  el('statAdminCommittees').textContent = adminCount ?? 0;
            if (el('statDepts'))            el('statDepts').textContent           = deptsCount ?? 0;
            if (el('statCommittees'))       el('statCommittees').textContent      = committeesCount ?? 0;
        } catch (err) {
            console.warn('Error loading committees stats:', err);
        }
    }

    async function loadDepartments() {
        const container = document.getElementById('departmentsGrid');
        if (!container) return;

        try {
            const { data: departments, error } = await sb
                .from('departments')
                .select('*')
                .eq('is_active', true)
                .order('display_order', { ascending: true });

            if (error) throw error;

            if (!departments || departments.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state__icon"><i class="fa-solid fa-sitemap"></i></div><p class="empty-state__title">لا توجد أقسام</p></div>';
                return;
            }

            // جلب أعضاء كل قسم عبر لجانه
            for (const dept of departments) {
                const { data: deptCommittees } = await sb
                    .from('committees')
                    .select('id, committee_name_ar')
                    .eq('department_id', dept.id)
                    .eq('is_active', true);

                const committeeIds = (deptCommittees || []).map(c => c.id);
                dept.committees_names = (deptCommittees || []).map(c => c.committee_name_ar);
                let members = [];
                if (committeeIds.length > 0) {
                    const { data: memberData } = await sb
                        .from('user_roles')
                        .select('user_id, roles(role_name_ar, role_level), profiles!user_roles_user_id_fkey(full_name, avatar_url)')
                        .in('committee_id', committeeIds)
                        .eq('is_active', true);
                    members = (memberData || []).sort((a, b) => (b.roles?.role_level || 0) - (a.roles?.role_level || 0));
                }
                dept.members = members;
                dept.members_count = members.length;
            }

            container.innerHTML = departments.map(dept => {
                const deptHead    = dept.members.find(m => m.roles?.role_level === 7);

                const avatarStackHtml = dept.members.map(m => {
                    const name   = m.profiles?.full_name || '؟';
                    const avatar = m.profiles?.avatar_url ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3d8fd6&color=fff&size=64`;
                    return `<img class="uc-card__avatar-item" src="${avatar}" alt="${name}" title="${name}" />`;
                }).join('');

                return `
                <div class="uc-card" data-department-id="${dept.id}">
                    <div class="uc-card__header">
                        <div class="uc-card__header-inner">
                            <div class="uc-card__icon">
                                <i class="fa-solid fa-sitemap"></i>
                            </div>
                            <div class="uc-card__header-info">
                                <h3 class="uc-card__title">${dept.name_ar}</h3>
                                <span class="uc-card__badge">
                                    <i class="fa-solid fa-users"></i>
                                    ${dept.members_count || 0} عضو
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="uc-card__body">
                        <div class="uc-card__info-item uc-card__info-item--full">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-align-right"></i></div>
                            <div class="uc-card__info-content">
                                <div class="uc-card__info-label">الوصف</div>
                                <div class="uc-card__info-value">${dept.description || 'لا يوجد وصف'}</div>
                            </div>
                        </div>
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-user-tie"></i></div>
                            <div class="uc-card__info-content">
                                <div class="uc-card__info-label">رئيس القسم</div>
                                <div class="uc-card__info-value">${deptHead?.profiles?.full_name || 'لم يُعيَّن بعد'}</div>
                            </div>
                        </div>
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-filter"></i></div>
                            <div class="uc-card__info-content">
                                <div class="uc-card__info-label">التصنيف</div>
                                <div class="uc-card__info-value">تابع للمجلس التنفيذي</div>
                            </div>
                        </div>
                        <div class="uc-card__info-item uc-card__info-item--full">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-sitemap"></i></div>
                            <div class="uc-card__info-content">
                                <div class="uc-card__info-label">اللجان</div>
                                <div class="uc-card__info-value">${(() => {
                                    const names = dept.committees_names.map(n => n.replace(/^لجنة\s+/, ''));
                                    if (names.length === 0) return 'لا توجد لجان';
                                    if (names.length === 1) return 'يضم لجنة ' + names[0];
                                    if (names.length === 2) return 'يضم لجنتي ' + names.join(' و');
                                    return 'يضم لجان ' + names.join(' و');
                                })()}</div>
                            </div>
                        </div>
                        ${dept.group_link ? `
                        <div class="uc-card__info-item uc-card__info-item--full uc-card__info-item--link">
                            <div class="uc-card__info-icon"><i class="fa-brands fa-whatsapp"></i></div>
                            <div class="uc-card__info-content">
                                <div class="uc-card__info-label">رابط القروب</div>
                                <div class="uc-card__info-value">${dept.group_link}</div>
                            </div>
                            <button class="uc-card__link-btn" onclick="event.stopPropagation(); window.open('${dept.group_link}','_blank')" title="فتح الرابط">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                            </button>
                        </div>` : ''}
                        ${dept.members.length > 0 ? `
                        <div class="uc-card__members">
                            <span class="uc-card__members-label">الأعضاء</span>
                            <div class="uc-card__avatar-stack">
                                ${avatarStackHtml}
                            </div>
                        </div>` : ''}
                    </div>
                    <div class="uc-card__footer">
                        <button class="btn btn-primary " onclick="viewDepartment(${dept.id})">
                            <i class="fa-solid fa-eye"></i>
                            عرض التفاصيل
                        </button>
                        <button class="btn btn-warning " onclick="editDepartment(${dept.id})">
                            <i class="fa-solid fa-pen"></i>
                            تعديل
                        </button>
                    </div>
                </div>`;
            }).join('');
            requestAnimationFrame(() => refreshAvatarStacks(container));
        } catch (error) {
            console.error('Error loading departments:', error);
            container.innerHTML = '<div class="error-state">حدث خطأ أثناء تحميل الأقسام</div>';
        }
    }

    async function loadCommittees() {
        const container = document.getElementById('committeesGrid');
        if (!container) return;

        try {
            showLoading(true);
            
            const { data: committees, error } = await sb
                .from('committees')
                .select('*, departments(name_ar)')
                .eq('is_active', true)
                .not('department_id', 'is', null);

            if (error) throw error;

            // جلب أعضاء كل لجنة
            if (committees && committees.length > 0) {
                for (const committee of committees) {
                    const { data: members } = await sb
                        .from('user_roles')
                        .select('user_id, roles(role_name_ar, role_level), profiles!user_roles_user_id_fkey(full_name, avatar_url)')
                        .eq('committee_id', committee.id)
                        .eq('is_active', true);
                    committee.members = (members || []).sort((a, b) => (b.roles?.role_level || 0) - (a.roles?.role_level || 0));
                    committee.members_count = committee.members.length;
                }
            }

            if (!committees || committees.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state__icon"><i class="fa-solid fa-people-group"></i></div><p class="empty-state__title">لا توجد لجان</p></div>';
                return;
            }

            container.innerHTML = committees.map(committee => {
                const cmLeader  = committee.members.find(m => m.roles?.role_level === 6);
                const cmDeputy  = committee.members.find(m => m.roles?.role_level === 5);

                const avatarStackHtml = committee.members.map(m => {
                    const name   = m.profiles?.full_name || '؟';
                    const avatar = m.profiles?.avatar_url ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3d8fd6&color=fff&size=64`;
                    return `<img class="uc-card__avatar-item" src="${avatar}" alt="${name}" title="${name}" />`;
                }).join('');

                return `
                <div class="uc-card" data-committee-id="${committee.id}">
                    <div class="uc-card__header">
                        <div class="uc-card__header-inner">
                            <div class="uc-card__icon">
                                <i class="fa-solid fa-people-group"></i>
                            </div>
                            <div class="uc-card__header-info">
                                <h3 class="uc-card__title">${committee.committee_name_ar}</h3>
                                <span class="uc-card__badge">
                                    <i class="fa-solid fa-users"></i>
                                    ${committee.members_count || 0} عضو
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="uc-card__body">
                        <div class="uc-card__info-item uc-card__info-item--full">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-align-right"></i></div>
                            <div class="uc-card__info-content">
                                <div class="uc-card__info-label">الوصف</div>
                                <div class="uc-card__info-value">${committee.description || 'لا يوجد وصف'}</div>
                            </div>
                        </div>
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-user-tie"></i></div>
                            <div class="uc-card__info-content">
                                <div class="uc-card__info-label">قائد اللجنة</div>
                                <div class="uc-card__info-value">${cmLeader?.profiles?.full_name || 'لم يُعيَّن بعد'}</div>
                            </div>
                        </div>
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-user-shield"></i></div>
                            <div class="uc-card__info-content">
                                <div class="uc-card__info-label">نائب اللجنة</div>
                                <div class="uc-card__info-value">${cmDeputy?.profiles?.full_name || 'لم يُعيَّن بعد'}</div>
                            </div>
                        </div>
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-layer-group"></i></div>
                            <div class="uc-card__info-content">
                                <div class="uc-card__info-label">القسم</div>
                                <div class="uc-card__info-value">${committee.departments?.name_ar ? 'تابع لقسم ' + committee.departments.name_ar.replace(/^قسم\s+/, '') : 'غير محدد'}</div>
                            </div>
                        </div>
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-filter"></i></div>
                            <div class="uc-card__info-content">
                                <div class="uc-card__info-label">التصنيف</div>
                                <div class="uc-card__info-value">تابع للمجلس التنفيذي</div>
                            </div>
                        </div>
                        ${committee.group_link ? `
                        <div class="uc-card__info-item uc-card__info-item--full uc-card__info-item--link">
                            <div class="uc-card__info-icon"><i class="fa-brands fa-whatsapp"></i></div>
                            <div class="uc-card__info-content">
                                <div class="uc-card__info-label">رابط القروب</div>
                                <div class="uc-card__info-value">${committee.group_link}</div>
                            </div>
                            <button class="uc-card__link-btn" onclick="event.stopPropagation(); window.open('${committee.group_link}','_blank')" title="فتح الرابط">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                            </button>
                        </div>` : ''}
                        ${committee.members.length > 0 ? `
                        <div class="uc-card__members">
                            <span class="uc-card__members-label">الأعضاء</span>
                            <div class="uc-card__avatar-stack">
                                ${avatarStackHtml}
                            </div>
                        </div>` : ''}
                    </div>
                    <div class="uc-card__footer">
                        <button class="btn btn-primary " onclick="viewCommittee(${committee.id})">
                            <i class="fa-solid fa-eye"></i>
                            عرض التفاصيل
                        </button>
                        <button class="btn btn-warning " onclick="editCommittee(${committee.id})">
                            <i class="fa-solid fa-pen"></i>
                            تعديل
                        </button>
                    </div>
                </div>`;
            }).join('');
            requestAnimationFrame(() => refreshAvatarStacks(container));
        } catch (error) {
            console.error('Error loading committees:', error);
            container.innerHTML = '<div class="error-state">حدث خطأ أثناء تحميل اللجان</div>';
        } finally {
            showLoading(false);
        }
    }

    async function loadAdminCommittees() {
        const container = document.getElementById('adminCommitteesGrid');
        if (!container) return;

        try {
            const { data: committees, error } = await sb
                .from('committees')
                .select('*')
                .eq('is_active', true)
                .is('department_id', null);

            if (error) throw error;

            if (!committees || committees.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state__icon"><i class="fa-solid fa-building"></i></div><p class="empty-state__title">لا توجد إدارات</p></div>';
                return;
            }

            for (const committee of committees) {
                const { data: members } = await sb
                    .from('user_roles')
                    .select('user_id, roles(role_name_ar, role_level), profiles!user_roles_user_id_fkey(full_name, avatar_url)')
                    .eq('committee_id', committee.id)
                    .eq('is_active', true);
                committee.members = (members || []).sort((a, b) => (b.roles?.role_level || 0) - (a.roles?.role_level || 0));
                committee.members_count = committee.members.length;
            }

            container.innerHTML = committees.map(committee => {

                const leader = committee.members.find(m => m.roles?.role_level >= 8);

                const avatarStackHtml = committee.members.map(m => {
                    const name   = m.profiles?.full_name || '؟';
                    const avatar = m.profiles?.avatar_url ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&size=64`;
                    return `<img class="uc-card__avatar-item" src="${avatar}" alt="${name}" title="${name}" />`;
                }).join('');

                return `
                <div class="uc-card" data-committee-id="${committee.id}">
                    <div class="uc-card__header">
                        <div class="uc-card__header-inner">
                            <div class="uc-card__icon">
                                <i class="fa-solid fa-users-gear"></i>
                            </div>
                            <div class="uc-card__header-info">
                                <h3 class="uc-card__title">${committee.committee_name_ar}</h3>
                                <span class="uc-card__badge">
                                    <i class="fa-solid fa-users"></i>
                                    ${committee.members_count || 0} عضو
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="uc-card__body">
                        <div class="uc-card__info-item uc-card__info-item--full">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-align-right"></i></div>
                            <div class="uc-card__info-content">
                                <div class="uc-card__info-label">الوصف</div>
                                <div class="uc-card__info-value">${committee.description || 'لا يوجد وصف'}</div>
                            </div>
                        </div>
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-user-tie"></i></div>
                            <div class="uc-card__info-content">
                                <div class="uc-card__info-label">قائد الإدارة</div>
                                <div class="uc-card__info-value">${leader?.profiles?.full_name || 'لم يُعيَّن بعد'}</div>
                            </div>
                        </div>
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-filter"></i></div>
                            <div class="uc-card__info-content">
                                <div class="uc-card__info-label">التصنيف</div>
                                <div class="uc-card__info-value">تابع للمجلس الإداري</div>
                            </div>
                        </div>
                        ${committee.group_link ? `
                        <div class="uc-card__info-item uc-card__info-item--full uc-card__info-item--link">
                            <div class="uc-card__info-icon"><i class="fa-brands fa-whatsapp"></i></div>
                            <div class="uc-card__info-content">
                                <div class="uc-card__info-label">رابط القروب</div>
                                <div class="uc-card__info-value">${committee.group_link}</div>
                            </div>
                            <button class="uc-card__link-btn" onclick="event.stopPropagation(); window.open('${committee.group_link}','_blank')" title="فتح الرابط">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                            </button>
                        </div>` : ''}
                        ${committee.members.length > 0 ? `
                        <div class="uc-card__members">
                            <span class="uc-card__members-label">الأعضاء</span>
                            <div class="uc-card__avatar-stack">
                                ${avatarStackHtml}
                            </div>
                        </div>` : ''}
                    </div>
                    <div class="uc-card__footer">
                        <button class="btn btn-primary " onclick="viewCommittee(${committee.id})">
                            <i class="fa-solid fa-eye"></i>
                            عرض التفاصيل
                        </button>
                        <button class="btn btn-warning " onclick="editCommittee(${committee.id})">
                            <i class="fa-solid fa-pen"></i>
                            تعديل
                        </button>
                    </div>
                </div>`;
            }).join('');
            requestAnimationFrame(() => refreshAvatarStacks(container));
        } catch (error) {
            console.error('Error loading admin committees:', error);
            container.innerHTML = '<div class="error-state">حدث خطأ أثناء تحميل الإدارات</div>';
        }
    }

    // تهيئة قسم النشر الفوري
    async function initInstantPublishSection() {
        const REPORTS_COMMITTEE_ID = 18;
        
        // إعداد رفع صورة الغلاف مع نظام القص
        const imageContainer = document.getElementById('instantNewsImageUploadContainer');
        if (imageContainer && window.ImageUploadHelper) {
            imageContainer.innerHTML = window.ImageUploadHelper.createCoverImageUploader({
                inputId: 'instantNewsImageUpload',
                folder: 'news',
                required: true,
                aspectRatio: 16/9
            });
        } else if (imageContainer) {
            imageContainer.innerHTML = `<input type="url" id="instantNewsImageUrl" class="form-input" placeholder="رابط صورة الغلاف">`;
        }
        
        // إعداد معرض الصور (2-4 صور إجبارية) مع نظام القص
        const galleryContainer = document.getElementById('instantNewsGalleryContainer');
        if (galleryContainer && window.ImageUploadHelper) {
            galleryContainer.innerHTML = window.ImageUploadHelper.createNewsGalleryUploader({
                containerId: 'instantNewsGallery',
                minImages: 2,
                maxImages: 4,
                currentImages: [],
                folder: 'news/gallery',
                required: true
            });
        } else if (galleryContainer) {
            galleryContainer.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                    <div><label style="font-size: 0.85rem; color: #6b7280;">صورة 1</label><input type="url" id="galleryImage1" class="form-input" placeholder="رابط الصورة"></div>
                    <div><label style="font-size: 0.85rem; color: #6b7280;">صورة 2</label><input type="url" id="galleryImage2" class="form-input" placeholder="رابط الصورة"></div>
                    <div><label style="font-size: 0.85rem; color: #6b7280;">صورة 3</label><input type="url" id="galleryImage3" class="form-input" placeholder="رابط الصورة"></div>
                    <div><label style="font-size: 0.85rem; color: #6b7280;">صورة 4</label><input type="url" id="galleryImage4" class="form-input" placeholder="رابط الصورة"></div>
                </div>
            `;
        }
        
        // مستمع نموذج النشر
        const form = document.getElementById('instantPublishForm');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                const title = document.getElementById('instantNewsTitle').value.trim();
                const summary = document.getElementById('instantNewsSummary').value.trim();
                const content = document.getElementById('instantNewsContent').value.trim();
                const isFeatured = document.getElementById('instantNewsIsFeatured').checked;
                const coverPhotographer = document.getElementById('instantNewsCoverPhotographer')?.value.trim() || '';
                
                // الحصول على أسماء مصوري المعرض من الحقول الجديدة
                let galleryPhotographers = [];
                const galleryPhotographersInput = document.getElementById('instantNewsGallery_gallery_photographers');
                if (galleryPhotographersInput) {
                    try {
                        galleryPhotographers = JSON.parse(galleryPhotographersInput.value || '[]');
                    } catch (e) {
                        galleryPhotographers = [];
                    }
                }
                
                if (!title) {
                    Toast.warning('يرجى إدخال عنوان الخبر');
                    return;
                }

                if (!summary) {
                    Toast.warning('يرجى إدخال ملخص الخبر');
                    return;
                }

                if (!content) {
                    Toast.warning('يرجى إدخال محتوى الخبر');
                    return;
                }

                if (!coverPhotographer) {
                    Toast.warning('يرجى إدخال اسم مصور صورة الغلاف');
                    return;
                }
                
                // التحقق من صورة الغلاف
                const coverImageUrl = window.ImageUploadHelper?.getCoverImageUrl('instantNewsImageUpload');
                if (!coverImageUrl) {
                    Toast.warning('يرجى رفع صورة غلاف الخبر');
                    return;
                }
                
                // التحقق من معرض الصور (2-4 صور إجبارية)
                let galleryImages = [];
                const galleryUrlsInput = document.getElementById('instantNewsGallery_gallery_urls');
                if (galleryUrlsInput) {
                    try {
                        galleryImages = JSON.parse(galleryUrlsInput.value || '[]');
                    } catch (e) {
                        galleryImages = [];
                    }
                }
                
                if (galleryImages.length < 2) {
                    Toast.warning('يجب إضافة صورتين على الأقل في معرض الصور');
                    return;
                }

                const missingPhotographerIndex = galleryImages.findIndex((_, i) => !galleryPhotographers[i] || !String(galleryPhotographers[i]).trim());
                if (missingPhotographerIndex !== -1) {
                    Toast.warning(`يرجى إدخال اسم مصور الصورة رقم ${missingPhotographerIndex + 1} في المعرض`);
                    return;
                }
                
                const loadingToast = Toast.loading('جاري نشر الخبر...');
                try {
                    const newsData = {
                        title, summary, content, 
                        image_url: coverImageUrl,
                        gallery_images: galleryImages, 
                        cover_photographer: coverPhotographer,
                        gallery_photographers: galleryPhotographers,
                        is_featured: isFeatured,
                        status: 'published', 
                        workflow_status: 'published',
                        committee_id: REPORTS_COMMITTEE_ID, 
                        created_by: currentUser.id,
                        author_name: currentUser.full_name, 
                        authors: [currentUser.full_name],
                        published_at: new Date().toISOString(),
                        reviewed_by: currentUser.id, 
                        reviewed_at: new Date().toISOString()
                    };
                    
                    const { error } = await sb.from('news').insert([newsData]);
                    if (error) throw error;
                    
                    Toast.close(loadingToast);
                    Toast.success('تم نشر الخبر بنجاح!');

                    // إعادة تهيئة النموذج
                    form.reset();
                    initInstantPublishSection();

                    // الانتقال إلى تبويب الأخبار المنشورة
                    if (typeof navigateToSection === 'function') {
                        navigateToSection('news-published-section');
                    }
                } catch (error) {
                    Toast.close(loadingToast);
                    Toast.error('حدث خطأ: ' + error.message);
                }
            };
        }
        
        const featuredBtn = document.getElementById('instantNewsFeaturedBtn');
        const featuredInput = document.getElementById('instantNewsIsFeatured');
        if (featuredBtn && featuredInput) {
            const applyFeaturedState = (isOn) => {
                featuredInput.checked = isOn;
                featuredBtn.setAttribute('aria-pressed', String(isOn));
                featuredBtn.classList.toggle('btn-warning', isOn);
                featuredBtn.classList.toggle('btn-slate', !isOn);
                const labelSpan = featuredBtn.querySelector('span');
                if (labelSpan) {
                    labelSpan.textContent = isOn ? 'تم التمييز' : 'تمييز الخبر';
                }
            };
            applyFeaturedState(featuredInput.checked);
            featuredBtn.onclick = () => applyFeaturedState(!featuredInput.checked);
        }

        const clearBtn = document.getElementById('clearInstantNewsBtn');
        if (clearBtn) {
            clearBtn.onclick = () => {
                document.getElementById('instantPublishForm')?.reset();
                initInstantPublishSection();
            };
        }
    }

    // تحميل قسم أعمالنا
    async function loadWebsiteWorksSection() {
        const container = document.getElementById('websiteWorksGrid');
        if (!container) return;

        try {
            showLoading(true);
            await initializeOrderIfNeeded('works');
            const { data: works, error } = await sb
                .from('works')
                .select('*')
                .order('order', { ascending: true, nullsFirst: false });

            if (error) throw error;

            if (!works || works.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div><p class="empty-state__title">لا توجد أعمال</p></div>';
                return;
            }

            container.innerHTML = `<div class="uc-grid">${works.map((work, index) => `
                <div class="uc-card">
                    <div class="uc-card__header">
                        <div class="uc-card__header-inner">
                            <div class="uc-card__icon" style="overflow: hidden; padding: 0; border-radius: 14px;">
                                ${work.image_url ? `<img src="${work.image_url}" alt="${work.title}" style="width: 100%; height: 100%; object-fit: cover;" />` : '<i class="fa-solid fa-briefcase"></i>'}
                            </div>
                            <div class="uc-card__header-info">
                                <h4 class="uc-card__title">${work.title}</h4>
                                <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                                    ${work.category ? `<span class="uc-badge--info">${work.category}</span>` : ''}
                                    <span class="uc-badge--secondary"><i class="fa-solid fa-sort"></i> الترتيب: ${work.order || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="uc-card__footer">
                        <div class="order-buttons" style="margin: 0;">
                            <button class="btn-order" onclick="moveWorkUp('${work.id}', ${work.order || 0})" ${index === 0 ? 'disabled' : ''} title="تحريك لأعلى">
                                <i class="fa-solid fa-chevron-up"></i>
                            </button>
                            <button class="btn-order" onclick="moveWorkDown('${work.id}', ${work.order || 0})" ${index === works.length - 1 ? 'disabled' : ''} title="تحريك لأسفل">
                                <i class="fa-solid fa-chevron-down"></i>
                            </button>
                        </div>
                        <button class="btn btn-primary " onclick="editWork('${work.id}')">
                            <i class="fa-solid fa-edit"></i> تعديل
                        </button>
                        <button class="btn btn-danger " onclick="deleteWork('${work.id}')">
                            <i class="fa-solid fa-trash"></i> حذف
                        </button>
                    </div>
                </div>
            `).join('')}</div>`;
        } catch (error) {
            console.error('Error loading works:', error);
            container.innerHTML = '<div class="error-state">حدث خطأ أثناء تحميل الأعمال</div>';
        } finally {
            showLoading(false);
        }
    }

    // تحميل قسم الإنجازات
    async function loadWebsiteAchievementsSection() {
        const container = document.getElementById('websiteAchievementsGrid');
        if (!container) return;

        try {
            showLoading(true);
            await initializeOrderIfNeeded('achievements');
            const { data: achievements, error } = await sb
                .from('achievements')
                .select('*')
                .order('order', { ascending: true });

            if (error) throw error;

            if (!achievements || achievements.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div><p class="empty-state__title">لا توجد إنجازات</p></div>';
                return;
            }

            container.innerHTML = `<div class="uc-grid">${achievements.map((achievement, index) => `
                <div class="uc-card">
                    <div class="uc-card__header uc-card__header--warning">
                        <div class="uc-card__header-inner">
                            <div class="uc-card__icon">
                                <i class="${achievement.icon_class || 'fa-solid fa-trophy'}"></i>
                            </div>
                            <div class="uc-card__header-info">
                                <h4 class="uc-card__title">${achievement.label}</h4>
                                <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                                    <span class="uc-badge--secondary"><i class="fa-solid fa-hashtag"></i> ${achievement.count_number || 0}${achievement.plus_flag ? '+' : ''}</span>
                                    <span class="uc-badge--secondary"><i class="fa-solid fa-sort"></i> الترتيب: ${achievement.order || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="uc-card__footer">
                        <div class="order-buttons" style="margin: 0;">
                            <button class="btn-order" onclick="moveAchievementUp('${achievement.id}', ${achievement.order || 0})" ${index === 0 ? 'disabled' : ''} title="تحريك لأعلى">
                                <i class="fa-solid fa-chevron-up"></i>
                            </button>
                            <button class="btn-order" onclick="moveAchievementDown('${achievement.id}', ${achievement.order || 0})" ${index === achievements.length - 1 ? 'disabled' : ''} title="تحريك لأسفل">
                                <i class="fa-solid fa-chevron-down"></i>
                            </button>
                        </div>
                        <button class="btn btn-primary " onclick="editAchievement('${achievement.id}')">
                            <i class="fa-solid fa-edit"></i> تعديل
                        </button>
                        <button class="btn btn-danger " onclick="deleteAchievement('${achievement.id}')">
                            <i class="fa-solid fa-trash"></i> حذف
                        </button>
                    </div>
                </div>
            `).join('')}</div>`;
        } catch (error) {
            console.error('Error loading achievements:', error);
            container.innerHTML = '<div class="error-state">حدث خطأ أثناء تحميل الإنجازات</div>';
        } finally {
            showLoading(false);
        }
    }

    // تحميل قسم الشركاء
    async function loadWebsiteSponsorsSection() {
        const container = document.getElementById('websiteSponsorsGrid');
        if (!container) return;

        try {
            showLoading(true);
            await initializeOrderIfNeeded('sponsors');
            const { data: sponsors, error } = await sb
                .from('sponsors')
                .select('*')
                .order('order', { ascending: true });

            if (error) throw error;

            if (!sponsors || sponsors.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div><p class="empty-state__title">لا يوجد شركاء</p></div>';
                return;
            }

            container.innerHTML = `<div class="uc-grid">${sponsors.map((sponsor, index) => `
                <div class="uc-card">
                    <div class="uc-card__header ${sponsor.is_active !== false ? '' : 'uc-card__header--neutral'}">
                        <div class="uc-card__header-inner">
                            <div class="uc-card__icon" style="overflow: hidden; padding: 0; border-radius: 14px; background: rgba(255,255,255,0.9);">
                                ${(sponsor.logo_url || sponsor.logo) ? `<img src="${sponsor.logo_url || sponsor.logo}" alt="${sponsor.name}" style="width: 100%; height: 100%; object-fit: contain; padding: 4px;" />` : '<i class="fa-solid fa-handshake"></i>'}
                            </div>
                            <div class="uc-card__header-info">
                                <h4 class="uc-card__title">${sponsor.name}</h4>
                                <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                                    ${sponsor.badge ? `<span class="uc-badge--secondary">${sponsor.badge}</span>` : ''}
                                    <span class="uc-badge--${sponsor.is_active !== false ? 'success' : 'danger'}">${sponsor.is_active !== false ? 'نشط' : 'غير نشط'}</span>
                                    <span class="uc-badge--secondary"><i class="fa-solid fa-sort"></i> ${sponsor.order || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="uc-card__footer">
                        <div class="order-buttons" style="margin: 0;">
                            <button class="btn-order" onclick="moveSponsorUp('${sponsor.id}', ${sponsor.order || 0})" ${index === 0 ? 'disabled' : ''} title="تحريك لأعلى">
                                <i class="fa-solid fa-chevron-up"></i>
                            </button>
                            <button class="btn-order" onclick="moveSponsorDown('${sponsor.id}', ${sponsor.order || 0})" ${index === sponsors.length - 1 ? 'disabled' : ''} title="تحريك لأسفل">
                                <i class="fa-solid fa-chevron-down"></i>
                            </button>
                        </div>
                        <button class="btn btn-primary " onclick="editSponsor('${sponsor.id}')">
                            <i class="fa-solid fa-edit"></i> تعديل
                        </button>
                        <button class="btn btn-danger " onclick="deleteSponsor('${sponsor.id}')">
                            <i class="fa-solid fa-trash"></i> حذف
                        </button>
                    </div>
                </div>
            `).join('')}</div>`;
        } catch (error) {
            console.error('Error loading sponsors:', error);
            container.innerHTML = '<div class="error-state">حدث خطأ أثناء تحميل الشركاء</div>';
        } finally {
            showLoading(false);
        }
    }

    // تحميل قسم الأسئلة الشائعة
    async function loadWebsiteFaqSection() {
        const container = document.getElementById('websiteFaqGrid');
        if (!container) return;

        try {
            showLoading(true);
            await initializeOrderIfNeeded('faq');
            const { data: faqs, error } = await sb
                .from('faq')
                .select('*')
                .order('order', { ascending: true });

            if (error) throw error;

            if (!faqs || faqs.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div><p class="empty-state__title">لا توجد أسئلة شائعة</p></div>';
                return;
            }

            container.innerHTML = `<div class="uc-grid">${faqs.map((faq, index) => `
                <div class="uc-card">
                    <div class="uc-card__header uc-card__header--purple">
                        <div class="uc-card__header-inner">
                            <div class="uc-card__icon">
                                <i class="fa-solid fa-circle-question"></i>
                            </div>
                            <div class="uc-card__header-info">
                                <h4 class="uc-card__title">${faq.question}</h4>
                                <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                                    ${faq.category ? `<span class="uc-badge--secondary">${faq.category}</span>` : ''}
                                    <span class="uc-badge--${faq.is_active !== false ? 'success' : 'danger'}">${faq.is_active !== false ? 'نشط' : 'غير نشط'}</span>
                                    <span class="uc-badge--secondary"><i class="fa-solid fa-sort"></i> ${faq.order || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="uc-card__body">
                        <div class="uc-card__description">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-align-left"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">الإجابة</span>
                                <span class="uc-card__info-value">${faq.answer ? faq.answer.substring(0, 150) + (faq.answer.length > 150 ? '...' : '') : ''}</span>
                            </div>
                        </div>
                    </div>
                    <div class="uc-card__footer">
                        <div class="order-buttons" style="margin: 0;">
                            <button class="btn-order" onclick="moveFaqUp('${faq.id}', ${faq.order || 0})" ${index === 0 ? 'disabled' : ''} title="تحريك لأعلى">
                                <i class="fa-solid fa-chevron-up"></i>
                            </button>
                            <button class="btn-order" onclick="moveFaqDown('${faq.id}', ${faq.order || 0})" ${index === faqs.length - 1 ? 'disabled' : ''} title="تحريك لأسفل">
                                <i class="fa-solid fa-chevron-down"></i>
                            </button>
                        </div>
                        <button class="btn btn-primary " onclick="editFaq('${faq.id}')">
                            <i class="fa-solid fa-edit"></i> تعديل
                        </button>
                        <button class="btn btn-danger " onclick="deleteFaq('${faq.id}')">
                            <i class="fa-solid fa-trash"></i> حذف
                        </button>
                    </div>
                </div>
            `).join('')}</div>`;
        } catch (error) {
            console.error('Error loading FAQ:', error);
            container.innerHTML = '<div class="error-state">حدث خطأ أثناء تحميل الأسئلة الشائعة</div>';
        } finally {
            showLoading(false);
        }
    }

    // تحميل أعمالنا
    async function loadWebsiteWorks() {
        const container = document.getElementById('worksGrid');
        if (!container) return;

        try {
            const { data: works, error } = await sb
                .from('works')
                .select('*')
                .order('display_order', { ascending: true });

            if (error) throw error;

            if (!works || works.length === 0) {
                container.innerHTML = '<div class="empty-state">لا توجد أعمال حالياً</div>';
                return;
            }

            container.innerHTML = works.map(work => `
                <div class="card">
                    ${work.image_url ? `<img src="${work.image_url}" alt="${work.title}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px 8px 0 0;">` : ''}
                    <div style="padding: 1rem;">
                        <h3>${work.title}</h3>
                        ${work.category ? `<span class="badge">${work.category}</span>` : ''}
                        ${work.description ? `<p style="color: #64748b; margin: 0.5rem 0;">${work.description}</p>` : ''}
                        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                            <span class="badge ${work.is_published ? 'badge-success' : 'badge-warning'}">
                                ${work.is_published ? 'منشور' : 'مسودة'}
                            </span>
                            ${work.link_url ? `<a href="${work.link_url}" target="_blank" class=" btn-secondary">الرابط</a>` : ''}
                        </div>
                        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                            <button class=" btn-primary" onclick="editWork(${work.id})">تعديل</button>
                            <button class=" btn-danger" onclick="deleteWork(${work.id})">حذف</button>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading works:', error);
            container.innerHTML = '<div class="error-state">حدث خطأ أثناء تحميل الأعمال</div>';
        }
    }

    // تحميل الإنجازات
    async function loadWebsiteAchievements() {
        const container = document.getElementById('achievementsGrid');
        if (!container) return;

        try {
            const { data: achievements, error } = await sb
                .from('achievements')
                .select('*')
                .order('display_order', { ascending: true });

            if (error) throw error;

            if (!achievements || achievements.length === 0) {
                container.innerHTML = '<div class="empty-state">لا توجد إنجازات حالياً</div>';
                return;
            }

            container.innerHTML = achievements.map(achievement => `
                <div class="card">
                    ${achievement.image_url ? `<img src="${achievement.image_url}" alt="${achievement.title}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px 8px 0 0;">` : ''}
                    <div style="padding: 1rem;">
                        <h3>${achievement.title}</h3>
                        ${achievement.category ? `<span class="badge">${achievement.category}</span>` : ''}
                        ${achievement.description ? `<p style="color: #64748b; margin: 0.5rem 0;">${achievement.description}</p>` : ''}
                        ${achievement.achievement_date ? `<p style="color: #64748b; font-size: 0.9rem;"><i class="fa-solid fa-calendar"></i> ${new Date(achievement.achievement_date).toLocaleDateString('ar-SA')}</p>` : ''}
                        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                            <button class=" btn-primary" onclick="editAchievement(${achievement.id})">تعديل</button>
                            <button class=" btn-danger" onclick="deleteAchievement(${achievement.id})">حذف</button>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading achievements:', error);
            container.innerHTML = '<div class="error-state">حدث خطأ أثناء تحميل الإنجازات</div>';
        }
    }

    // تحميل الشركاء
    async function loadWebsiteSponsors() {
        const container = document.getElementById('sponsorsGrid');
        if (!container) return;

        try {
            const { data: sponsors, error } = await sb
                .from('sponsors')
                .select('*')
                .order('display_order', { ascending: true });

            if (error) throw error;

            if (!sponsors || sponsors.length === 0) {
                container.innerHTML = '<div class="empty-state">لا يوجد شركاء حالياً</div>';
                return;
            }

            container.innerHTML = sponsors.map(sponsor => `
                <div class="card">
                    ${sponsor.logo_url || sponsor.logo ? `<img src="${sponsor.logo_url || sponsor.logo}" alt="${sponsor.name}" style="width: 100%; height: 150px; object-fit: contain; padding: 1rem; background: #f8fafc;">` : ''}
                    <div style="padding: 1rem;">
                        <h3>${sponsor.name}</h3>
                        ${sponsor.badge ? `<span class="badge badge-gold">${sponsor.badge}</span>` : ''}
                        ${sponsor.description ? `<p style="color: #64748b; margin: 0.5rem 0;">${sponsor.description}</p>` : ''}
                        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                            <span class="badge ${sponsor.is_active ? 'badge-success' : 'badge-warning'}">
                                ${sponsor.is_active ? 'نشط' : 'غير نشط'}
                            </span>
                            ${sponsor.link_url || sponsor.link ? `<a href="${sponsor.link_url || sponsor.link}" target="_blank" class=" btn-secondary">الموقع</a>` : ''}
                        </div>
                        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                            <button class=" btn-primary" onclick="editSponsor(${sponsor.id})">تعديل</button>
                            <button class=" btn-danger" onclick="deleteSponsor(${sponsor.id})">حذف</button>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading sponsors:', error);
            container.innerHTML = '<div class="error-state">حدث خطأ أثناء تحميل الشركاء</div>';
        }
    }

    // تحميل الأسئلة الشائعة
    async function loadWebsiteFaq() {
        const container = document.getElementById('faqList');
        if (!container) return;

        try {
            const { data: faqs, error } = await sb
                .from('faq')
                .select('*')
                .order('display_order', { ascending: true });

            if (error) throw error;

            if (!faqs || faqs.length === 0) {
                container.innerHTML = '<div class="empty-state">لا توجد أسئلة شائعة حالياً</div>';
                return;
            }

            container.innerHTML = faqs.map(faq => `
                <div class="card" style="margin-bottom: 1rem;">
                    <div style="padding: 1rem;">
                        <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem;">
                            <div style="flex: 1;">
                                <h4 style="margin-bottom: 0.5rem;">${faq.question}</h4>
                                ${faq.category ? `<span class="badge">${faq.category}</span>` : ''}
                                <p style="color: #64748b; margin: 0.5rem 0;">${faq.answer}</p>
                                <span class="badge ${faq.is_active ? 'badge-success' : 'badge-warning'}">
                                    ${faq.is_active ? 'نشط' : 'غير نشط'}
                                </span>
                            </div>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class=" btn-primary" onclick="editFaq(${faq.id})">تعديل</button>
                                <button class=" btn-danger" onclick="deleteFaq(${faq.id})">حذف</button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading FAQ:', error);
            container.innerHTML = '<div class="error-state">حدث خطأ أثناء تحميل الأسئلة الشائعة</div>';
        }
    }

    function setupEventListeners() {
        // القائمة الجانبية
        const toggleSidebar = document.getElementById('toggleSidebar');
        const closeSidebar = document.getElementById('closeSidebar');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        
        if (toggleSidebar && sidebar) {
            toggleSidebar.addEventListener('click', () => {
                const isActive = sidebar.classList.toggle('active');
                if (overlay) overlay.classList.toggle('active');
                
                // منع scroll عند فتح sidebar في الشاشات الصغيرة
                if (window.innerWidth < 1024) {
                    document.body.style.overflow = isActive ? 'hidden' : '';
                }
            });
        }
        
        if (closeSidebar && sidebar) {
            closeSidebar.addEventListener('click', () => {
                sidebar.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
                
                // إعادة scroll
                if (window.innerWidth < 1024) {
                    document.body.style.overflow = '';
                }
            });
        }
        
        if (overlay && sidebar) {
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
                
                // إعادة scroll
                if (window.innerWidth < 1024) {
                    document.body.style.overflow = '';
                }
            });
        }
        
        // إغلاق القائمة الجانبية عند تصغير نافذة المتصفح
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 1145 && sidebar) {
                sidebar.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });

        // تسجيل الخروج (من sidebar footer)
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await window.AuthManager.logout();
            });
        }
        
        // تحديث النشاطات
        const refreshActivities = document.getElementById('refreshActivities');
        if (refreshActivities) {
            refreshActivities.addEventListener('click', loadRecentActivities);
        }
        
        // روابط مجموعات أدِيب
        setupGroupLinks();
        
        // إعداد مركز الإشعارات
        setupNotificationsCenter();
        
        // زر تحديث الأعضاء المعلقين
        const refreshPendingMembersBtn = document.getElementById('refreshPendingMembersBtn');
        if (refreshPendingMembersBtn) {
            refreshPendingMembersBtn.addEventListener('click', async () => {
                if (window.pendingMembersManagerInstance) {
                    await window.pendingMembersManagerInstance.init('pendingMembersContainer');
                }
            });
        }

        // نافذة إضافة مستخدم
        const addUserBtn = document.getElementById('addUserBtn');
        const userModal = document.getElementById('userModal');
        const closeUserModal = document.getElementById('closeUserModal');
        const cancelUserBtn = document.getElementById('cancelUserBtn');
        const userForm = document.getElementById('userForm');

        if (addUserBtn) {
            addUserBtn.addEventListener('click', async () => {
                await openUserModal();
            });
        }

        // زر إهداء العضوية في قسم باب التسجيل
        const addGiftMembershipBtn = document.getElementById('addGiftMembershipBtn');
        if (addGiftMembershipBtn) {
            addGiftMembershipBtn.addEventListener('click', async () => {
                await openUserModal();
            });
        }

        if (closeUserModal) {
            closeUserModal.addEventListener('click', () => {
                const backdrop = document.getElementById('userModalBackdrop');
                userModal.classList.remove('active');
                if (backdrop) backdrop.classList.remove('active');
                document.body.classList.remove('modal-open');
            });
        }

        if (cancelUserBtn) {
            cancelUserBtn.addEventListener('click', () => {
                const backdrop = document.getElementById('userModalBackdrop');
                userModal.classList.remove('active');
                if (backdrop) backdrop.classList.remove('active');
                document.body.classList.remove('modal-open');
            });
        }

        if (userForm) {
            userForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleUserSubmit();
            });
        }

        // نافذة إضافة مشروع
        const addProjectBtn = document.getElementById('addProjectBtn');
        const projectModal = document.getElementById('projectModal');
        const closeProjectModal = document.getElementById('closeProjectModal');
        const cancelProjectBtn = document.getElementById('cancelProjectBtn');
        const projectForm = document.getElementById('projectForm');

        if (addProjectBtn) {
            addProjectBtn.addEventListener('click', async () => {
                await openProjectModal();
            });
        }

        if (closeProjectModal) {
            closeProjectModal.addEventListener('click', () => {
                projectModal.classList.remove('active');
            });
        }

        if (cancelProjectBtn) {
            cancelProjectBtn.addEventListener('click', () => {
                projectModal.classList.remove('active');
            });
        }

        if (projectForm) {
            projectForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleProjectSubmit();
            });
        }

        // نافذة إضافة مهمة
        const addTaskBtn = document.getElementById('addTaskBtn');
        const taskModal = document.getElementById('taskModal');
        const closeTaskModal = document.getElementById('closeTaskModal');
        const cancelTaskBtn = document.getElementById('cancelTaskBtn');
        const taskForm = document.getElementById('taskForm');

        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', async () => {
                await openTaskModal();
            });
        }

        if (closeTaskModal) {
            closeTaskModal.addEventListener('click', () => {
                taskModal.classList.remove('active');
            });
        }

        if (cancelTaskBtn) {
            cancelTaskBtn.addEventListener('click', () => {
                taskModal.classList.remove('active');
            });
        }

        if (taskForm) {
            taskForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleTaskSubmit();
            });
        }

        // نافذة إضافة اجتماع
        const addMeetingBtn = document.getElementById('addMeetingBtn');
        const meetingModal = document.getElementById('meetingModal');
        const closeMeetingModal = document.getElementById('closeMeetingModal');
        const cancelMeetingBtn = document.getElementById('cancelMeetingBtn');
        const meetingForm = document.getElementById('meetingForm');

        if (addMeetingBtn) {
            addMeetingBtn.addEventListener('click', async () => {
                await openMeetingModal();
            });
        }

        if (closeMeetingModal) {
            closeMeetingModal.addEventListener('click', () => {
                meetingModal.classList.remove('active');
            });
        }

        if (cancelMeetingBtn) {
            cancelMeetingBtn.addEventListener('click', () => {
                meetingModal.classList.remove('active');
            });
        }

        if (meetingForm) {
            meetingForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleMeetingSubmit();
            });
        }

        // نافذة إنشاء تقرير
        const generateReportBtn = document.getElementById('generateReportBtn');
        const reportModal = document.getElementById('reportModal');
        const closeReportModal = document.getElementById('closeReportModal');
        const cancelReportBtn = document.getElementById('cancelReportBtn');
        const reportForm = document.getElementById('reportForm');
        const reportTypeSelect = document.getElementById('reportType');

        if (generateReportBtn) {
            generateReportBtn.addEventListener('click', async () => {
                await openReportModal();
            });
        }

        if (closeReportModal) {
            closeReportModal.addEventListener('click', () => {
                reportModal.classList.remove('active');
            });
        }

        if (cancelReportBtn) {
            cancelReportBtn.addEventListener('click', () => {
                reportModal.classList.remove('active');
            });
        }

        if (reportForm) {
            reportForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleReportSubmit();
            });
        }

        // إظهار/إخفاء حقل اللجنة حسب نوع التقرير
        if (reportTypeSelect) {
            reportTypeSelect.addEventListener('change', (e) => {
                const committeeGroup = document.getElementById('reportCommitteeGroup');
                if (committeeGroup) {
                    committeeGroup.style.display = e.target.value === 'committee' ? 'block' : 'none';
                }
            });
        }

        // تغيير الدور - إظهار/إخفاء اللجنة
        const userRoleSelect = document.getElementById('userRoleSelect');
        if (userRoleSelect) {
            userRoleSelect.addEventListener('change', (e) => {
                const selectedOption = e.target.options[e.target.selectedIndex];
                const needsCommittee = selectedOption.dataset.needsCommittee === 'true';
                const committeeGroup = document.getElementById('committeeGroup');
                if (committeeGroup) {
                    committeeGroup.style.display = needsCommittee ? 'block' : 'none';
                }
            });
        }

        // نماذج محتوى الموقع
        // نافذة العمل
        const workModal = document.getElementById('workModal');
        const closeWorkModal = document.getElementById('closeWorkModal');
        const cancelWorkBtn = document.getElementById('cancelWorkBtn');
        const workForm = document.getElementById('workForm');

        if (closeWorkModal) {
            closeWorkModal.addEventListener('click', () => {
                workModal.classList.remove('active');
            });
        }

        if (cancelWorkBtn) {
            cancelWorkBtn.addEventListener('click', () => {
                workModal.classList.remove('active');
            });
        }

        if (workForm) {
            workForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleWorkSubmit();
            });
        }

        // نافذة الإنجاز
        const achievementModal = document.getElementById('achievementModal');
        const closeAchievementModal = document.getElementById('closeAchievementModal');
        const cancelAchievementBtn = document.getElementById('cancelAchievementBtn');
        const achievementForm = document.getElementById('achievementForm');

        if (closeAchievementModal) {
            closeAchievementModal.addEventListener('click', () => {
                achievementModal.classList.remove('active');
            });
        }

        if (cancelAchievementBtn) {
            cancelAchievementBtn.addEventListener('click', () => {
                achievementModal.classList.remove('active');
            });
        }

        if (achievementForm) {
            achievementForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleAchievementSubmit();
            });
        }

        // نافذة الشريك
        const sponsorModal = document.getElementById('sponsorModal');
        const closeSponsorModal = document.getElementById('closeSponsorModal');
        const cancelSponsorBtn = document.getElementById('cancelSponsorBtn');
        const sponsorForm = document.getElementById('sponsorForm');

        if (closeSponsorModal) {
            closeSponsorModal.addEventListener('click', () => {
                sponsorModal.classList.remove('active');
            });
        }

        if (cancelSponsorBtn) {
            cancelSponsorBtn.addEventListener('click', () => {
                sponsorModal.classList.remove('active');
            });
        }

        if (sponsorForm) {
            sponsorForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleSponsorSubmit();
            });
        }

        // نافذة السؤال الشائع
        const faqModal = document.getElementById('faqModal');
        const closeFaqModal = document.getElementById('closeFaqModal');
        const cancelFaqBtn = document.getElementById('cancelFaqBtn');
        const faqForm = document.getElementById('faqForm');

        if (closeFaqModal) {
            closeFaqModal.addEventListener('click', () => {
                faqModal.classList.remove('active');
            });
        }

        if (cancelFaqBtn) {
            cancelFaqBtn.addEventListener('click', () => {
                faqModal.classList.remove('active');
            });
        }

        if (faqForm) {
            faqForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleFaqSubmit();
            });
        }
        
        // إعداد نماذج إدارة الموقع
        setupWebsiteModals();
    }

    // فتح نافذة إضافة مستخدم (عضوية هدية)
    async function openUserModal(userId = null) {
        const modal = document.getElementById('userModal');
        const backdrop = document.getElementById('userModalBackdrop');
        const title = document.getElementById('userModalTitle');
        const form = document.getElementById('userForm');

        if (userId) {
            // وضع التعديل غير مدعوم في نظام العضوية الهدية
            if (window.Toast) {
                window.Toast.show({ message: 'لا يمكن تعديل المستخدمين من هنا. استخدم قسم إدارة المستخدمين.', type: 'warning' });
            }
            return;
        } else {
            title.textContent = 'إهداء العضوية';
            form.reset();
            delete form.dataset.userId;
        }

        // تحميل اللجان فقط
        await loadCommitteesOptions();
        
        // فتح النافذة مع backdrop
        document.body.classList.add('modal-open');
        setTimeout(() => {
            if (backdrop) backdrop.classList.add('active');
            modal.classList.add('active');
        }, 10);
    }

    // تحميل خيارات الأدوار
    async function loadRolesOptions() {
        console.log('loadRolesOptions called');
        const select = document.getElementById('userRoleSelect');
        console.log('userRoleSelect element:', select);
        
        if (!select) {
            console.error('userRoleSelect element not found');
            return;
        }

        try {
            console.log('Loading roles from database...');
            const { data: roles, error } = await sb
                .from('roles')
                .select('*')
                .order('role_level', { ascending: false });

            if (error) {
                console.error('Error loading roles:', error);
                return;
            }

            console.log('Roles loaded:', roles);
            console.log('Current select innerHTML before:', select.innerHTML);

            if (roles && roles.length > 0) {
                let optionsHTML = '<option value="">اختر الدور</option>';
                roles.forEach(role => {
                    const needsCommittee = ['committee_leader', 'deputy_committee_leader', 'committee_member', 'hr_admin_member', 'qa_admin_member'].includes(role.role_name);
                    optionsHTML += `<option value="${role.id}" data-needs-committee="${needsCommittee}">${role.role_name_ar}</option>`;
                });
                select.innerHTML = optionsHTML;
                console.log('Current select innerHTML after:', select.innerHTML);
                console.log('Select has', select.children.length, 'options');
            } else {
                console.warn('No roles found in database');
                select.innerHTML = '<option value="">اختر الدور</option>';
            }
        } catch (error) {
            console.error('Exception loading roles:', error);
        }
    }

    // تحميل خيارات اللجان
    async function loadCommitteesOptions() {
        const select = document.getElementById('userCommitteeSelect');
        if (!select) return;

        try {
            const { data: committees, error } = await sb
                .from('committees')
                .select('*')
                .eq('is_active', true)
                .order('committee_name_ar');

            if (error) {
                console.error('Error loading committees:', error);
                return;
            }

            if (committees && committees.length > 0) {
                let optionsHTML = '<option value="">اختر اللجنة</option>';
                committees.forEach(committee => {
                    optionsHTML += `<option value="${committee.id}">${committee.committee_name_ar}</option>`;
                });
                select.innerHTML = optionsHTML;
            } else {
                select.innerHTML = '<option value="">اختر اللجنة</option>';
            }
        } catch (error) {
            console.error('Exception loading committees:', error);
        }
    }

    // التحقق من صحة الاسم الكامل
    function validateFullName(fullName) {
        // إزالة المسافات من البداية والنهاية
        const trimmedName = fullName.trim();
        
        // التحقق من وجود مسافات في البداية أو النهاية
        if (fullName !== trimmedName) {
            return {
                valid: false,
                message: 'الاسم يحتوي على مسافات في البداية أو النهاية'
            };
        }
        
        // التحقق من المسافات المتكررة
        if (/\s{2,}/.test(fullName)) {
            return {
                valid: false,
                message: 'الاسم يحتوي على مسافات متكررة'
            };
        }
        
        // التحقق من أن الاسم يحتوي على حروف عربية ومسافات فقط
        const arabicOnlyRegex = /^[\u0600-\u06FF\s]+$/;
        if (!arabicOnlyRegex.test(fullName)) {
            return {
                valid: false,
                message: 'الاسم يجب أن يحتوي على حروف عربية فقط (بدون أرقام أو رموز أو حروف إنجليزية)'
            };
        }
        
        // تقسيم الاسم إلى كلمات
        const nameParts = fullName.split(' ').filter(part => part.length > 0);
        
        // التحقق من عدد الكلمات (3 أو 4 فقط)
        if (nameParts.length < 3) {
            return {
                valid: false,
                message: 'الاسم يجب أن يكون ثلاثياً على الأقل (3 كلمات)'
            };
        }
        
        if (nameParts.length > 4) {
            return {
                valid: false,
                message: 'الاسم يجب أن لا يزيد عن 4 كلمات'
            };
        }
        
        // الاسم صحيح
        return {
            valid: true,
            message: ''
        };
    }

    // معالجة إرسال نموذج المستخدم (عضوية هدية)
    async function handleUserSubmit() {
        const form = document.getElementById('userForm');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        const fullName = document.getElementById('userFullName').value;
        const email = document.getElementById('userEmail').value;
        const committeeId = document.getElementById('userCommitteeSelect').value;

        // التحقق من صحة الاسم الكامل
        const nameValidation = validateFullName(fullName);
        if (!nameValidation.valid) {
            if (window.Toast) {
                window.Toast.error(nameValidation.message);
            } else {
                alert(nameValidation.message);
            }
            return;
        }

        if (!committeeId) {
            if (window.Toast) {
                window.Toast.warning('يرجى اختيار اللجنة');
            } else {
                alert('يرجى اختيار اللجنة');
            }
            return;
        }

        try {
            // منع الضغط المتكرر
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.style.opacity = '0.6';
                submitBtn.style.cursor = 'not-allowed';
            }

            // عرض toast للتحميل
            let loadingToast;
            if (window.Toast) {
                loadingToast = window.Toast.loading('جاري إهداء العضوية...');
            }
            
            showLoading(true);

            // 1. إنشاء حساب مستخدم جديد بكلمة مرور عشوائية مؤقتة
            const tempPassword = Math.random().toString(36).slice(-12) + 'Aa1!';
            
            // استخدام admin.createUser بدلاً من signUp لتجنب إرسال بريد التأكيد التلقائي
            const { data: { session: adminSession } } = await sb.auth.getSession();
            if (!adminSession) {
                throw new Error('يجب تسجيل الدخول كمسؤول');
            }

            // استدعاء Edge Function لإنشاء المستخدم بشكل صحيح
            const createUserResponse = await fetch(`${window.SUPABASE_URL}/functions/v1/create-member-directly`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${adminSession.access_token}`,
                    'Content-Type': 'application/json',
                    'apikey': window.SUPABASE_ANON_KEY
                },
                body: JSON.stringify({
                    email: email,
                    password: tempPassword,
                    full_name: fullName,
                    committee_id: committeeId
                })
            });

            if (!createUserResponse.ok) {
                const errorData = await createUserResponse.json();
                throw new Error(errorData.error || 'فشل إنشاء المستخدم');
            }

            const { user_id: newUserId, token } = await createUserResponse.json();

            if (!newUserId) {
                throw new Error('فشل إنشاء المستخدم');
            }

            // 2. إرسال رسالة القبول عبر Edge Function
            try {
                const { data: { session } } = await sb.auth.getSession();
                if (session && newUserId) {
                    const response = await fetch(
                        `${sb.supabaseUrl}/functions/v1/resend-onboarding-email`,
                        {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${session.access_token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ 
                                user_id: newUserId
                            })
                        }
                    );

                    if (!response.ok) {
                        const errorData = await response.json();
                        console.error('Failed to send onboarding email:', errorData);
                    } else {
                        console.log('Onboarding email sent successfully');
                    }
                }
            } catch (emailError) {
                console.error('Email sending error:', emailError);
            }

            // 3. تسجيل النشاط
            try {
                await window.AuthManager.logActivity(currentUser.id, 'create_gift_membership', 'user', newUserId, {
                    user_email: email,
                    committee_id: committeeId
                });
            } catch (activityError) {
                console.error('Activity log error:', activityError);
            }

            // إخفاء toast التحميل
            if (loadingToast && window.Toast) {
                window.Toast.close(loadingToast);
            }

            // عرض رسالة النجاح
            if (window.Toast) {
                window.Toast.success('تم منح العضوية بنجاح! تم إرسال رسالة قبول للعضو على البريد الإلكتروني لإكمال التسجيل.');
            } else {
                alert('تم منح العضوية بنجاح!\n\nتم إرسال رسالة قبول للعضو على البريد الإلكتروني لإكمال التسجيل.');
            }

            // إغلاق النافذة وتحديث القائمة
            const modal = document.getElementById('userModal');
            const backdrop = document.getElementById('userModalBackdrop');
            modal.classList.remove('active');
            if (backdrop) backdrop.classList.remove('active');
            document.body.classList.remove('modal-open');
            form.reset();
            if (window.usersManagerInstance) {
                await window.usersManagerInstance.init();
            }

        } catch (error) {
            console.error('Error creating gift membership:', error);
            
            // إخفاء toast التحميل
            if (loadingToast && window.Toast) {
                window.Toast.close(loadingToast);
            }
            
            // عرض رسالة الخطأ
            if (window.Toast) {
                window.Toast.error('حدث خطأ: ' + (error.message || 'خطأ غير معروف'));
            } else {
                alert('حدث خطأ: ' + (error.message || 'خطأ غير معروف'));
            }
        } finally {
            showLoading(false);
            
            // إعادة تفعيل الزر
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
            }
        }
    }

    // دالة تعديل مستخدم (يجب أن تكون global)
    window.editUser = async function(userId) {
        await openUserModal(userId);
    };

    // دالة حذف مستخدم
    window.deleteUser = async function(userId) {
        if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
            return;
        }

        try {
            showLoading(true);

            // تعطيل المستخدم بدلاً من حذفه
            const { error } = await sb
                .from('profiles')
                .update({ account_status: 'inactive' })
                .eq('id', userId);

            if (error) throw error;

            // تسجيل النشاط
            await window.AuthManager.logActivity(currentUser.id, 'deactivate_user', 'user', userId);

            await loadUsers();
            alert('تم تعطيل المستخدم بنجاح');

        } catch (error) {
            console.error('Error deleting user:', error);
            alert('حدث خطأ: ' + error.message);
        } finally {
            showLoading(false);
        }
    };

    // فتح نافذة تعديل لجنة
    async function openCommitteeModal(committeeId) {
        try {
            showLoading(true);

            const { data: committee, error } = await sb
                .from('committees')
                .select('*')
                .eq('id', committeeId)
                .single();

            if (error) throw error;

            const isAdmin = !committee.department_id;
            const entityLabel = isAdmin ? 'الإدارة' : 'اللجنة';
            const entityIcon  = isAdmin ? 'fa-users-gear' : 'fa-people-group';

            const formHtml = `
                <div class="modal-form-grid">
                    <div class="form-group full-width">
                        <label class="form-label">
                            <span class="label-icon"><i class="fa-solid ${entityIcon}"></i></span>
                            اسم ${entityLabel}
                        </label>
                        <input type="text" id="cm-name" class="form-input" value="${committee.committee_name_ar || ''}" readonly />
                    </div>
                    <div class="form-group full-width">
                        <label class="form-label">
                            <span class="label-icon"><i class="fa-solid fa-align-right"></i></span>
                            الوصف
                        </label>
                        <textarea id="cm-description" rows="3" class="form-input form-textarea" placeholder="وصف اللجنة...">${committee.description || ''}</textarea>
                    </div>
                    <div class="form-group full-width">
                        <label class="form-label">
                            <span class="label-icon"><i class="fa-brands fa-whatsapp"></i></span>
                            رابط القروب <span class="required-dot">*</span>
                        </label>
                        <input type="url" id="cm-grouplink" class="form-input" value="${committee.group_link || ''}" placeholder="https://chat.whatsapp.com/..." required />
                    </div>
                </div>
            `;

            const footer = `
                <button class="btn btn-outline" onclick="closeModal()">
                    <i class="fa-solid fa-times"></i>
                    إلغاء
                </button>
                <button class="btn btn-warning" onclick="window._submitCommitteeEdit(${committeeId})">
                    <i class="fa-solid fa-save"></i>
                    حفظ التعديلات
                </button>
            `;

            window._submitCommitteeEdit = async (id) => {
                const description = document.getElementById('cm-description').value.trim() || null;
                const groupLink   = document.getElementById('cm-grouplink').value.trim() || null;

                if (!groupLink) {
                    document.getElementById('cm-grouplink').focus();
                    return;
                }
                if ((description ?? '') === (committee.description ?? '') && (groupLink ?? '') === (committee.group_link ?? '')) {
                    window.Toast.show({ type: 'info', title: 'لا تغييرات', message: 'لم تقم بأي تعديل' });
                    return;
                }

                try {
                    showLoading(true);
                    const { error } = await sb
                        .from('committees')
                        .update({ description, group_link: groupLink })
                        .eq('id', id);

                    if (error) throw error;

                    window.closeModal();
                    await loadCommittees();
                    window.Toast.show({ type: 'success', title: 'تم الحفظ', message: 'تم تحديث بيانات اللجنة بنجاح' });
                } catch (err) {
                    console.error('Error updating committee:', err);
                    window.showErrorModal('خطأ', 'حدث خطأ أثناء حفظ التعديلات');
                } finally {
                    showLoading(false);
                }
            };

            window.openModal(`تعديل ${entityLabel}`, formHtml, {
                icon: 'fa-pen',
                variant: 'warning',
                footer
            });

        } catch (error) {
            console.error('Error loading committee:', error);
            window.showErrorModal('خطأ', 'فشل تحميل بيانات اللجنة');
        } finally {
            showLoading(false);
        }
    }

    // دالة عرض لجنة
    window.editCommittee = function(committeeId) {
        openCommitteeModal(committeeId);
    };

    window.viewCommittee = async function(committeeId) {
        try {
            showLoading(true);

            const { data: committee, error: committeeError } = await sb
                .from('committees')
                .select('*, departments(name_ar)')
                .eq('id', committeeId)
                .single();

            if (committeeError) throw committeeError;

            const { data: members, error: membersError } = await sb
                .from('user_roles')
                .select('user_id, profiles!user_roles_user_id_fkey(full_name, avatar_url), roles(role_name_ar)')
                .eq('committee_id', committeeId)
                .eq('is_active', true);

            if (membersError) console.warn('Error loading members:', membersError);

            const membersHtml = members && members.length > 0
                ? members.map(member => {
                    const name   = member.profiles?.full_name || 'غير محدد';
                    const avatar = member.profiles?.avatar_url ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3d8fd6&color=fff`;
                    const role   = member.roles?.role_name_ar || '';
                    return `
                    <div class="modal-detail-item" style="flex-direction:row;align-items:center;gap:0.75rem;">
                        <img src="${avatar}" alt="${name}"
                             style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0;" />
                        <div style="min-width:0;">
                            <div class="modal-detail-value" style="font-size:0.9rem;">${name}</div>
                            ${role ? `<div class="modal-detail-label" style="margin-top:0.15rem;">${role}</div>` : ''}
                        </div>
                    </div>`;
                }).join('')
                : `<p style="color:#64748b;text-align:center;padding:1rem;grid-column:1/-1;">لا يوجد أعضاء</p>`;

            const content = `
                <div class="modal-section">
                    <h3><i class="fa-solid fa-circle-info"></i> بيانات اللجنة</h3>
                    <div class="modal-detail-grid">
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">الحالة</span>
                            <span class="modal-detail-value">${committee.is_active ? 'نشطة' : 'غير نشطة'}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">تاريخ الإنشاء</span>
                            <span class="modal-detail-value">${new Date(committee.created_at).toLocaleDateString('ar-SA')}</span>
                        </div>
                        <div class="modal-detail-item" style="grid-column:1/-1;">
                            <span class="modal-detail-label">التصنيف</span>
                            <span class="modal-detail-value">${committee.department_id ? 'تابع للمجلس التنفيذي' : 'تابع للمجلس الإداري'}</span>
                        </div>
                        ${committee.department_id ? `
                        <div class="modal-detail-item" style="grid-column:1/-1;">
                            <span class="modal-detail-label">القسم</span>
                            <span class="modal-detail-value">${committee.departments?.name_ar ? 'تتبع اللجنة لقسم ' + committee.departments.name_ar.replace(/^قسم\s+/, '') : 'غير محدد'}</span>
                        </div>` : ''}
                        ${committee.description ? `
                        <div class="modal-detail-item" style="grid-column:1/-1;">
                            <span class="modal-detail-label">الوصف</span>
                            <span class="modal-detail-value" style="white-space:normal;overflow:visible;">${committee.description}</span>
                        </div>` : ''}
                        ${committee.group_link ? `
                        <div class="modal-detail-item" style="grid-column:1/-1;">
                            <span class="modal-detail-label">رابط القروب</span>
                            <span class="modal-detail-value">${committee.group_link}</span>
                            <div class="modal-detail-actions">
                                <button class="mdi-btn" onclick="window.open('${committee.group_link}','_blank')" title="فتح الرابط">
                                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                                </button>
                            </div>
                        </div>` : ''}
                    </div>
                </div>

                <hr class="modal-divider">

                <div class="modal-section">
                    <h3><i class="fa-solid fa-users"></i> الأعضاء (${members?.length || 0})</h3>
                    <div class="modal-detail-grid">
                        ${membersHtml}
                    </div>
                </div>
            `;

            window.openModal(committee.committee_name_ar, content, { icon: committee.department_id ? 'fa-people-group' : 'fa-users-gear' });

        } catch (error) {
            console.error('Error viewing committee:', error);
            window.showErrorModal('خطأ', 'حدث خطأ في تحميل تفاصيل اللجنة');
        } finally {
            showLoading(false);
        }
    };

    // دالة تعديل لجنة
    window.editCommittee = function(committeeId) {
        openCommitteeModal(committeeId);
    };

    // عرض تفاصيل قسم
    window.viewDepartment = async function(deptId) {
        try {
            showLoading(true);

            const { data: dept, error: deptError } = await sb
                .from('departments')
                .select('*')
                .eq('id', deptId)
                .single();

            if (deptError) throw deptError;

            // جلب اللجان التابعة للقسم
            const { data: committees } = await sb
                .from('committees')
                .select('id, committee_name_ar')
                .eq('department_id', deptId)
                .eq('is_active', true);

            // جلب الأعضاء عبر اللجان
            const { data: members } = await sb
                .from('user_roles')
                .select('user_id, profiles!user_roles_user_id_fkey(full_name, avatar_url), roles(role_name_ar), committees!user_roles_committee_id_fkey(committee_name_ar)')
                .in('committee_id', (committees || []).map(c => c.id))
                .eq('is_active', true);

            const membersHtml = members && members.length > 0
                ? members.map(m => {
                    const name   = m.profiles?.full_name || 'غير محدد';
                    const avatar = m.profiles?.avatar_url ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3d8fd6&color=fff`;
                    const role   = m.roles?.role_name_ar || '';
                    const committee = m.committees?.committee_name_ar || '';
                    return `
                    <div class="modal-detail-item" style="flex-direction:row;align-items:center;gap:0.75rem;">
                        <img src="${avatar}" alt="${name}"
                             style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0;" />
                        <div style="min-width:0;">
                            <div class="modal-detail-value" style="font-size:0.9rem;">${name}</div>
                            ${role ? `<div class="modal-detail-label" style="margin-top:0.1rem;">${role}${committee ? ' · ' + committee : ''}</div>` : ''}
                        </div>
                    </div>`;
                }).join('')
                : `<p style="color:#64748b;text-align:center;padding:1rem;grid-column:1/-1;">لا يوجد أعضاء</p>`;

            const content = `
                <div class="modal-section">
                    <h3><i class="fa-solid fa-circle-info"></i> بيانات القسم</h3>
                    <div class="modal-detail-grid">
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">الحالة</span>
                            <span class="modal-detail-value">${dept.is_active ? 'نشط' : 'غير نشط'}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">تاريخ الإنشاء</span>
                            <span class="modal-detail-value">${new Date(dept.created_at).toLocaleDateString('ar-SA')}</span>
                        </div>
                        <div class="modal-detail-item" style="grid-column:1/-1;">
                            <span class="modal-detail-label">التصنيف</span>
                            <span class="modal-detail-value">تابع للمجلس التنفيذي</span>
                        </div>
                                                ${committees && committees.length > 0 ? `
                        <div class="modal-detail-item" style="grid-column:1/-1;">
                            <span class="modal-detail-label">اللجان</span>
                            <span class="modal-detail-value" style="white-space:normal;overflow:visible;">يضم القسم ${committees.map(c => c.committee_name_ar).join(' و')}</span>
                        </div>` : ''}
                        ${dept.description ? `
                        <div class="modal-detail-item" style="grid-column:1/-1;">
                            <span class="modal-detail-label">الوصف</span>
                            <span class="modal-detail-value" style="white-space:normal;overflow:visible;">${dept.description}</span>
                        </div>` : ''}
                        ${dept.group_link ? `
                        <div class="modal-detail-item" style="grid-column:1/-1;">
                            <span class="modal-detail-label">رابط القروب</span>
                            <span class="modal-detail-value">${dept.group_link}</span>
                            <div class="modal-detail-actions">
                                <button class="mdi-btn" onclick="window.open('${dept.group_link}','_blank')" title="فتح الرابط">
                                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                                </button>
                            </div>
                        </div>` : ''}
                    </div>
                </div>
                <hr class="modal-divider">
                <div class="modal-section">
                    <h3><i class="fa-solid fa-users"></i> الأعضاء (${members?.length || 0})</h3>
                    <div class="modal-detail-grid">
                        ${membersHtml}
                    </div>
                </div>
            `;

            window.openModal(dept.name_ar, content, { icon: 'fa-solid fa-sitemap' });

        } catch (error) {
            console.error('Error viewing department:', error);
            window.showErrorModal('خطأ', 'حدث خطأ في تحميل تفاصيل القسم');
        } finally {
            showLoading(false);
        }
    };

    // تعديل قسم
    window.editDepartment = async function(deptId) {
        try {
            showLoading(true);

            const { data: dept, error } = await sb
                .from('departments')
                .select('*')
                .eq('id', deptId)
                .single();

            if (error) throw error;

            const formHtml = `
                <div class="modal-form-grid">
                    <div class="form-group full-width">
                        <label class="form-label">
                            <span class="label-icon"><i class="fa-solid fa-sitemap"></i></span>
                            اسم القسم
                        </label>
                        <input type="text" id="dept-name" class="form-input" value="${dept.name_ar || ''}" readonly />
                    </div>
                    <div class="form-group full-width">
                        <label class="form-label">
                            <span class="label-icon"><i class="fa-solid fa-align-right"></i></span>
                            الوصف
                        </label>
                        <textarea id="dept-description" rows="3" class="form-input form-textarea" placeholder="وصف القسم...">${dept.description || ''}</textarea>
                    </div>
                    <div class="form-group full-width">
                        <label class="form-label">
                            <span class="label-icon"><i class="fa-brands fa-whatsapp"></i></span>
                            رابط القروب <span class="required-dot">*</span>
                        </label>
                        <input type="url" id="dept-grouplink" class="form-input" value="${dept.group_link || ''}" placeholder="https://chat.whatsapp.com/..." required />
                    </div>
                </div>
            `;

            const footer = `
                <button class="btn btn-outline" onclick="closeModal()">
                    <i class="fa-solid fa-times"></i>
                    إلغاء
                </button>
                <button class="btn btn-warning" onclick="window._submitDeptEdit(${deptId})">
                    <i class="fa-solid fa-save"></i>
                    حفظ التعديلات
                </button>
            `;

            window._submitDeptEdit = async function(id) {
                const description = document.getElementById('dept-description')?.value.trim() || null;
                const groupLink   = document.getElementById('dept-grouplink')?.value.trim() || null;

                if (!groupLink) {
                    document.getElementById('dept-grouplink').focus();
                    return;
                }
                if ((description ?? '') === (dept.description ?? '') && (groupLink ?? '') === (dept.group_link ?? '')) {
                    window.Toast.show({ type: 'info', title: 'لا تغييرات', message: 'لم تقم بأي تعديل' });
                    return;
                }

                try {
                    showLoading(true);
                    const { error } = await sb
                        .from('departments')
                        .update({ description, group_link: groupLink })
                        .eq('id', id);

                    if (error) throw error;

                    window.closeModal();
                    await loadDepartments();
                    window.Toast.show({ type: 'success', title: 'تم الحفظ', message: 'تم تحديث بيانات القسم بنجاح' });
                } catch (err) {
                    console.error('Error updating department:', err);
                    window.showErrorModal('خطأ', 'حدث خطأ أثناء حفظ التعديلات');
                } finally {
                    showLoading(false);
                }
            };

            window.openModal('تعديل قسم', formHtml, { icon: 'fa-pen', variant: 'warning', footer });

        } catch (error) {
            console.error('Error opening department edit:', error);
            window.showErrorModal('خطأ', 'حدث خطأ في تحميل بيانات القسم');
        } finally {
            showLoading(false);
        }
    };

    // دالة حذف لجنة
    window.deleteCommittee = async function(committeeId) {
        if (!confirm('هل أنت متأكد من حذف هذه اللجنة؟')) {
            return;
        }

        try {
            showLoading(true);

            const { error } = await sb
                .from('committees')
                .update({ is_active: false })
                .eq('id', committeeId);

            if (error) throw error;

            await loadCommittees();
            alert('تم تعطيل اللجنة بنجاح');

        } catch (error) {
            console.error('Error deleting committee:', error);
            alert('حدث خطأ: ' + error.message);
        } finally {
            showLoading(false);
        }
    };

    // فتح نافذة إضافة/تعديل مشروع
    async function openProjectModal(projectId = null) {
        const modal = document.getElementById('projectModal');
        const title = document.getElementById('projectModalTitle');
        const form = document.getElementById('projectForm');

        modal.classList.add('active');

        // تحميل اللجان والمستخدمين
        await loadProjectCommitteesOptions();
        await loadProjectLeadersOptions();

        if (projectId) {
            title.textContent = 'تعديل مشروع';
            form.dataset.projectId = projectId;
        } else {
            title.textContent = 'إضافة مشروع جديد';
            form.reset();
            delete form.dataset.projectId;
        }
    }

    // تحميل خيارات اللجان للمشروع
    async function loadProjectCommitteesOptions() {
        const select = document.getElementById('projectCommittee');
        if (!select) return;

        try {
            const { data: committees, error } = await sb
                .from('committees')
                .select('*')
                .eq('is_active', true)
                .order('committee_name_ar');

            if (error) throw error;

            let optionsHTML = '<option value="">اختر اللجنة</option>';
            if (committees && committees.length > 0) {
                committees.forEach(committee => {
                    optionsHTML += `<option value="${committee.id}">${committee.committee_name_ar}</option>`;
                });
            }
            select.innerHTML = optionsHTML;
        } catch (error) {
            console.error('Error loading committees:', error);
        }
    }

    // تحميل خيارات قادة المشاريع
    async function loadProjectLeadersOptions() {
        const select = document.getElementById('projectLeader');
        if (!select) return;

        try {
            const { data: users, error } = await sb
                .from('profiles')
                .select('id, full_name')
                .eq('account_status', 'active')
                .order('full_name');

            if (error) throw error;

            let optionsHTML = '<option value="">اختر القائد</option>';
            if (users && users.length > 0) {
                users.forEach(user => {
                    optionsHTML += `<option value="${user.id}">${user.full_name}</option>`;
                });
            }
            select.innerHTML = optionsHTML;
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    // معالجة إرسال نموذج المشروع
    async function handleProjectSubmit() {
        const form = document.getElementById('projectForm');
        const projectId = form.dataset.projectId;

        const name = document.getElementById('projectName').value;
        const description = document.getElementById('projectDescription').value;
        const committeeId = document.getElementById('projectCommittee').value;
        const leaderId = document.getElementById('projectLeader').value || null;
        const startDate = document.getElementById('projectStartDate').value || null;
        const endDate = document.getElementById('projectEndDate').value || null;
        const status = document.getElementById('projectStatus').value;

        try {
            showLoading(true);

            const projectData = {
                project_name: name,
                description: description,
                committee_id: committeeId,
                project_leader: leaderId,
                start_date: startDate,
                end_date: endDate,
                status: status
            };

            if (projectId) {
                // تحديث مشروع موجود
                const { error } = await sb
                    .from('projects')
                    .update(projectData)
                    .eq('id', projectId);

                if (error) throw error;
                alert('تم تحديث المشروع بنجاح!');
            } else {
                // إضافة مشروع جديد
                const { error } = await sb
                    .from('projects')
                    .insert(projectData);

                if (error) throw error;
                alert('تم إضافة المشروع بنجاح!');
            }

            // إغلاق النافذة وتحديث القائمة
            document.getElementById('projectModal').classList.remove('active');
            await loadProjects();

        } catch (error) {
            console.error('Error saving project:', error);
            alert('حدث خطأ: ' + (error.message || 'خطأ غير معروف'));
        } finally {
            showLoading(false);
        }
    }

    // فتح نافذة إضافة/تعديل مهمة
    async function openTaskModal(taskId = null) {
        const modal = document.getElementById('taskModal');
        const title = document.getElementById('taskModalTitle');
        const form = document.getElementById('taskForm');

        modal.classList.add('active');

        // تحميل الخيارات
        await loadTaskCommitteesOptions();
        await loadTaskProjectsOptions();
        await loadTaskUsersOptions();

        if (taskId) {
            title.textContent = 'تعديل مهمة';
            form.dataset.taskId = taskId;
        } else {
            title.textContent = 'إضافة مهمة جديدة';
            form.reset();
            delete form.dataset.taskId;
        }
    }

    // تحميل خيارات اللجان للمهمة
    async function loadTaskCommitteesOptions() {
        const select = document.getElementById('taskCommittee');
        if (!select) return;

        try {
            const { data: committees, error } = await sb
                .from('committees')
                .select('*')
                .eq('is_active', true)
                .order('committee_name_ar');

            if (error) throw error;

            let optionsHTML = '<option value="">اختر اللجنة</option>';
            if (committees && committees.length > 0) {
                committees.forEach(committee => {
                    optionsHTML += `<option value="${committee.id}">${committee.committee_name_ar}</option>`;
                });
            }
            select.innerHTML = optionsHTML;
        } catch (error) {
            console.error('Error loading committees:', error);
        }
    }

    // تحميل خيارات المشاريع للمهمة
    async function loadTaskProjectsOptions() {
        const select = document.getElementById('taskProject');
        if (!select) return;

        try {
            const { data: projects, error } = await sb
                .from('projects')
                .select('*')
                .order('project_name');

            if (error) throw error;

            let optionsHTML = '<option value="">اختر المشروع</option>';
            if (projects && projects.length > 0) {
                projects.forEach(project => {
                    optionsHTML += `<option value="${project.id}">${project.project_name}</option>`;
                });
            }
            select.innerHTML = optionsHTML;
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }

    // تحميل خيارات المستخدمين للمهمة
    async function loadTaskUsersOptions() {
        const select = document.getElementById('taskAssignedTo');
        if (!select) return;

        try {
            const { data: users, error } = await sb
                .from('profiles')
                .select('id, full_name')
                .eq('account_status', 'active')
                .order('full_name');

            if (error) throw error;

            let optionsHTML = '<option value="">اختر المستخدم</option>';
            if (users && users.length > 0) {
                users.forEach(user => {
                    optionsHTML += `<option value="${user.id}">${user.full_name}</option>`;
                });
            }
            select.innerHTML = optionsHTML;
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    // معالجة إرسال نموذج المهمة
    async function handleTaskSubmit() {
        const form = document.getElementById('taskForm');
        const taskId = form.dataset.taskId;

        const title = document.getElementById('taskTitle').value;
        const description = document.getElementById('taskDescription').value;
        const committeeId = document.getElementById('taskCommittee').value || null;
        const projectId = document.getElementById('taskProject').value || null;
        const assignedTo = document.getElementById('taskAssignedTo').value || null;
        const priority = document.getElementById('taskPriority').value;
        const status = document.getElementById('taskStatus').value;
        const dueDate = document.getElementById('taskDueDate').value || null;

        try {
            showLoading(true);

            const taskData = {
                title: title,
                description: description,
                committee_id: committeeId,
                project_id: projectId,
                assigned_to: assignedTo,
                assigned_by: currentUser.id,
                priority: priority,
                status: status,
                due_date: dueDate
            };

            if (taskId) {
                // تحديث مهمة موجودة
                const { error } = await sb
                    .from('tasks')
                    .update(taskData)
                    .eq('id', taskId);

                if (error) throw error;
                alert('تم تحديث المهمة بنجاح!');
            } else {
                // إضافة مهمة جديدة
                const { error } = await sb
                    .from('tasks')
                    .insert(taskData);

                if (error) throw error;
                alert('تم إضافة المهمة بنجاح!');
            }

            // إغلاق النافذة وتحديث القائمة
            document.getElementById('taskModal').classList.remove('active');
            await loadTasks();

        } catch (error) {
            console.error('Error saving task:', error);
            alert('حدث خطأ: ' + (error.message || 'خطأ غير معروف'));
        } finally {
            showLoading(false);
        }
    }

    // فتح نافذة إضافة/تعديل اجتماع
    async function openMeetingModal(meetingId = null) {
        const modal = document.getElementById('meetingModal');
        const title = document.getElementById('meetingModalTitle');
        const form = document.getElementById('meetingForm');

        modal.classList.add('active');

        // تحميل اللجان
        await loadMeetingCommitteesOptions();

        if (meetingId) {
            title.textContent = 'تعديل اجتماع';
            form.dataset.meetingId = meetingId;
        } else {
            title.textContent = 'جدولة اجتماع جديد';
            form.reset();
            delete form.dataset.meetingId;
        }
    }

    // تحميل خيارات اللجان للاجتماع
    async function loadMeetingCommitteesOptions() {
        const select = document.getElementById('meetingCommittee');
        if (!select) return;

        try {
            const { data: committees, error } = await sb
                .from('committees')
                .select('*')
                .eq('is_active', true)
                .order('committee_name_ar');

            if (error) throw error;

            let optionsHTML = '<option value="">اختر اللجنة</option>';
            if (committees && committees.length > 0) {
                committees.forEach(committee => {
                    optionsHTML += `<option value="${committee.id}">${committee.committee_name_ar}</option>`;
                });
            }
            select.innerHTML = optionsHTML;
        } catch (error) {
            console.error('Error loading committees:', error);
        }
    }

    // معالجة إرسال نموذج الاجتماع
    async function handleMeetingSubmit() {
        const form = document.getElementById('meetingForm');
        const meetingId = form.dataset.meetingId;

        const title = document.getElementById('meetingTitle').value;
        const description = document.getElementById('meetingDescription').value;
        const meetingType = document.getElementById('meetingType').value;
        const committeeId = document.getElementById('meetingCommittee').value || null;
        const scheduledAt = document.getElementById('meetingScheduledAt').value;
        const duration = document.getElementById('meetingDuration').value;
        const location = document.getElementById('meetingLocation').value || null;
        const meetingLink = document.getElementById('meetingLink').value || null;
        const status = document.getElementById('meetingStatus').value;

        try {
            showLoading(true);

            const meetingData = {
                title: title,
                description: description,
                meeting_type: meetingType,
                committee_id: committeeId,
                scheduled_at: scheduledAt,
                duration_minutes: parseInt(duration),
                location: location,
                meeting_link: meetingLink,
                status: status,
                created_by: currentUser.id
            };

            if (meetingId) {
                // تحديث اجتماع موجود
                const { error } = await sb
                    .from('meetings')
                    .update(meetingData)
                    .eq('id', meetingId);

                if (error) throw error;
                alert('تم تحديث الاجتماع بنجاح!');
            } else {
                // إضافة اجتماع جديد
                const { error } = await sb
                    .from('meetings')
                    .insert(meetingData);

                if (error) throw error;
                alert('تم جدولة الاجتماع بنجاح!');
            }

            // إغلاق النافذة وتحديث القائمة
            document.getElementById('meetingModal').classList.remove('active');
            await loadMeetings();

        } catch (error) {
            console.error('Error saving meeting:', error);
            alert('حدث خطأ: ' + (error.message || 'خطأ غير معروف'));
        } finally {
            showLoading(false);
        }
    }

    // فتح نافذة إنشاء تقرير
    async function openReportModal() {
        const modal = document.getElementById('reportModal');
        const form = document.getElementById('reportForm');

        modal.classList.add('active');

        // تحميل اللجان
        await loadReportCommitteesOptions();

        form.reset();
    }

    // تحميل خيارات اللجان للتقرير
    async function loadReportCommitteesOptions() {
        const select = document.getElementById('reportCommittee');
        if (!select) return;

        try {
            const { data: committees, error } = await sb
                .from('committees')
                .select('*')
                .eq('is_active', true)
                .order('committee_name_ar');

            if (error) throw error;

            let optionsHTML = '<option value="">اختر اللجنة</option>';
            if (committees && committees.length > 0) {
                committees.forEach(committee => {
                    optionsHTML += `<option value="${committee.id}">${committee.committee_name_ar}</option>`;
                });
            }
            select.innerHTML = optionsHTML;
        } catch (error) {
            console.error('Error loading committees:', error);
        }
    }

    // معالجة إرسال نموذج التقرير
    async function handleReportSubmit() {
        const title = document.getElementById('reportTitle').value;
        const reportType = document.getElementById('reportType').value;
        const committeeId = document.getElementById('reportCommittee').value || null;
        const periodStart = document.getElementById('reportPeriodStart').value || null;
        const periodEnd = document.getElementById('reportPeriodEnd').value || null;
        const notes = document.getElementById('reportNotes').value;

        try {
            showLoading(true);

            // جمع البيانات حسب نوع التقرير
            let reportData = {
                notes: notes,
                generated_at: new Date().toISOString()
            };

            // جلب البيانات حسب نوع التقرير
            if (reportType === 'committee' && committeeId) {
                // بيانات اللجنة
                const { data: committee } = await sb
                    .from('committees')
                    .select('*')
                    .eq('id', committeeId)
                    .single();

                const { data: members } = await sb
                    .from('user_roles')
                    .select('*, profiles(*), roles(*)')
                    .eq('committee_id', committeeId)
                    .eq('is_active', true);

                const { data: projects } = await sb
                    .from('projects')
                    .select('*')
                    .eq('committee_id', committeeId);

                reportData.committee = committee;
                reportData.members_count = members?.length || 0;
                reportData.projects_count = projects?.length || 0;
                reportData.members = members;
                reportData.projects = projects;

            } else if (reportType === 'general') {
                // إحصائيات عامة
                const { data: users } = await sb.from('profiles').select('id');
                const { data: committees } = await sb.from('committees').select('id').eq('is_active', true);
                const { data: projects } = await sb.from('projects').select('id');
                const { data: tasks } = await sb.from('tasks').select('id');

                reportData.total_users = users?.length || 0;
                reportData.total_committees = committees?.length || 0;
                reportData.total_projects = projects?.length || 0;
                reportData.total_tasks = tasks?.length || 0;

            } else if (reportType === 'attendance') {
                // تقرير الحضور
                const { data: attendance } = await sb
                    .from('attendance')
                    .select('*, profiles(*), meetings(*)')
                    .gte('created_at', periodStart || '2000-01-01')
                    .lte('created_at', periodEnd || '2100-12-31');

                reportData.attendance_records = attendance?.length || 0;
                reportData.attendance = attendance;
            }

            // حفظ التقرير
            const { data: report, error } = await sb
                .from('reports')
                .insert({
                    report_title: title,
                    report_type: reportType,
                    committee_id: committeeId,
                    generated_by: currentUser.id,
                    report_data: reportData,
                    period_start: periodStart,
                    period_end: periodEnd
                })
                .select()
                .single();

            if (error) throw error;

            alert('تم إنشاء التقرير بنجاح!');

            // إغلاق النافذة وتحديث القائمة
            document.getElementById('reportModal').classList.remove('active');
            await loadReports();

            // عرض التقرير
            if (report) {
                viewReport(report.id);
            }

        } catch (error) {
            console.error('Error generating report:', error);
            alert('حدث خطأ: ' + (error.message || 'خطأ غير معروف'));
        } finally {
            showLoading(false);
        }
    }

    // دالة عرض تقرير
    window.viewReport = async function(reportId) {
        try {
            showLoading(true);

            const { data: report, error } = await sb
                .from('reports')
                .select('*, profiles(full_name), committees(committee_name_ar)')
                .eq('id', reportId)
                .single();

            if (error) throw error;

            // بناء محتوى التقرير
            let content = `
                <div style="padding: 20px;">
                    <h2 style="color: var(--main-blue); margin-bottom: 20px;">
                        <i class="fa-solid fa-file-lines"></i> ${report.report_title}
                    </h2>
                    
                    <div style="background: var(--bg-light); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                        <p><strong>نوع التقرير:</strong> ${getReportTypeName(report.report_type)}</p>
                        ${report.committees ? `<p><strong>اللجنة:</strong> ${report.committees.committee_name_ar}</p>` : ''}
                        ${report.period_start ? `<p><strong>الفترة:</strong> من ${report.period_start} إلى ${report.period_end || 'الآن'}</p>` : ''}
                        <p><strong>تم الإنشاء بواسطة:</strong> ${report.profiles?.full_name || 'غير محدد'}</p>
                        <p><strong>تاريخ الإنشاء:</strong> ${new Date(report.created_at).toLocaleDateString('ar-SA')}</p>
                    </div>

                    <h3 style="margin: 20px 0 10px;">البيانات والإحصائيات</h3>
                    <div style="background: white; padding: 15px; border-radius: 10px; border: 1px solid var(--border-color);">
                        ${formatReportData(report.report_data, report.report_type)}
                    </div>

                    <div style="margin-top: 20px; text-align: center;">
                        <button class="btn-primary" onclick="document.getElementById('reportDetailsModal').classList.remove('active')">
                            إغلاق
                        </button>
                    </div>
                </div>
            `;

            // إنشاء نافذة منبثقة
            let modal = document.getElementById('reportDetailsModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'reportDetailsModal';
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-content" style="max-width: 800px;">
                        <div id="reportDetailsContent"></div>
                    </div>
                `;
                document.body.appendChild(modal);

                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.classList.remove('active');
                    }
                });
            }

            document.getElementById('reportDetailsContent').innerHTML = content;
            modal.classList.add('active');

        } catch (error) {
            console.error('Error viewing report:', error);
            alert('حدث خطأ في تحميل التقرير');
        } finally {
            showLoading(false);
        }
    };

    // دالة مساعدة لتنسيق بيانات التقرير
    function formatReportData(data, type) {
        if (!data) return '<p>لا توجد بيانات</p>';

        let html = '';

        if (type === 'committee') {
            html += `<p><strong>عدد الأعضاء:</strong> ${data.members_count || 0}</p>`;
            html += `<p><strong>عدد المشاريع:</strong> ${data.projects_count || 0}</p>`;
        } else if (type === 'general') {
            html += `<p><strong>إجمالي المستخدمين:</strong> ${data.total_users || 0}</p>`;
            html += `<p><strong>إجمالي اللجان:</strong> ${data.total_committees || 0}</p>`;
            html += `<p><strong>إجمالي المشاريع:</strong> ${data.total_projects || 0}</p>`;
            html += `<p><strong>إجمالي المهام:</strong> ${data.total_tasks || 0}</p>`;
        } else if (type === 'attendance') {
            html += `<p><strong>عدد سجلات الحضور:</strong> ${data.attendance_records || 0}</p>`;
        }

        if (data.notes) {
            html += `<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                <strong>ملاحظات:</strong><br>${data.notes}
            </div>`;
        }

        return html;
    }

    // دالة مساعدة للحصول على اسم نوع التقرير
    function getReportTypeName(type) {
        const types = {
            'committee': 'تقرير لجنة',
            'user': 'تقرير مستخدم',
            'project': 'تقرير مشروع',
            'general': 'تقرير عام',
            'attendance': 'تقرير حضور',
            'quality': 'تقرير جودة'
        };
        return types[type] || type;
    }


    // تحميل الإشعارات
    async function loadNotifications() {
        const container = document.getElementById('notificationsList');
        const badge = document.getElementById('notificationsBadge');
        
        if (!container) return;
        
        try {
            const { data: notifications } = await sb
                .from('notifications')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false })
                .limit(20);
            
            const unreadCount = notifications?.filter(n => !n.is_read).length || 0;
            
            if (badge) {
                badge.textContent = unreadCount;
                badge.style.display = unreadCount > 0 ? 'flex' : 'none';
            }
            
            if (!notifications || notifications.length === 0) {
                container.innerHTML = '<div class="empty-state">لا توجد إشعارات</div>';
                return;
            }
            
            container.innerHTML = notifications.map(notif => `
                <div class="notification-item ${notif.is_read ? '' : 'unread'}" data-id="${notif.id}">
                    <div class="notification-icon ${notif.notification_type}">
                        <i class="fa-solid ${getNotificationIcon(notif.notification_type)}"></i>
                    </div>
                    <div class="notification-content">
                        <div class="notification-title">${notif.title}</div>
                        <div class="notification-message">${notif.message}</div>
                        <div class="notification-time">${formatTimeAgo(notif.created_at)}</div>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    // أيقونة الإشعار حسب النوع
    function getNotificationIcon(type) {
        const icons = {
            'task': 'fa-tasks',
            'meeting': 'fa-calendar',
            'announcement': 'fa-bullhorn',
            'system': 'fa-gear',
            'approval': 'fa-check-circle'
        };
        return icons[type] || 'fa-bell';
    }

    // إظهار/إخفاء التحميل
    function showLoading(show) {
        const loadingBar = document.getElementById('loadingBar');
        if (loadingBar) {
            loadingBar.style.display = show ? 'block' : 'none';
        }
    }

    // إظهار رسالة خطأ
    function showError(message) {
        alert(message);
    }

    // إظهار رسالة نجاح
    function showSuccess(message) {
        alert(message);
    }

    // =====================================================
    // وظائف إدارة محتوى الموقع
    // =====================================================

    // إعداد بطاقات الأقسام
    function setupWebsiteCards() {
        const cards = document.querySelectorAll('.website-section-card');
        const sectionsGrid = document.querySelector('.website-sections-grid');
        const detailSection = document.getElementById('website-detail-section');
        const backBtn = document.getElementById('backToSections');
        const detailTitle = document.getElementById('detailSectionTitle');
        const detailContent = document.getElementById('detailContent');
        const addItemBtn = document.getElementById('addItemBtn');

        let currentSection = null;

        // عند الضغط على بطاقة
        cards.forEach(card => {
            card.addEventListener('click', async () => {
                const section = card.dataset.section;
                currentSection = section;

                // إخفاء البطاقات وإظهار التفاصيل
                sectionsGrid.style.display = 'none';
                detailSection.style.display = 'block';

                // تحديث العنوان
                const titles = {
                    'works': 'إدارة الأعمال',
                    'achievements': 'إدارة الإنجازات',
                    'sponsors': 'إدارة الشركاء',
                    'faq': 'إدارة الأسئلة الشائعة'
                };
                detailTitle.textContent = titles[section];

                // تحميل البيانات
                await loadSectionDetails(section);
            });
        });

        // زر العودة
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                detailSection.style.display = 'none';
                sectionsGrid.style.display = 'grid';
                currentSection = null;
            });
        }

        // زر الإضافة
        if (addItemBtn) {
            addItemBtn.addEventListener('click', () => {
                switch(currentSection) {
                    case 'works':
                        openWorkModal();
                        break;
                    case 'achievements':
                        openAchievementModal();
                        break;
                    case 'sponsors':
                        openSponsorModal();
                        break;
                    case 'faq':
                        openFaqModal();
                        break;
                }
            });
        }
    }

    // تحميل تفاصيل القسم
    async function loadSectionDetails(section) {
        const container = document.getElementById('detailContent');
        if (!container) return;

        switch(section) {
            case 'works':
                await loadWebsiteWorks();
                break;
            case 'achievements':
                await loadWebsiteAchievements();
                break;
            case 'sponsors':
                await loadWebsiteSponsors();
                break;
            case 'faq':
                await loadWebsiteFaq();
                break;
        }
    }

    // تحميل عدد العناصر في البطاقات
    async function loadSectionCounts() {
        try {
            // عدد الأعمال
            const { count: worksCount } = await sb.from('works').select('*', { count: 'exact', head: true });
            document.getElementById('worksCount').textContent = `${worksCount || 0} عمل`;

            // عدد الإنجازات
            const { count: achievementsCount } = await sb.from('achievements').select('*', { count: 'exact', head: true });
            document.getElementById('achievementsCount').textContent = `${achievementsCount || 0} إنجاز`;

            // عدد الشركاء
            const { count: sponsorsCount } = await sb.from('sponsors').select('*', { count: 'exact', head: true });
            document.getElementById('sponsorsCount').textContent = `${sponsorsCount || 0} شريك`;

            // عدد الأسئلة
            const { count: faqCount } = await sb.from('faq').select('*', { count: 'exact', head: true });
            document.getElementById('faqCount').textContent = `${faqCount || 0} سؤال`;
        } catch (error) {
            console.error('Error loading counts:', error);
        }
    }

    // تحميل الأعمال
    async function loadWebsiteWorks() {
        const container = document.getElementById('detailContent');
        if (!container) return;

        try {
            showLoading(true);
            const { data: works, error } = await sb
                .from('works')
                .select('*')
                .order('order', { ascending: true, nullsFirst: false });

            if (error) throw error;

            if (!works || works.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div><p class="empty-state__title">لا توجد أعمال</p></div>';
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
                        ${works.map(work => `
                            <tr>
                                <td><img src="${work.image_url || ''}" alt="${work.title}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" /></td>
                                <td><strong>${work.title}</strong></td>
                                <td>${work.category || '-'}</td>
                                <td>${work.order || 0}</td>
                                <td class="action-buttons">
                                    <button class=" btn-outline" onclick="editWork(${work.id})">
                                        <i class="fa-solid fa-edit"></i>
                                    </button>
                                    <button class=" btn-outline btn-danger" onclick="deleteWork(${work.id})">
                                        <i class="fa-solid fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (error) {
            console.error('Error loading works:', error);
            container.innerHTML = '<div class="error-state">حدث خطأ أثناء تحميل الأعمال</div>';
        } finally {
            showLoading(false);
        }
    }

    // تحميل الإنجازات
    async function loadWebsiteAchievements() {
        const container = document.getElementById('detailContent');
        if (!container) return;

        try {
            showLoading(true);
            const { data: achievements, error } = await sb
                .from('achievements')
                .select('*')
                .order('order', { ascending: true });

            if (error) throw error;

            if (!achievements || achievements.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div><p class="empty-state__title">لا توجد إنجازات</p></div>';
                return;
            }

            container.innerHTML = `
                <table class="table">
                    <thead>
                        <tr>
                            <th>الأيقونة</th>
                            <th>التسمية</th>
                            <th>الرقم</th>
                            <th>الترتيب</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${achievements.map(ach => `
                            <tr>
                                <td><i class="${ach.icon_class || ach.icon}" style="font-size: 1.5rem; color: var(--accent-blue);"></i></td>
                                <td><strong>${ach.label}</strong></td>
                                <td>${ach.count_number || ach.count}${ach.plus_flag || ach.plus ? '+' : ''}</td>
                                <td>${ach.order || 0}</td>
                                <td class="action-buttons">
                                    <button class=" btn-outline" onclick="editAchievement(${ach.id})">
                                        <i class="fa-solid fa-edit"></i>
                                    </button>
                                    <button class=" btn-outline btn-danger" onclick="deleteAchievement(${ach.id})">
                                        <i class="fa-solid fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (error) {
            console.error('Error loading achievements:', error);
            container.innerHTML = '<div class="error-state">حدث خطأ أثناء تحميل الإنجازات</div>';
        } finally {
            showLoading(false);
        }
    }

    // تحميل الشركاء
    async function loadWebsiteSponsors() {
        const container = document.getElementById('detailContent');
        if (!container) return;

        try {
            showLoading(true);
            const { data: sponsors, error } = await sb
                .from('sponsors')
                .select('*')
                .order('order', { ascending: true, nullsFirst: false });

            if (error) throw error;

            if (!sponsors || sponsors.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div><p class="empty-state__title">لا يوجد شركاء</p></div>';
                return;
            }

            container.innerHTML = `
                <table class="table">
                    <thead>
                        <tr>
                            <th>الشعار</th>
                            <th>الاسم</th>
                            <th>الشارة</th>
                            <th>الوصف</th>
                            <th>الترتيب</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sponsors.map(sponsor => `
                            <tr>
                                <td><img src="${sponsor.logo_url || ''}" alt="${sponsor.name}" style="width: 50px; height: 50px; object-fit: contain;" /></td>
                                <td><strong>${sponsor.name}</strong></td>
                                <td>${sponsor.badge || '-'}</td>
                                <td>${sponsor.description || '-'}</td>
                                <td>${sponsor.order || 0}</td>
                                <td class="action-buttons">
                                    <button class=" btn-outline" onclick="editSponsor(${sponsor.id})">
                                        <i class="fa-solid fa-edit"></i>
                                    </button>
                                    <button class=" btn-outline btn-danger" onclick="deleteSponsor(${sponsor.id})">
                                        <i class="fa-solid fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (error) {
            console.error('Error loading sponsors:', error);
            container.innerHTML = '<div class="error-state">حدث خطأ أثناء تحميل الشركاء</div>';
        } finally {
            showLoading(false);
        }
    }

    // تحميل الأسئلة الشائعة
    async function loadWebsiteFaq() {
        const container = document.getElementById('detailContent');
        if (!container) return;

        try {
            showLoading(true);
            const { data: faqs, error } = await sb
                .from('faq')
                .select('*')
                .order('order', { ascending: true });

            if (error) throw error;

            if (!faqs || faqs.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div><p class="empty-state__title">لا توجد أسئلة</p></div>';
                return;
            }

            container.innerHTML = `
                <table class="table">
                    <thead>
                        <tr>
                            <th>السؤال</th>
                            <th>الإجابة</th>
                            <th>الترتيب</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${faqs.map(faq => `
                            <tr>
                                <td><strong>${faq.question}</strong></td>
                                <td>${faq.answer.substring(0, 100)}${faq.answer.length > 100 ? '...' : ''}</td>
                                <td>${faq.order || 0}</td>
                                <td class="action-buttons">
                                    <button class=" btn-outline" onclick="editFaq(${faq.id})">
                                        <i class="fa-solid fa-edit"></i>
                                    </button>
                                    <button class=" btn-outline btn-danger" onclick="deleteFaq(${faq.id})">
                                        <i class="fa-solid fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (error) {
            console.error('Error loading FAQ:', error);
            container.innerHTML = '<div class="error-state">حدث خطأ أثناء تحميل الأسئلة</div>';
        } finally {
            showLoading(false);
        }
    }

    // معالجة حفظ عمل
    async function handleWorkSubmit() {
        try {
            showLoading(true);
            
            const workData = {
                title: document.getElementById('workTitle').value,
                category: document.getElementById('workCategory').value || null,
                image_url: document.getElementById('workImage').value,
                link_url: document.getElementById('workLink').value || null,
                order: parseInt(document.getElementById('workOrder').value) || 0,
                created_by: currentUser.id
            };

            const { error } = await sb.from('works').insert([workData]);

            if (error) throw error;

            showSuccess('تم إضافة العمل بنجاح');
            document.getElementById('workModal').classList.remove('active');
            document.getElementById('workForm').reset();
            
            await loadSectionDetails('works');
            await loadSectionCounts();
        } catch (error) {
            console.error('Error saving work:', error);
            showError('حدث خطأ أثناء حفظ العمل');
        } finally {
            showLoading(false);
        }
    }

    // معالجة حفظ إنجاز
    async function handleAchievementSubmit() {
        try {
            showLoading(true);
            
            const achievementData = {
                label: document.getElementById('achievementLabel').value,
                count_number: parseInt(document.getElementById('achievementCount').value) || 0,
                icon_class: document.getElementById('achievementIcon')?.value || 'fa-solid fa-trophy',
                plus_flag: document.getElementById('achievementPlus')?.checked || false,
                order: parseInt(document.getElementById('achievementOrder')?.value) || 0,
                created_by: currentUser.id
            };

            const { error } = await sb.from('achievements').insert([achievementData]);

            if (error) throw error;

            showSuccess('تم إضافة الإنجاز بنجاح');
            document.getElementById('achievementModal').classList.remove('active');
            document.getElementById('achievementForm').reset();
            
            await loadSectionDetails('achievements');
            await loadSectionCounts();
        } catch (error) {
            console.error('Error saving achievement:', error);
            showError('حدث خطأ أثناء حفظ الإنجاز');
        } finally {
            showLoading(false);
        }
    }

    // معالجة حفظ شريك
    async function handleSponsorSubmit() {
        try {
            showLoading(true);
            
            const sponsorData = {
                name: document.getElementById('sponsorName').value,
                description: document.getElementById('sponsorDescription')?.value || null,
                logo_url: document.getElementById('sponsorLogo').value,
                link_url: document.getElementById('sponsorLink')?.value || null,
                badge: document.getElementById('sponsorBadge')?.value || null,
                order: parseInt(document.getElementById('sponsorOrder')?.value) || 0,
                created_by: currentUser.id
            };

            const { error } = await sb.from('sponsors').insert([sponsorData]);

            if (error) throw error;

            showSuccess('تم إضافة الشريك بنجاح');
            document.getElementById('sponsorModal').classList.remove('active');
            document.getElementById('sponsorForm').reset();
            
            await loadSectionDetails('sponsors');
            await loadSectionCounts();
        } catch (error) {
            console.error('Error saving sponsor:', error);
            showError('حدث خطأ أثناء حفظ الشريك');
        } finally {
            showLoading(false);
        }
    }

    // معالجة حفظ سؤال شائع
    async function handleFaqSubmit() {
        try {
            showLoading(true);
            
            const faqData = {
                question: document.getElementById('faqQuestion').value,
                answer: document.getElementById('faqAnswer').value,
                order: parseInt(document.getElementById('faqOrder')?.value) || 0,
                created_by: currentUser.id
            };

            const { error } = await sb.from('faq').insert([faqData]);

            if (error) throw error;

            showSuccess('تم إضافة السؤال بنجاح');
            document.getElementById('faqModal').classList.remove('active');
            document.getElementById('faqForm').reset();
            
            await loadSectionDetails('faq');
            await loadSectionCounts();
        } catch (error) {
            console.error('Error saving FAQ:', error);
            showError('حدث خطأ أثناء حفظ السؤال');
        } finally {
            showLoading(false);
        }
    }

    // فتح نوافذ الإضافة
    function openWorkModal() {
        ModalHelper.form({
            title: '📁 إضافة عمل جديد',
            fields: [
                { name: 'title', type: 'text', label: 'عنوان العمل', placeholder: 'أدخل عنوان العمل', required: true },
                { name: 'category', type: 'text', label: 'الفئة', placeholder: 'مثال: تصميم، برمجة، تسويق' },
                { name: 'image_url', type: 'url', label: 'رابط الصورة', placeholder: 'https://example.com/image.jpg', required: true },
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
                    await loadSectionDetails('works');
                } catch (error) {
                    Toast.close(loadingToast);
                    Toast.error('حدث خطأ أثناء إضافة العمل');
                    console.error(error);
                    throw error;
                }
            }
        });
    }

    function openAchievementModal() {
        ModalHelper.form({
            title: '🏆 إضافة إنجاز جديد',
            fields: [
                { name: 'label', type: 'text', label: 'التسمية', placeholder: 'مثال: مشروع منجز', required: true },
                { name: 'icon_class', type: 'text', label: 'أيقونة FontAwesome', placeholder: 'مثال: fa-solid fa-trophy', hint: 'استخدم أيقونات FontAwesome مثل fa-solid fa-star' },
                { name: 'count_number', type: 'number', label: 'الرقم', placeholder: '0', required: true },
                { name: 'plus_flag', type: 'checkbox', checkboxLabel: 'إضافة علامة + بعد الرقم' },
                { name: 'order', type: 'number', label: 'الترتيب', value: '0' }
            ],
            submitText: 'إضافة',
            cancelText: 'إلغاء',
            onSubmit: async (formData) => {
                const loadingToast = Toast.loading('جاري إضافة الإنجاز...');
                try {
                    const { error } = await sb.from('achievements').insert([{
                        label: formData.label,
                        icon_class: formData.icon_class || 'fa-solid fa-trophy',
                        count_number: parseInt(formData.count_number) || 0,
                        plus_flag: formData.plus_flag === 'on',
                        order: parseInt(formData.order) || 0,
                        created_by: currentUser?.id
                    }]);
                    if (error) throw error;
                    Toast.close(loadingToast);
                    Toast.success('تم إضافة الإنجاز بنجاح');
                    await loadSectionDetails('achievements');
                } catch (error) {
                    Toast.close(loadingToast);
                    Toast.error('حدث خطأ أثناء إضافة الإنجاز');
                    console.error(error);
                    throw error;
                }
            }
        });
    }

    function openSponsorModal() {
        if (window.SponsorsManager) {
            window.SponsorsManager.addSponsor();
        } else {
            ModalHelper.form({
                title: '🤝 إضافة شريك جديد',
                fields: [
                    { name: 'name', type: 'text', label: 'اسم الشريك', placeholder: 'أدخل اسم الشريك', required: true },
                    { name: 'badge', type: 'text', label: 'الوسام', placeholder: 'مثال: شريك ذهبي' },
                    { name: 'logo_url', type: 'url', label: 'رابط الشعار', placeholder: 'https://example.com/logo.png' },
                    { name: 'link_url', type: 'url', label: 'رابط الموقع', placeholder: 'https://example.com' },
                    { name: 'description', type: 'textarea', label: 'الوصف', placeholder: 'وصف مختصر عن الشريك' },
                    { name: 'order', type: 'number', label: 'الترتيب', value: '0' }
                ],
                submitText: 'إضافة',
                cancelText: 'إلغاء',
                onSubmit: async (formData) => {
                    const loadingToast = Toast.loading('جاري إضافة الشريك...');
                    try {
                        const { error } = await sb.from('sponsors').insert([{
                            name: formData.name,
                            badge: formData.badge || null,
                            logo_url: formData.logo_url || null,
                            link_url: formData.link_url || null,
                            description: formData.description || null,
                            order: parseInt(formData.order) || 0,
                            created_by: currentUser?.id
                        }]);
                        if (error) throw error;
                        Toast.close(loadingToast);
                        Toast.success('تم إضافة الشريك بنجاح');
                        await loadSectionDetails('sponsors');
                    } catch (error) {
                        Toast.close(loadingToast);
                        Toast.error('حدث خطأ أثناء إضافة الشريك');
                        console.error(error);
                        throw error;
                    }
                }
            });
        }
    }

    function openFaqModal() {
        ModalHelper.form({
            title: '❓ إضافة سؤال شائع',
            fields: [
                { name: 'question', type: 'text', label: 'السؤال', placeholder: 'أدخل السؤال', required: true },
                { name: 'answer', type: 'textarea', label: 'الإجابة', placeholder: 'أدخل الإجابة', required: true },
                { name: 'order', type: 'number', label: 'الترتيب', value: '0' }
            ],
            submitText: 'إضافة',
            cancelText: 'إلغاء',
            onSubmit: async (formData) => {
                const loadingToast = Toast.loading('جاري إضافة السؤال...');
                try {
                    const { error } = await sb.from('faq').insert([{
                        question: formData.question,
                        answer: formData.answer,
                        order: parseInt(formData.order) || 0,
                        created_by: currentUser?.id
                    }]);
                    if (error) throw error;
                    Toast.close(loadingToast);
                    Toast.success('تم إضافة السؤال بنجاح');
                    await loadSectionDetails('faq');
                } catch (error) {
                    Toast.close(loadingToast);
                    Toast.error('حدث خطأ أثناء إضافة السؤال');
                    console.error(error);
                    throw error;
                }
            }
        });
    }

    // إعداد النماذج والأزرار
    function setupWebsiteModals() {
        // أزرار الإضافة - نوافذ منبثقة باستخدام ModalHelper.form
        const addWorkBtn = document.getElementById('addWorkBtn');
        const addAchievementBtn = document.getElementById('addAchievementBtn');
        const addSponsorBtn = document.getElementById('addSponsorBtn');
        const addFaqBtn = document.getElementById('addFaqBtn');

        if (addWorkBtn) addWorkBtn.addEventListener('click', () => openWorkModal());
        if (addAchievementBtn) addAchievementBtn.addEventListener('click', () => openAchievementModal());
        if (addSponsorBtn) addSponsorBtn.addEventListener('click', () => openSponsorModal());
        if (addFaqBtn) addFaqBtn.addEventListener('click', () => openFaqModal());

        // أزرار الإغلاق
        setupModalClose('workModal', 'closeWorkModal', 'cancelWorkBtn');
        setupModalClose('achievementModal', 'closeAchievementModal', 'cancelAchievementBtn');
        setupModalClose('sponsorModal', 'closeSponsorModal', 'cancelSponsorBtn');
        setupModalClose('faqModal', 'closeFaqModal', 'cancelFaqBtn');

    }

    function setupModalClose(modalId, closeBtnId, cancelBtnId) {
        const modal = document.getElementById(modalId);
        const closeBtn = document.getElementById(closeBtnId);
        const cancelBtn = document.getElementById(cancelBtnId);
        const overlay = document.getElementById('overlay');

        if (closeBtn) closeBtn.addEventListener('click', () => closeModal(modalId));
        if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal(modalId));
        if (overlay) overlay.addEventListener('click', () => {
            document.querySelectorAll('.modal.active').forEach(m => {
                m.classList.remove('active');
            });
            overlay.classList.remove('active');
        });
    }

    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        const overlay = document.getElementById('overlay');
        
        // إنشاء backdrop إذا لم يكن موجوداً
        let backdrop = document.querySelector('.modal-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop';
            document.body.appendChild(backdrop);
        }
        
        if (modal) {
            modal.classList.add('active');
            document.body.classList.add('modal-open');
        }
        if (backdrop) {
            backdrop.classList.add('active');
            // إغلاق عند الضغط على الخلفية
            backdrop.onclick = () => closeModal(modalId);
        }
        if (overlay) overlay.classList.add('active');
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        const overlay = document.getElementById('overlay');
        const backdrop = document.querySelector('.modal-backdrop');
        
        if (modal) {
            modal.classList.remove('active');
            const form = modal.querySelector('form');
            if (form) form.reset();
        }
        if (backdrop) backdrop.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        document.body.classList.remove('modal-open');
    }

    // نماذج الأعمال
    let currentWorkId = null;

    async function openWorkModal(workId = null) {
        currentWorkId = workId;
        
        // جلب آخر ترتيب
        let nextOrder = 1;
        if (!workId) {
            const { data: lastWork } = await sb.from('works').select('order').order('order', { ascending: false }).limit(1);
            if (lastWork && lastWork.length > 0) {
                nextOrder = (lastWork[0].order || 0) + 1;
            }
        }
        
        // جلب بيانات العمل إذا كان تعديل
        let workData = null;
        if (workId) {
            const { data, error } = await sb.from('works').select('*').eq('id', workId).single();
            if (!error) workData = data;
        }
        
        const fields = [
            { name: 'title', type: 'text', label: 'عنوان العمل', placeholder: 'أدخل عنوان العمل', required: true, value: workData?.title || '' },
            { name: 'category', type: 'text', label: 'التصنيف', placeholder: 'مثال: تصميم، برمجة', value: workData?.category || '' },
            { name: 'image_url', type: 'image', label: 'صورة العمل', folder: 'works', required: true, value: workData?.image_url || workData?.image || '' },
            { name: 'link_url', type: 'url', label: 'رابط العمل', placeholder: 'https://example.com', value: workData?.link_url || workData?.link || '' }
        ];
        
        ModalHelper.form({
            title: workId ? '✏️ تعديل عمل' : '💼 إضافة عمل جديد',
            fields: fields,
            submitText: workId ? 'حفظ التعديلات' : 'إضافة',
            cancelText: 'إلغاء',
            onSubmit: async (formData) => {
                const loadingToast = Toast.loading('جاري الحفظ...');
                try {
                    const saveData = {
                        title: formData.title,
                        category: formData.category || null,
                        image_url: formData.image_url || null,
                        link_url: formData.link_url || null
                    };
                    
                    if (currentWorkId) {
                        const { error } = await sb.from('works').update(saveData).eq('id', currentWorkId);
                        if (error) throw error;
                    } else {
                        saveData.order = nextOrder;
                        const { error } = await sb.from('works').insert([saveData]);
                        if (error) throw error;
                    }
                    
                    Toast.close(loadingToast);
                    Toast.success(currentWorkId ? 'تم تحديث العمل بنجاح' : 'تم إضافة العمل بنجاح');
                    await loadWebsiteWorksSection();
                } catch (error) {
                    Toast.close(loadingToast);
                    Toast.error('حدث خطأ أثناء الحفظ');
                    console.error(error);
                    throw error;
                }
            }
        });
    }

    window.editWork = function(id) {
        openWorkModal(id);
    };

    window.deleteWork = async function(id) {
        ModalHelper.confirm({
            title: '🗑️ حذف العمل',
            message: 'هل أنت متأكد من حذف هذا العمل؟ لا يمكن التراجع عن هذا الإجراء.',
            confirmText: 'حذف',
            cancelText: 'إلغاء',
            type: 'danger',
            onConfirm: async () => {
                const loadingToast = Toast.loading('جاري الحذف...');
                try {
                    const { error } = await sb.from('works').delete().eq('id', id);
                    if (error) throw error;
                    Toast.close(loadingToast);
                    Toast.success('تم حذف العمل بنجاح');
                    await loadWebsiteWorksSection();
                } catch (error) {
                    Toast.close(loadingToast);
                    Toast.error('حدث خطأ أثناء الحذف');
                    console.error(error);
                }
            }
        });
    };

    // نماذج الإنجازات
    let currentAchievementId = null;

    async function openAchievementModal(achievementId = null) {
        currentAchievementId = achievementId;
        
        // جلب آخر ترتيب
        let nextOrder = 1;
        if (!achievementId) {
            const { data: lastAchievement } = await sb.from('achievements').select('order').order('order', { ascending: false }).limit(1);
            if (lastAchievement && lastAchievement.length > 0) {
                nextOrder = (lastAchievement[0].order || 0) + 1;
            }
        }
        
        // جلب بيانات الإنجاز إذا كان تعديل
        let achievementData = null;
        if (achievementId) {
            const { data, error } = await sb.from('achievements').select('*').eq('id', achievementId).single();
            if (!error) achievementData = data;
        }
        
        const fields = [
            { name: 'label', type: 'text', label: 'العنوان', placeholder: 'مثال: عضو نشط', required: true, value: achievementData?.label || '' },
            { name: 'count_number', type: 'number', label: 'العدد', placeholder: '0', value: achievementData?.count_number?.toString() || '0' },
            { name: 'icon_class', type: 'text', label: 'أيقونة Font Awesome', placeholder: 'fa-solid fa-trophy', value: achievementData?.icon_class || '' },
            { name: 'plus_flag', type: 'checkbox', checkboxLabel: 'إضافة علامة + بعد الرقم', checked: achievementData?.plus_flag || false }
        ];
        
        ModalHelper.form({
            title: achievementId ? '✏️ تعديل إنجاز' : '🏆 إضافة إنجاز جديد',
            fields: fields,
            submitText: achievementId ? 'حفظ التعديلات' : 'إضافة',
            cancelText: 'إلغاء',
            onSubmit: async (formData) => {
                const loadingToast = Toast.loading('جاري الحفظ...');
                try {
                    const saveData = {
                        label: formData.label,
                        count_number: parseInt(formData.count_number) || 0,
                        icon_class: formData.icon_class || 'fa-solid fa-trophy',
                        plus_flag: formData.plus_flag === 'on' || formData.plus_flag === true
                    };
                    
                    if (currentAchievementId) {
                        const { error } = await sb.from('achievements').update(saveData).eq('id', currentAchievementId);
                        if (error) throw error;
                    } else {
                        saveData.order = nextOrder;
                        const { error } = await sb.from('achievements').insert([saveData]);
                        if (error) throw error;
                    }
                    
                    Toast.close(loadingToast);
                    Toast.success(currentAchievementId ? 'تم تحديث الإنجاز بنجاح' : 'تم إضافة الإنجاز بنجاح');
                    await loadWebsiteAchievementsSection();
                } catch (error) {
                    Toast.close(loadingToast);
                    Toast.error('حدث خطأ أثناء الحفظ');
                    console.error(error);
                    throw error;
                }
            }
        });
    }

    window.editAchievement = function(id) {
        openAchievementModal(id);
    };

    window.deleteAchievement = async function(id) {
        ModalHelper.confirm({
            title: '🗑️ حذف الإنجاز',
            message: 'هل أنت متأكد من حذف هذا الإنجاز؟ لا يمكن التراجع عن هذا الإجراء.',
            confirmText: 'حذف',
            cancelText: 'إلغاء',
            type: 'danger',
            onConfirm: async () => {
                const loadingToast = Toast.loading('جاري الحذف...');
                try {
                    const { error } = await sb.from('achievements').delete().eq('id', id);
                    if (error) throw error;
                    Toast.close(loadingToast);
                    Toast.success('تم حذف الإنجاز بنجاح');
                    await loadWebsiteAchievementsSection();
                } catch (error) {
                    Toast.close(loadingToast);
                    Toast.error('حدث خطأ أثناء الحذف');
                    console.error(error);
                }
            }
        });
    };

    // نماذج الشركاء
    let currentSponsorId = null;

    async function openSponsorModal(sponsorId = null) {
        currentSponsorId = sponsorId;
        
        // جلب آخر ترتيب
        let nextOrder = 1;
        if (!sponsorId) {
            const { data: lastSponsor } = await sb.from('sponsors').select('order').order('order', { ascending: false }).limit(1);
            if (lastSponsor && lastSponsor.length > 0) {
                nextOrder = (lastSponsor[0].order || 0) + 1;
            }
        }
        
        // جلب بيانات الشريك إذا كان تعديل
        let sponsorData = null;
        if (sponsorId) {
            const { data, error } = await sb.from('sponsors').select('*').eq('id', sponsorId).single();
            if (!error) sponsorData = data;
        }
        
        const fields = [
            { name: 'name', type: 'text', label: 'اسم الشريك', placeholder: 'أدخل اسم الشريك', required: true, value: sponsorData?.name || '' },
            { name: 'badge', type: 'text', label: 'الوسام', placeholder: 'مثال: شريك ذهبي', value: sponsorData?.badge || '' },
            { name: 'logo_url', type: 'image', label: 'شعار الشريك', folder: 'sponsors', value: sponsorData?.logo_url || sponsorData?.logo || '' },
            { name: 'link_url', type: 'url', label: 'رابط الموقع', placeholder: 'https://example.com', value: sponsorData?.link_url || sponsorData?.link || '' },
            { name: 'description', type: 'textarea', label: 'الوصف', placeholder: 'وصف مختصر عن الشريك', value: sponsorData?.description || '' }
        ];
        
        ModalHelper.form({
            title: sponsorId ? '✏️ تعديل شريك' : '🤝 إضافة شريك جديد',
            fields: fields,
            submitText: sponsorId ? 'حفظ التعديلات' : 'إضافة',
            cancelText: 'إلغاء',
            onSubmit: async (formData) => {
                const loadingToast = Toast.loading('جاري الحفظ...');
                try {
                    const saveData = {
                        name: formData.name,
                        badge: formData.badge || null,
                        logo_url: formData.logo_url || null,
                        link_url: formData.link_url || null,
                        description: formData.description || null
                    };
                    
                    if (currentSponsorId) {
                        const { error } = await sb.from('sponsors').update(saveData).eq('id', currentSponsorId);
                        if (error) throw error;
                    } else {
                        saveData.order = nextOrder;
                        const { error } = await sb.from('sponsors').insert([saveData]);
                        if (error) throw error;
                    }
                    
                    Toast.close(loadingToast);
                    Toast.success(currentSponsorId ? 'تم تحديث الشريك بنجاح' : 'تم إضافة الشريك بنجاح');
                    await loadWebsiteSponsorsSection();
                } catch (error) {
                    Toast.close(loadingToast);
                    Toast.error('حدث خطأ أثناء الحفظ');
                    console.error(error);
                    throw error;
                }
            }
        });
    }

    window.editSponsor = function(id) {
        openSponsorModal(id);
    };

    window.deleteSponsor = async function(id) {
        ModalHelper.confirm({
            title: '🗑️ حذف الشريك',
            message: 'هل أنت متأكد من حذف هذا الشريك؟ لا يمكن التراجع عن هذا الإجراء.',
            confirmText: 'حذف',
            cancelText: 'إلغاء',
            type: 'danger',
            onConfirm: async () => {
                const loadingToast = Toast.loading('جاري الحذف...');
                try {
                    const { error } = await sb.from('sponsors').delete().eq('id', id);
                    if (error) throw error;
                    Toast.close(loadingToast);
                    Toast.success('تم حذف الشريك بنجاح');
                    await loadWebsiteSponsorsSection();
                } catch (error) {
                    Toast.close(loadingToast);
                    Toast.error('حدث خطأ أثناء الحذف');
                    console.error(error);
                }
            }
        });
    };

    // نماذج الأسئلة الشائعة
    let currentFaqId = null;

    async function openFaqModal(faqId = null) {
        currentFaqId = faqId;
        
        // جلب آخر ترتيب
        let nextOrder = 1;
        if (!faqId) {
            const { data: lastFaq } = await sb.from('faq').select('order').order('order', { ascending: false }).limit(1);
            if (lastFaq && lastFaq.length > 0) {
                nextOrder = (lastFaq[0].order || 0) + 1;
            }
        }
        
        // جلب بيانات السؤال إذا كان تعديل
        let faqData = null;
        if (faqId) {
            const { data, error } = await sb.from('faq').select('*').eq('id', faqId).single();
            if (!error) faqData = data;
        }
        
        const fields = [
            { name: 'question', type: 'text', label: 'السؤال', placeholder: 'أدخل السؤال', required: true, value: faqData?.question || '' },
            { name: 'answer', type: 'textarea', label: 'الإجابة', placeholder: 'أدخل الإجابة', required: true, value: faqData?.answer || '' },
            { name: 'category', type: 'text', label: 'الفئة', placeholder: 'مثال: عام، العضوية', value: faqData?.category || '' }
        ];
        
        ModalHelper.form({
            title: faqId ? '✏️ تعديل سؤال' : '❓ إضافة سؤال جديد',
            fields: fields,
            submitText: faqId ? 'حفظ التعديلات' : 'إضافة',
            cancelText: 'إلغاء',
            onSubmit: async (formData) => {
                const loadingToast = Toast.loading('جاري الحفظ...');
                try {
                    const saveData = {
                        question: formData.question,
                        answer: formData.answer,
                        category: formData.category || null
                    };
                    
                    if (currentFaqId) {
                        const { error } = await sb.from('faq').update(saveData).eq('id', currentFaqId);
                        if (error) throw error;
                    } else {
                        saveData.order = nextOrder;
                        const { error } = await sb.from('faq').insert([saveData]);
                        if (error) throw error;
                    }
                    
                    Toast.close(loadingToast);
                    Toast.success(currentFaqId ? 'تم تحديث السؤال بنجاح' : 'تم إضافة السؤال بنجاح');
                    await loadWebsiteFaqSection();
                } catch (error) {
                    Toast.close(loadingToast);
                    Toast.error('حدث خطأ أثناء الحفظ');
                    console.error(error);
                    throw error;
                }
            }
        });
    }

    window.editFaq = function(id) {
        openFaqModal(id);
    };

    window.deleteFaq = async function(id) {
        ModalHelper.confirm({
            title: '🗑️ حذف السؤال',
            message: 'هل أنت متأكد من حذف هذا السؤال؟ لا يمكن التراجع عن هذا الإجراء.',
            confirmText: 'حذف',
            cancelText: 'إلغاء',
            type: 'danger',
            onConfirm: async () => {
                const loadingToast = Toast.loading('جاري الحذف...');
                try {
                    const { error } = await sb.from('faq').delete().eq('id', id);
                    if (error) throw error;
                    Toast.close(loadingToast);
                    Toast.success('تم حذف السؤال بنجاح');
                    await loadWebsiteFaqSection();
                } catch (error) {
                    Toast.close(loadingToast);
                    Toast.error('حدث خطأ أثناء الحذف');
                    console.error(error);
                }
            }
        });
    };


    // =====================================================
    // وظائف تبديل الترتيب
    // =====================================================

    // تهيئة الترتيب التلقائي للعناصر التي ترتيبها 0 أو null
    async function initializeOrderIfNeeded(table) {
        const { data: items, error } = await sb
            .from(table)
            .select('id, order')
            .order('id', { ascending: true });
        
        if (error || !items || items.length === 0) return;
        
        // تحقق هل كل العناصر ترتيبها 0 أو null
        const needsInit = items.every(item => !item.order || item.order === 0);
        if (!needsInit) return;
        
        // تعيين ترتيب تسلسلي
        for (let i = 0; i < items.length; i++) {
            await sb.from(table).update({ order: i + 1 }).eq('id', items[i].id);
        }
        console.log(`Initialized order for ${table}: ${items.length} items`);
    }

    async function swapOrder(table, id1, id2, order1, order2) {
        try {
            const { error: e1 } = await sb.from(table).update({ order: order2 }).eq('id', id1);
            if (e1) throw e1;
            const { error: e2 } = await sb.from(table).update({ order: order1 }).eq('id', id2);
            if (e2) throw e2;
            return true;
        } catch (error) {
            console.error('Error swapping order:', error);
            Toast.error('حدث خطأ أثناء تغيير الترتيب');
            return false;
        }
    }

    async function getAdjacentItem(table, currentOrder, direction) {
        // direction: 'up' = العنصر السابق (أقل ترتيب), 'down' = العنصر التالي (أعلى ترتيب)
        const orderNum = Number(currentOrder) || 0;
        
        try {
            // جلب جميع العناصر وفلترتها محلياً لتجنب تعارض اسم العمود "order" مع PostgREST
            const { data: allItems, error } = await sb
                .from(table)
                .select('id, order')
                .order('order', { ascending: true });
            
            if (error) throw error;
            if (!allItems || allItems.length === 0) return null;
            
            if (direction === 'up') {
                // البحث عن العنصر السابق (أقل ترتيب)
                const filtered = allItems.filter(item => (item.order || 0) < orderNum);
                if (filtered.length === 0) return null;
                // أعلى ترتيب من الأقل
                return filtered.reduce((max, item) => (item.order || 0) > (max.order || 0) ? item : max);
            } else {
                // البحث عن العنصر التالي (أعلى ترتيب)
                const filtered = allItems.filter(item => (item.order || 0) > orderNum);
                if (filtered.length === 0) return null;
                // أقل ترتيب من الأعلى
                return filtered.reduce((min, item) => (item.order || 0) < (min.order || 0) ? item : min);
            }
        } catch (error) {
            console.error('Error getting adjacent item:', error);
            return null;
        }
    }

    // متغير لمنع الضغط المتكرر أثناء الترتيب
    let isReordering = false;

    async function handleReorder(table, id, currentOrder, direction, reloadFn) {
        if (isReordering) {
            Toast.warning('جاري تغيير الترتيب، يرجى الانتظار...');
            return;
        }
        
        isReordering = true;
        const loadingToast = Toast.loading('جاري تغيير الترتيب...');
        
        try {
            const adjacent = await getAdjacentItem(table, currentOrder, direction);
            if (adjacent) {
                const success = await swapOrder(table, id, adjacent.id, currentOrder, adjacent.order);
                if (success) {
                    Toast.close(loadingToast);
                    Toast.success('تم تغيير الترتيب بنجاح');
                    await reloadFn();
                } else {
                    Toast.close(loadingToast);
                    Toast.error('حدث خطأ أثناء تغيير الترتيب');
                }
            } else {
                Toast.close(loadingToast);
            }
        } catch (error) {
            console.error('Error reordering:', error);
            Toast.close(loadingToast);
            Toast.error('حدث خطأ أثناء تغيير الترتيب');
        } finally {
            isReordering = false;
        }
    }

    window.moveWorkUp = async function(id, currentOrder) {
        await handleReorder('works', id, currentOrder, 'up', loadWebsiteWorksSection);
    };
    window.moveWorkDown = async function(id, currentOrder) {
        await handleReorder('works', id, currentOrder, 'down', loadWebsiteWorksSection);
    };
    window.moveAchievementUp = async function(id, currentOrder) {
        await handleReorder('achievements', id, currentOrder, 'up', loadWebsiteAchievementsSection);
    };
    window.moveAchievementDown = async function(id, currentOrder) {
        await handleReorder('achievements', id, currentOrder, 'down', loadWebsiteAchievementsSection);
    };
    window.moveFaqUp = async function(id, currentOrder) {
        await handleReorder('faq', id, currentOrder, 'up', loadWebsiteFaqSection);
    };
    window.moveFaqDown = async function(id, currentOrder) {
        await handleReorder('faq', id, currentOrder, 'down', loadWebsiteFaqSection);
    };
    window.moveSponsorUp = async function(id, currentOrder) {
        await handleReorder('sponsors', id, currentOrder, 'up', loadWebsiteSponsorsSection);
    };
    window.moveSponsorDown = async function(id, currentOrder) {
        await handleReorder('sponsors', id, currentOrder, 'down', loadWebsiteSponsorsSection);
    };


    // =====================================================
    // وظائف إحصائيات الزيارات
    // =====================================================
    let siteVisitsManager = null;
    let currentVisitsPeriod = 30;

    async function loadSiteVisitsSection() {
        try {
            showLoading(true);

            // التحقق من الصلاحيات
            if (!siteVisitsManager) {
                siteVisitsManager = new SiteVisitsManager(sb);
            }

            const hasPermission = await siteVisitsManager.checkPermissions();
            if (!hasPermission) {
                showError('ليس لديك صلاحية لعرض إحصائيات الزيارات');
                showLoading(false);
                return;
            }

            // تحميل البيانات
            await Promise.all([
                siteVisitsManager.renderStatsCards('visitsStatsGrid'),
                siteVisitsManager.renderVisitsChart('visitsTimelineChart', currentVisitsPeriod),
                siteVisitsManager.renderDeviceChart('devicesChart', currentVisitsPeriod),
                siteVisitsManager.renderCountriesChart('countriesChart', currentVisitsPeriod),
                siteVisitsManager.renderCitiesChart('citiesChart', currentVisitsPeriod),
                siteVisitsManager.renderTopPages('topPagesContainer', currentVisitsPeriod)
            ]);

            // إعداد المستمعات
            setupSiteVisitsListeners();

            showLoading(false);
        } catch (error) {
            console.error('Error loading site visits section:', error);
            showError('حدث خطأ أثناء تحميل إحصائيات الزيارات');
            showLoading(false);
        }
    }

    function setupSiteVisitsListeners() {
        // تغيير الفترة الزمنية
        const periodFilter = document.getElementById('visitsPeriodFilter');
        if (periodFilter) {
            periodFilter.addEventListener('change', async (e) => {
                currentVisitsPeriod = parseInt(e.target.value);
                await loadSiteVisitsSection();
            });
        }

        // تحديث البيانات
        const refreshBtn = document.getElementById('refreshVisitsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await loadSiteVisitsSection();
            });
        }

        // تصدير البيانات
        const exportBtn = document.getElementById('exportVisitsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', async () => {
                try {
                    showLoading(true);
                    await siteVisitsManager.exportData(currentVisitsPeriod, 'csv');
                    showLoading(false);
                } catch (error) {
                    console.error('Error exporting data:', error);
                    showError('حدث خطأ أثناء تصدير البيانات');
                    showLoading(false);
                }
            });
        }
    }

    // =====================================================
    // مركز الإشعارات
    // =====================================================
    /**
     * إعداد روابط مجموعات أدِيب
     */
    async function setupGroupLinks() {
        try {
            // جلب روابط المجموعات من قاعدة البيانات
            const { data: settings, error } = await sb
                .from('site_settings')
                .select('setting_key, setting_value')
                .in('setting_key', ['whatsapp_general_group', 'whatsapp_female_group'])
                .eq('is_active', true);

            if (error) throw error;

            // تحديث الروابط
            const generalGroupLink = document.getElementById('generalGroupLink');
            const femaleGroupLink = document.getElementById('femaleGroupLink');

            if (settings && settings.length > 0) {
                settings.forEach(setting => {
                    if (setting.setting_key === 'whatsapp_general_group' && generalGroupLink) {
                        generalGroupLink.href = setting.setting_value;
                        generalGroupLink.target = '_blank';
                    } else if (setting.setting_key === 'whatsapp_female_group' && femaleGroupLink) {
                        femaleGroupLink.href = setting.setting_value;
                        femaleGroupLink.target = '_blank';
                    }
                });
            }

            // رابط مجلس أدِيبات
            if (femaleGroupLink) {
                femaleGroupLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.open(femaleGroupLink.href, '_blank');
                });
            }
        } catch (error) {
            console.error('Error loading group links:', error);
        }
    }

    function setupNotificationsCenter() {
        const notificationsBtn = document.getElementById('notificationsBtn');
        const notificationsDropdown = document.getElementById('notificationsDropdown');
        const notificationsBackdrop = document.getElementById('notificationsBackdrop');
        const closeNotificationsBtn = document.getElementById('closeNotificationsBtn');
        const markAllReadBtn = document.getElementById('markAllReadBtn');
        
        if (!notificationsBtn || !notificationsDropdown) return;
        
        // فتح قائمة الإشعارات
        notificationsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationsDropdown.classList.add('active');
            if (notificationsBackdrop) {
                notificationsBackdrop.classList.add('active');
            }
            document.body.style.overflow = 'hidden';
        });
        
        // إغلاق القائمة
        const closeNotifications = () => {
            notificationsDropdown.classList.remove('active');
            if (notificationsBackdrop) {
                notificationsBackdrop.classList.remove('active');
            }
            document.body.style.overflow = '';
        };
        
        // إغلاق عند النقر على زر الإغلاق
        if (closeNotificationsBtn) {
            closeNotificationsBtn.addEventListener('click', closeNotifications);
        }
        
        // إغلاق عند النقر على الـ backdrop
        if (notificationsBackdrop) {
            notificationsBackdrop.addEventListener('click', closeNotifications);
        }
        
        // إغلاق عند الضغط على ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && notificationsDropdown.classList.contains('active')) {
                closeNotifications();
            }
        });
        
        // تعليم الكل كمقروء
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', async () => {
                await markAllNotificationsAsRead();
            });
        }
        
        // تحميل الإشعارات
        loadNotifications();
    }
    
    async function loadNotifications() {
        try {
            const notificationsList = document.getElementById('notificationsList');
            const notificationsBadge = document.getElementById('notificationsBadge');
            
            if (!notificationsList) return;
            
            // هنا يمكن جلب الإشعارات من قاعدة البيانات
            // مثال مؤقت:
            const notifications = [];
            
            if (notifications.length === 0) {
                notificationsList.innerHTML = `
                    <div class="empty-notifications">
                        <i class="fa-solid fa-bell-slash"></i>
                        <p>لا توجد إشعارات جديدة</p>
                    </div>
                `;
                notificationsBadge.textContent = '0';
                notificationsBadge.style.display = 'none';
            } else {
                const unreadCount = notifications.filter(n => !n.is_read).length;
                notificationsBadge.textContent = unreadCount;
                notificationsBadge.style.display = unreadCount > 0 ? 'flex' : 'none';
                
                notificationsList.innerHTML = notifications.map(notification => `
                    <div class="notification-item ${!notification.is_read ? 'unread' : ''}" 
                         data-notification-id="${notification.id}">
                        <div class="notification-icon ${notification.type}">
                            <i class="fa-solid ${getNotificationIcon(notification.type)}"></i>
                        </div>
                        <div class="notification-content">
                            <div class="notification-title">${notification.title}</div>
                            <div class="notification-message">${notification.message}</div>
                            <div class="notification-time">${formatTimeAgo(notification.created_at)}</div>
                        </div>
                    </div>
                `).join('');
                
                // إضافة مستمعات للنقر على الإشعارات
                document.querySelectorAll('.notification-item').forEach(item => {
                    item.addEventListener('click', async () => {
                        const notificationId = item.dataset.notificationId;
                        await markNotificationAsRead(notificationId);
                        item.classList.remove('unread');
                        updateNotificationsBadge();
                    });
                });
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }
    
    function getNotificationIcon(type) {
        const icons = {
            'info': 'fa-info-circle',
            'success': 'fa-check-circle',
            'warning': 'fa-exclamation-triangle',
            'error': 'fa-times-circle'
        };
        return icons[type] || 'fa-bell';
    }
    
    async function markNotificationAsRead(notificationId) {
        try {
            // تحديث حالة الإشعار في قاعدة البيانات
            // await sb.from('notifications').update({ is_read: true }).eq('id', notificationId);
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }
    
    async function markAllNotificationsAsRead() {
        try {
            // تحديث جميع الإشعارات في قاعدة البيانات
            // await sb.from('notifications').update({ is_read: true }).eq('user_id', currentUser.id);
            
            // تحديث الواجهة
            document.querySelectorAll('.notification-item.unread').forEach(item => {
                item.classList.remove('unread');
            });
            updateNotificationsBadge();
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    }
    
    function updateNotificationsBadge() {
        const unreadCount = document.querySelectorAll('.notification-item.unread').length;
        const badge = document.getElementById('notificationsBadge');
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        }
    }

    // تهيئة التطبيق عند تحميل الصفحة
    init();
})();

