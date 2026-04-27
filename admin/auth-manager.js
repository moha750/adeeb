/**
 * نظام إدارة المصادقة والصلاحيات - نادي أدِيب
 * يوفر وظائف للتحقق من الأدوار والصلاحيات
 */

window.AuthManager = (function() {
    const sb = window.sbClient;

    /**
     * الحصول على معلومات المستخدم الحالي
     * يدعم دخول الرئيس كمستخدم - إذا كانت الجلسة نشطة، ترجع بيانات المستخدم المستهدف
     */
    async function getCurrentUser() {
        try {
            const { data: { session } } = await sb.auth.getSession();
            if (!session) return null;

            let userId = session.user.id;
            let isImpersonating = false;
            let realUserId = null;

            if (window.MasterAccess) {
                const active = window.MasterAccess.getActiveSession();
                if (active && active.adminUserId === session.user.id) {
                    userId = active.targetUserId;
                    isImpersonating = true;
                    realUserId = session.user.id;
                }
            }

            const { data: profile } = await sb
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profile && isImpersonating) {
                profile._isImpersonating = true;
                profile._realUserId = realUserId;
            }

            return profile;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    }

    /**
     * الحصول على أعلى دور للمستخدم
     * يدعم دخول الرئيس كمستخدم - يرجع دور المستخدم المستهدف
     */
    async function getUserRole(userId) {
        try {
            let targetUserId = userId;

            if (window.MasterAccess) {
                const { data: { session } } = await sb.auth.getSession();
                if (session) {
                    const active = window.MasterAccess.getActiveSession();
                    if (active && active.adminUserId === session.user.id && userId === session.user.id) {
                        targetUserId = active.targetUserId;
                    }
                }
            }

            const { data: userRoles, error } = await sb
                .from('user_roles')
                .select(`
                    *,
                    role:roles(*),
                    committee:committees(*)
                `)
                .eq('user_id', targetUserId)
                .eq('is_active', true);

            if (error) {
                console.error('Error fetching user roles:', error);
                return null;
            }

            if (!userRoles || userRoles.length === 0) return null;

            // activity_coordinator دور إضافي (يمنح صلاحية تسجيل الحضور فقط)
            // نستثنيه من اختيار الدور الأساسي حتى لا يُغيّر هوية العضو الظاهرة.
            // يبقى موجودًا في userRoles ويُكتشف لاحقًا عبر is_activity_coordinator.
            const isActivityCoordinator = userRoles.some(ur =>
                ur.role?.role_name === 'activity_coordinator'
            );
            const nonCoordRoles = userRoles.filter(ur =>
                ur.role?.role_name !== 'activity_coordinator'
            );
            const primaryPool = nonCoordRoles.length > 0 ? nonCoordRoles : userRoles;

            const sortedRoles = primaryPool.sort((a, b) => {
                return (b.role?.role_level || 0) - (a.role?.role_level || 0);
            });

            const userRole = sortedRoles[0];
            return {
                ...userRole,
                role_name: userRole.role?.role_name,
                role_name_ar: userRole.role?.role_name_ar,
                role_level: userRole.role?.role_level,
                role_category: userRole.role?.role_category,
                committee_name_ar: userRole.committee?.committee_name_ar,
                is_activity_coordinator: isActivityCoordinator,
            };
        } catch (error) {
            console.error('Error getting user role:', error);
            return null;
        }
    }

    /**
     * الحصول على جميع أدوار المستخدم
     */
    async function getUserRoles(userId) {
        try {
            const { data: userRoles, error } = await sb
                .from('user_roles')
                .select(`
                    *,
                    role:roles(*),
                    committee:committees(*)
                `)
                .eq('user_id', userId)
                .eq('is_active', true);

            if (error) {
                console.error('Error fetching user roles:', error);
                return [];
            }

            if (!userRoles) return [];

            // ترتيب الأدوار حسب المستوى يدوياً
            return userRoles.sort((a, b) => {
                return (b.role?.role_level || 0) - (a.role?.role_level || 0);
            });
        } catch (error) {
            console.error('Error getting user roles:', error);
            return [];
        }
    }

    /**
     * التحقق من مستوى الصلاحية
     */
    async function checkRoleLevel(userId, minLevel) {
        const userRole = await getUserRole(userId);
        if (!userRole) return false;
        return userRole.role_level >= minLevel;
    }

    /**
     * التحقق من صلاحية معينة
     */
    async function checkPermission(userId, permissionName, actionType = 'read') {
        try {
            const { data: permissions } = await sb
                .rpc('get_user_permissions', { user_uuid: userId });

            if (!permissions || permissions.length === 0) return false;

            const permission = permissions.find(p => p.permission_name === permissionName);
            if (!permission) return false;

            switch (actionType) {
                case 'create':
                    return permission.can_create;
                case 'read':
                    return permission.can_read;
                case 'update':
                    return permission.can_update;
                case 'delete':
                    return permission.can_delete;
                default:
                    return false;
            }
        } catch (error) {
            console.error('Error checking permission:', error);
            return false;
        }
    }

    /**
     * الحصول على جميع صلاحيات المستخدم
     */
    async function getUserPermissions(userId) {
        try {
            const { data: permissions } = await sb
                .rpc('get_user_permissions', { user_uuid: userId });

            return permissions || [];
        } catch (error) {
            console.error('Error getting user permissions:', error);
            return [];
        }
    }

    /**
     * التحقق من عضوية المستخدم في لجنة
     */
    async function isUserInCommittee(userId, committeeId) {
        try {
            const { data: userRoles } = await sb
                .from('user_roles')
                .select('id')
                .eq('user_id', userId)
                .eq('committee_id', committeeId)
                .eq('is_active', true)
                .limit(1);

            return userRoles && userRoles.length > 0;
        } catch (error) {
            console.error('Error checking committee membership:', error);
            return false;
        }
    }

    /**
     * الحصول على لجان المستخدم
     */
    async function getUserCommittees(userId) {
        try {
            const { data: userRoles } = await sb
                .from('user_roles')
                .select(`
                    committee:committees(*)
                `)
                .eq('user_id', userId)
                .eq('is_active', true)
                .not('committee_id', 'is', null);

            return userRoles?.map(ur => ur.committee).filter(c => c) || [];
        } catch (error) {
            console.error('Error getting user committees:', error);
            return [];
        }
    }

    /**
     * تسجيل نشاط المستخدم
     */
    async function logActivity(userId, actionType, targetType, targetId, details = null) {
        try {
            await sb.rpc('log_activity', {
                p_user_id: userId,
                p_action_type: actionType,
                p_target_type: targetType,
                p_target_id: targetId.toString(),
                p_details: details,
                p_ip_address: null
            });
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }

    /**
     * حماية الصفحة - التحقق من تسجيل الدخول والصلاحيات
     */
    async function protectPage(minRoleLevel = 3, redirectUrl = '/auth/login.html') {
        try {
            const { data: { session } } = await sb.auth.getSession();
            
            if (!session) {
                location.replace(redirectUrl);
                return null;
            }

            const userId = session.user.id;
            const profile = await getCurrentUser();
            
            if (!profile || profile.account_status !== 'active') {
                await sb.auth.signOut();
                location.replace(redirectUrl);
                return null;
            }

            const userRole = await getUserRole(userId);
            
            if (!userRole || userRole.role_level < minRoleLevel) {
                await sb.auth.signOut();
                location.replace(redirectUrl);
                return null;
            }

            return {
                user: profile,
                role: userRole,
                session: session
            };
        } catch (error) {
            console.error('Error protecting page:', error);
            location.replace(redirectUrl);
            return null;
        }
    }

    /**
     * تسجيل الخروج
     */
    async function logout() {
        try {
            const { data: { session } } = await sb.auth.getSession();
            if (session) {
                await logActivity(session.user.id, 'logout', 'auth', session.user.id);
            }
            await sb.auth.signOut();
            location.replace('/auth/login.html');
        } catch (error) {
            console.error('Error logging out:', error);
            location.replace('/auth/login.html');
        }
    }

    /**
     * الحصول على معلومات الدور بناءً على المستوى
     */
    function getRoleLevelInfo(roleLevel) {
        const levels = {
            10: { name: 'رئيس النادي', color: '#dc2626', icon: 'fa-crown' },
            9: { name: 'قائد مجلس أعلى', color: '#ea580c', icon: 'fa-star' },
            8: { name: 'عضو إداري / رئيس مجلس', color: '#d97706', icon: 'fa-user-tie' },
            7: { name: 'قائد لجنة', color: '#16a34a', icon: 'fa-users-gear' },
            6: { name: 'نائب قائد لجنة', color: '#0891b2', icon: 'fa-user-check' },
            5: { name: 'عضو لجنة', color: '#2563eb', icon: 'fa-user' },
            1: { name: 'عضو عادي', color: '#64748b', icon: 'fa-user-circle' }
        };

        return levels[roleLevel] || levels[1];
    }

    /**
     * تنسيق اسم الدور للعرض
     */
    function formatRoleName(roleName, roleNameAr) {
        return roleNameAr || roleName;
    }

    /**
     * التحقق من صلاحية الوصول لقسم معين
     */
    async function canAccessSection(userId, sectionName) {
        const userRole = await getUserRole(userId);
        if (!userRole) return false;

        const sectionPermissions = {
            'users': 8,
            'committees': 8,
            'projects': 7,
            'tasks': 5,
            'meetings': 5,
            'reports': 7,
            'evaluations': 7,
            'announcements': 7,
            'settings': 10
        };

        const requiredLevel = sectionPermissions[sectionName] || 10;
        return userRole.role_level >= requiredLevel;
    }

    /**
     * الحصول على ID المستخدم الفعّال (يحترم دخول الرئيس كمستخدم)
     * عند الدخول كمستخدم: يعيد ID المستخدم المستهدف
     * بدون جلسة: يعيد ID المستخدم الحقيقي
     */
    async function getEffectiveUserId() {
        const profile = await getCurrentUser();
        if (profile?.id) return profile.id;
        const { data: { user } } = await sb.auth.getUser();
        return user?.id || null;
    }

    /**
     * التحقق مما إذا كان الرئيس في جلسة دخول كمستخدم حالياً
     */
    async function isImpersonating() {
        const profile = await getCurrentUser();
        return profile?._isImpersonating === true;
    }

    // إرجاع الوظائف العامة
    return {
        getCurrentUser,
        getEffectiveUserId,
        isImpersonating,
        getUserRole,
        getUserRoles,
        checkRoleLevel,
        checkPermission,
        getUserPermissions,
        isUserInCommittee,
        getUserCommittees,
        logActivity,
        protectPage,
        logout,
        getRoleLevelInfo,
        formatRoleName,
        canAccessSection
    };
})();
