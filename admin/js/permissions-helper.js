/**
 * نظام إدارة الصلاحيات - نادي أدِيب
 * يوفر دوال للتحقق من صلاحيات المستخدم
 */

window.PermissionsHelper = (function() {
    const sb = window.sbClient;
    let userPermissions = [];
    let permissionsLoaded = false;

    /**
     * تحميل صلاحيات المستخدم الحالي
     */
    async function loadUserPermissions(userId) {
        if (!userId) {
            console.error('User ID is required to load permissions');
            return [];
        }

        try {
            const { data, error } = await sb.rpc('get_user_permissions', {
                p_user_id: userId
            });

            if (error) {
                console.error('Error loading permissions:', error);
                return [];
            }

            userPermissions = data || [];
            permissionsLoaded = true;
            return userPermissions;
        } catch (error) {
            console.error('Error loading permissions:', error);
            return [];
        }
    }

    /**
     * التحقق من وجود صلاحية معينة
     */
    function hasPermission(permissionKey) {
        if (!permissionsLoaded) {
            console.warn('Permissions not loaded yet. Call loadUserPermissions first.');
            return false;
        }
        return userPermissions.some(p => p.permission_key === permissionKey);
    }

    /**
     * التحقق من وجود أي من الصلاحيات المحددة
     */
    function hasAnyPermission(permissionKeys) {
        if (!Array.isArray(permissionKeys)) {
            return hasPermission(permissionKeys);
        }
        return permissionKeys.some(key => hasPermission(key));
    }

    /**
     * التحقق من وجود جميع الصلاحيات المحددة
     */
    function hasAllPermissions(permissionKeys) {
        if (!Array.isArray(permissionKeys)) {
            return hasPermission(permissionKeys);
        }
        return permissionKeys.every(key => hasPermission(key));
    }

    /**
     * الحصول على جميع صلاحيات المستخدم
     */
    function getAllPermissions() {
        return [...userPermissions];
    }

    /**
     * الحصول على صلاحيات فئة معينة
     */
    function getPermissionsByCategory(category) {
        return userPermissions.filter(p => p.category === category);
    }

    /**
     * التحقق من صلاحية إدارة الانتخابات
     */
    function canManageElections() {
        return hasPermission('manage_elections');
    }

    /**
     * التحقق من صلاحية الترشح
     */
    function canNominateSelf() {
        return hasPermission('nominate_self');
    }

    /**
     * التحقق من صلاحية التصويت
     */
    function canVote() {
        return hasPermission('cast_vote');
    }

    /**
     * التحقق من صلاحية إدارة الأخبار
     */
    function canManageNews() {
        return hasAnyPermission(['manage_news', 'publish_news', 'instant_publish']);
    }

    /**
     * التحقق من صلاحية التنكر
     */
    function canImpersonate() {
        return hasPermission('impersonate_users');
    }

    /**
     * التحقق من صلاحية إدارة العضوية
     */
    function canManageMembership() {
        return hasAnyPermission(['manage_registration', 'gift_membership', 'approve_applications']);
    }

    /**
     * إعادة تعيين الصلاحيات (عند تسجيل الخروج)
     */
    function reset() {
        userPermissions = [];
        permissionsLoaded = false;
    }

    return {
        loadUserPermissions,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        getAllPermissions,
        getPermissionsByCategory,
        canManageElections,
        canNominateSelf,
        canVote,
        canManageNews,
        canImpersonate,
        canManageMembership,
        reset
    };
})();
