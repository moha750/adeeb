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
                .order('category', { ascending: true })
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
    async getPermissionsByCategory(category) {
        try {
            const { data, error } = await this.sb
                .from('permissions')
                .select('*')
                .eq('category', category)
                .order('permission_key', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting permissions by category:', error);
            return [];
        }
    }

    /**
     * الحصول على جميع الأقسام المتاحة
     * @returns {Promise<Array>}
     */
    async getCategories() {
        try {
            const { data, error } = await this.sb
                .from('permissions')
                .select('category')
                .order('category', { ascending: true });

            if (error) throw error;
            
            const categories = [...new Set(data.map(p => p.category).filter(Boolean))];
            return categories;
        } catch (error) {
            console.error('Error getting categories:', error);
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

/**
 * تهيئة قسم إدارة الصلاحيات في لوحة التحكم
 */
let _permissionsSectionInitialized = false;

window.initPermissionsSection = async function() {
    const sb = window.sbClient;
    if (!sb) return;
    if (_permissionsSectionInitialized) {
        const f = {
            category: document.getElementById('permissionsCategoryFilter')?.value || '',
            role:     document.getElementById('permissionsRoleFilter')?.value || '',
            search:   document.getElementById('permissionsSearchInput')?.value || ''
        };
        await loadMatrix(f.category, f.role, f.search);
        return;
    }
    _permissionsSectionInitialized = true;

    const categoryLabels = {
        admin:      'الإدارة',
        membership: 'العضوية',
        news:       'الأخبار',
        surveys:    'الاستبيانات',
        website:    'الموقع'
    };

    // تحميل الإحصائيات
    async function loadStats() {
        const [permsRes, rolesRes] = await Promise.all([
            sb.from('permissions').select('id, category'),
            sb.from('roles').select('id')
        ]);
        const perms = permsRes.data || [];
        const roles = rolesRes.data || [];
        const categories = [...new Set(perms.map(p => p.category).filter(Boolean))];

        const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        el('totalPermissionsCount', perms.length);
        el('totalRolesCount', roles.length);
        el('totalCategoriesCount', categories.length);
    }

    // بناء مصفوفة الصلاحيات
    async function loadMatrix(filterCategory = '', filterRole = '', searchTerm = '') {
        const container = document.getElementById('permissionsMatrixContainer');
        if (!container) return;

        let permQuery = sb.from('permissions').select('*').order('category').order('permission_key');
        if (filterCategory) permQuery = permQuery.eq('category', filterCategory);
        if (searchTerm) permQuery = permQuery.ilike('permission_name_ar', `%${searchTerm}%`);

        let rolesQuery = sb.from('roles').select('id, role_name_ar, role_level').order('role_level', { ascending: false });
        if (filterRole) rolesQuery = rolesQuery.eq('id', filterRole);

        const [{ data: perms }, { data: roles }, { data: rpData }] = await Promise.all([
            permQuery,
            rolesQuery,
            sb.from('role_permissions').select('role_id, permission_id')
        ]);

        if (!perms || !roles) return;

        const rpSet = new Set((rpData || []).map(r => `${r.role_id}_${r.permission_id}`));

        let html = `<table class="data-table" style="min-width:700px">
            <thead><tr>
                <th style="min-width:160px">الصلاحية</th>
                <th style="min-width:80px">الفئة</th>
                ${roles.map(r => `<th style="min-width:90px;font-size:.75rem">${r.role_name_ar}</th>`).join('')}
            </tr></thead><tbody>`;

        perms.forEach(p => {
            html += `<tr><td>${p.permission_name_ar}</td><td><span class="badge">${categoryLabels[p.category] || p.category}</span></td>`;
            roles.forEach(r => {
                const has = rpSet.has(`${r.id}_${p.id}`);
                html += `<td style="text-align:center">
                    <input type="checkbox" data-role="${r.id}" data-perm="${p.id}"
                        ${has ? 'checked' : ''}
                        onchange="window.toggleRolePermission(this, ${r.id}, '${p.permission_key}', ${has})"
                        title="${r.role_name_ar} ← ${p.permission_name_ar}">
                </td>`;
            });
            html += '</tr>';
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    // تعبئة قائمة المناصب في الفلتر
    async function populateRolesFilter() {
        const sel = document.getElementById('permissionsRoleFilter');
        if (!sel) return;
        const { data } = await sb.from('roles').select('id, role_name_ar').order('role_level', { ascending: false });
        (data || []).forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.id;
            opt.textContent = r.role_name_ar;
            sel.appendChild(opt);
        });
    }

    // تبديل صلاحية منصب
    window.toggleRolePermission = async function(checkbox, roleId, permKey, wasGranted) {
        checkbox.disabled = true;
        try {
            if (!wasGranted) {
                await sb.rpc('grant_permission_to_role', {
                    p_role_id: roleId,
                    p_permission_key: permKey,
                    p_scope: 'all',
                    p_granted_by: (await sb.auth.getUser()).data.user?.id,
                    p_conditions: {}
                });
            } else {
                await sb.rpc('revoke_permission_from_role', {
                    p_role_id: roleId,
                    p_permission_key: permKey,
                    p_scope: 'all',
                    p_revoked_by: (await sb.auth.getUser()).data.user?.id
                });
            }
            checkbox.dataset.original = checkbox.checked ? 'true' : 'false';
        } catch (e) {
            console.error('Error toggling permission:', e);
            checkbox.checked = wasGranted;
        }
        checkbox.disabled = false;
    };

    // مستمعات الفلاتر
    const getFilters = () => ({
        category: document.getElementById('permissionsCategoryFilter')?.value || '',
        role:     document.getElementById('permissionsRoleFilter')?.value || '',
        search:   document.getElementById('permissionsSearchInput')?.value || ''
    });

    ['permissionsCategoryFilter', 'permissionsRoleFilter'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => {
            const f = getFilters(); loadMatrix(f.category, f.role, f.search);
        });
    });

    let searchTimer;
    document.getElementById('permissionsSearchInput')?.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            const f = getFilters(); loadMatrix(f.category, f.role, f.search);
        }, 400);
    });

    document.getElementById('refreshPermissionsBtn')?.addEventListener('click', () => {
        const f = getFilters(); loadMatrix(f.category, f.role, f.search);
    });

    await Promise.all([loadStats(), populateRolesFilter(), loadMatrix()]);
};
