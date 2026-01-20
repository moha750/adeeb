/**
 * =====================================================
 * مكتبة إدارة الصلاحيات المركزية لنادي أدِيب
 * Adeeb Centralized Permissions Manager
 * =====================================================
 * تاريخ الإنشاء: 2026-01-17
 * الوصف: مكتبة JavaScript شاملة للتحقق من الصلاحيات وإدارتها
 * =====================================================
 */

class AdeebPermissionsManager {
    constructor(supabaseClient) {
        if (!supabaseClient) {
            throw new Error('Supabase client is required');
        }
        this.sb = supabaseClient;
        this.cache = new Map();
        this.cacheTTL = 5 * 60 * 1000; // 5 دقائق
        this.currentUser = null;
        this.userPermissions = null;
    }

    /**
     * تهيئة المدير وتحميل بيانات المستخدم
     */
    async initialize() {
        try {
            const { data: { user }, error } = await this.sb.auth.getUser();
            if (error) throw error;
            
            this.currentUser = user;
            
            if (user) {
                await this.loadUserPermissions();
            }
            
            return true;
        } catch (error) {
            console.error('Failed to initialize permissions manager:', error);
            return false;
        }
    }

    /**
     * تحميل جميع صلاحيات المستخدم
     */
    async loadUserPermissions() {
        try {
            const { data, error } = await this.sb.rpc('get_user_all_permissions', {
                p_user_id: this.currentUser.id
            });

            if (error) throw error;

            this.userPermissions = data || [];
            this.cache.set('user_permissions', {
                value: this.userPermissions,
                timestamp: Date.now()
            });

            return this.userPermissions;
        } catch (error) {
            console.error('Failed to load user permissions:', error);
            return [];
        }
    }

    /**
     * التحقق من صلاحية معينة
     * @param {string} permissionKey - مفتاح الصلاحية (مثال: 'users.view.all')
     * @param {string} scope - النطاق ('all', 'own', 'committee', 'department')
     * @param {object} context - السياق الإضافي
     * @returns {Promise<boolean>}
     */
    async checkPermission(permissionKey, scope = 'all', context = {}) {
        try {
            const cacheKey = `perm_${permissionKey}_${scope}`;
            
            // التحقق من الكاش
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTTL) {
                    return cached.value;
                }
            }

            // إذا لم يكن المستخدم مسجل دخول
            if (!this.currentUser) {
                return false;
            }

            // استدعاء دالة التحقق من قاعدة البيانات
            const { data, error } = await this.sb.rpc('check_permission', {
                p_user_id: this.currentUser.id,
                p_permission_key: permissionKey,
                p_scope: scope,
                p_context: context
            });

            if (error) {
                console.error('Permission check failed:', error);
                return false;
            }

            // حفظ في الكاش
            this.cache.set(cacheKey, {
                value: data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.error('Error checking permission:', error);
            return false;
        }
    }

    /**
     * التحقق من أي صلاحية من قائمة صلاحيات
     * @param {string[]} permissionKeys - قائمة مفاتيح الصلاحيات
     * @param {string} scope - النطاق
     * @returns {Promise<boolean>}
     */
    async checkAnyPermission(permissionKeys, scope = 'all') {
        try {
            const { data, error } = await this.sb.rpc('check_any_permission', {
                p_user_id: this.currentUser.id,
                p_permission_keys: permissionKeys,
                p_scope: scope
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error checking any permission:', error);
            return false;
        }
    }

    /**
     * الحصول على جميع صلاحيات المستخدم
     * @returns {Promise<Array>}
     */
    async getUserPermissions() {
        if (this.userPermissions) {
            return this.userPermissions;
        }
        return await this.loadUserPermissions();
    }

    /**
     * الحصول على صلاحيات المستخدم حسب القسم
     * @param {string} module - اسم القسم
     * @returns {Promise<Array>}
     */
    async getUserPermissionsByModule(module) {
        try {
            const { data, error } = await this.sb.rpc('get_user_permissions_by_module', {
                p_user_id: this.currentUser.id,
                p_module: module
            });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting permissions by module:', error);
            return [];
        }
    }

    /**
     * الحصول على صلاحيات دور معين
     * @param {number} roleId - معرف الدور
     * @returns {Promise<Array>}
     */
    async getRolePermissions(roleId) {
        try {
            const { data, error } = await this.sb.rpc('get_role_permissions', {
                p_role_id: roleId
            });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting role permissions:', error);
            return [];
        }
    }

    /**
     * منح صلاحية لدور
     * @param {number} roleId - معرف الدور
     * @param {string} permissionKey - مفتاح الصلاحية
     * @param {string} scope - النطاق
     * @param {object} conditions - الشروط الإضافية
     * @returns {Promise<boolean>}
     */
    async grantPermissionToRole(roleId, permissionKey, scope = 'all', conditions = {}) {
        try {
            const { data, error } = await this.sb.rpc('grant_permission_to_role', {
                p_role_id: roleId,
                p_permission_key: permissionKey,
                p_scope: scope,
                p_granted_by: this.currentUser.id,
                p_conditions: conditions
            });

            if (error) throw error;
            
            this.clearCache();
            return data;
        } catch (error) {
            console.error('Error granting permission to role:', error);
            throw error;
        }
    }

    /**
     * إلغاء صلاحية من دور
     * @param {number} roleId - معرف الدور
     * @param {string} permissionKey - مفتاح الصلاحية
     * @param {string} scope - النطاق
     * @returns {Promise<boolean>}
     */
    async revokePermissionFromRole(roleId, permissionKey, scope = 'all') {
        try {
            const { data, error } = await this.sb.rpc('revoke_permission_from_role', {
                p_role_id: roleId,
                p_permission_key: permissionKey,
                p_scope: scope,
                p_revoked_by: this.currentUser.id
            });

            if (error) throw error;
            
            this.clearCache();
            return data;
        } catch (error) {
            console.error('Error revoking permission from role:', error);
            throw error;
        }
    }

    /**
     * منح صلاحية خاصة لمستخدم
     * @param {string} userId - معرف المستخدم
     * @param {string} permissionKey - مفتاح الصلاحية
     * @param {string} scope - النطاق
     * @param {boolean} isGranted - منح أم حظر
     * @param {Date} expiresAt - تاريخ الانتهاء
     * @param {string} notes - ملاحظات
     * @returns {Promise<boolean>}
     */
    async grantUserSpecificPermission(userId, permissionKey, scope = 'all', isGranted = true, expiresAt = null, notes = null) {
        try {
            const { data, error } = await this.sb.rpc('grant_user_specific_permission', {
                p_user_id: userId,
                p_permission_key: permissionKey,
                p_scope: scope,
                p_is_granted: isGranted,
                p_expires_at: expiresAt,
                p_granted_by: this.currentUser.id,
                p_notes: notes
            });

            if (error) throw error;
            
            this.clearCache();
            return data;
        } catch (error) {
            console.error('Error granting user specific permission:', error);
            throw error;
        }
    }

    /**
     * الحصول على جميع الصلاحيات المتاحة
     * @returns {Promise<Array>}
     */
    async getAllPermissions() {
        try {
            const { data, error } = await this.sb
                .from('permissions')
                .select('*')
                .order('module', { ascending: true })
                .order('permission_key', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting all permissions:', error);
            return [];
        }
    }

    /**
     * الحصول على الصلاحيات حسب القسم
     * @param {string} module - اسم القسم
     * @returns {Promise<Array>}
     */
    async getPermissionsByModule(module) {
        try {
            const { data, error } = await this.sb
                .from('permissions')
                .select('*')
                .eq('module', module)
                .order('permission_key', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting permissions by module:', error);
            return [];
        }
    }

    /**
     * الحصول على جميع الأقسام المتاحة
     * @returns {Promise<Array>}
     */
    async getModules() {
        try {
            const { data, error } = await this.sb
                .from('permissions')
                .select('module')
                .order('module', { ascending: true });

            if (error) throw error;
            
            const modules = [...new Set(data.map(p => p.module))];
            return modules;
        } catch (error) {
            console.error('Error getting modules:', error);
            return [];
        }
    }

    /**
     * الحصول على سجل التدقيق للصلاحيات
     * @param {object} filters - فلاتر البحث
     * @returns {Promise<Array>}
     */
    async getPermissionsAuditLog(filters = {}) {
        try {
            let query = this.sb
                .from('permissions_audit_log')
                .select(`
                    *,
                    performer:performed_by(full_name, username),
                    target_user:user_id(full_name, username),
                    target_role:role_id(role_name_ar)
                `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (filters.action_type) {
                query = query.eq('action_type', filters.action_type);
            }
            if (filters.target_type) {
                query = query.eq('target_type', filters.target_type);
            }
            if (filters.user_id) {
                query = query.eq('user_id', filters.user_id);
            }
            if (filters.role_id) {
                query = query.eq('role_id', filters.role_id);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting audit log:', error);
            return [];
        }
    }

    /**
     * إخفاء/إظهار عناصر DOM حسب الصلاحية
     * @param {string} selector - محدد CSS
     * @param {string} permissionKey - مفتاح الصلاحية
     * @param {string} scope - النطاق
     */
    async toggleElementByPermission(selector, permissionKey, scope = 'all') {
        const hasPermission = await this.checkPermission(permissionKey, scope);
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(element => {
            if (hasPermission) {
                element.style.display = '';
                element.removeAttribute('disabled');
            } else {
                element.style.display = 'none';
                element.setAttribute('disabled', 'true');
            }
        });
    }

    /**
     * تطبيق الصلاحيات على عناصر الصفحة
     * يبحث عن العناصر التي تحتوي على data-permission
     */
    async applyPermissionsToPage() {
        const elements = document.querySelectorAll('[data-permission]');
        
        for (const element of elements) {
            const permissionKey = element.getAttribute('data-permission');
            const scope = element.getAttribute('data-permission-scope') || 'all';
            const action = element.getAttribute('data-permission-action') || 'hide';
            
            const hasPermission = await this.checkPermission(permissionKey, scope);
            
            if (!hasPermission) {
                if (action === 'hide') {
                    element.style.display = 'none';
                } else if (action === 'disable') {
                    element.setAttribute('disabled', 'true');
                    element.classList.add('disabled');
                } else if (action === 'remove') {
                    element.remove();
                }
            }
        }
    }

    /**
     * مسح الكاش
     */
    clearCache() {
        this.cache.clear();
        this.userPermissions = null;
    }

    /**
     * تسجيل الخروج وتنظيف البيانات
     */
    logout() {
        this.currentUser = null;
        this.userPermissions = null;
        this.clearCache();
    }
}

// تصدير المكتبة للاستخدام العام
if (typeof window !== 'undefined') {
    window.AdeebPermissionsManager = AdeebPermissionsManager;
}
