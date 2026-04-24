/**
 * نظام دخول الرئيس كمستخدم (Master Access)
 * يسمح لرئيس النادي فقط (role_level = 10) بالدخول على لوحة تحكم أي مستخدم
 * لمساعدته أو التأكد من إضافة معينة. frontend-only، بدون audit log أو انتهاء تلقائي.
 */

window.MasterAccess = (function() {
    const sb = window.sbClient;
    const STORAGE_KEY = 'master_access_session';
    const PRESIDENT_ROLE_LEVEL = 10;

    function getActiveSession() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const session = JSON.parse(raw);
            if (!session || !session.targetUserId || !session.adminUserId) return null;
            return session;
        } catch (_) {
            localStorage.removeItem(STORAGE_KEY);
            return null;
        }
    }

    async function getCurrentRoleLevel() {
        try {
            const { data: { session } } = await sb.auth.getSession();
            if (!session) return 0;
            const { data: userRoles } = await sb
                .from('user_roles')
                .select('role:roles(role_level)')
                .eq('user_id', session.user.id)
                .eq('is_active', true);
            if (!userRoles || !userRoles.length) return 0;
            return userRoles.reduce((max, r) => Math.max(max, r.role?.role_level || 0), 0);
        } catch (_) {
            return 0;
        }
    }

    async function canUseMasterAccess() {
        const level = await getCurrentRoleLevel();
        return level >= PRESIDENT_ROLE_LEVEL;
    }

    async function startAccess(targetUserId, targetName) {
        if (!targetUserId) return;

        const allowed = await canUseMasterAccess();
        if (!allowed) {
            alert('هذه الميزة متاحة لرئيس النادي فقط.');
            return;
        }

        const { data: { session } } = await sb.auth.getSession();
        if (!session) return;

        if (targetUserId === session.user.id) {
            alert('لا يمكنك الدخول على حسابك الخاص.');
            return;
        }

        if (!confirm(`الدخول على حساب ${targetName || 'المستخدم'}؟\nستتصفح النظام كأنك هو حتى تضغط "خروج".`)) {
            return;
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            targetUserId,
            targetName: targetName || '',
            adminUserId: session.user.id,
            startedAt: new Date().toISOString()
        }));

        window.location.reload();
    }

    function endAccess() {
        localStorage.removeItem(STORAGE_KEY);
        window.location.reload();
    }

    function renderBanner(targetName) {
        const existing = document.getElementById('masterAccessBanner');
        if (existing) existing.remove();

        const banner = document.createElement('div');
        banner.id = 'masterAccessBanner';
        banner.className = 'master-access-banner';
        banner.innerHTML = `
            <div class="master-access-banner__content">
                <i class="fa-solid fa-user-shield master-access-banner__icon"></i>
                <span class="master-access-banner__text">
                    أنت تتصفح كـ <strong>${escapeHtml(targetName || 'مستخدم')}</strong>
                </span>
            </div>
            <button type="button" class="master-access-banner__exit" id="masterAccessExitBtn">
                <i class="fa-solid fa-right-from-bracket"></i>
                خروج
            </button>
        `;
        document.body.prepend(banner);
        document.body.classList.add('is-masquerading');

        document.getElementById('masterAccessExitBtn').addEventListener('click', endAccess);
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    async function initOnLoad() {
        const session = getActiveSession();
        if (!session) return;

        const { data: { session: authSession } } = await sb.auth.getSession();
        if (!authSession || authSession.user.id !== session.adminUserId) {
            localStorage.removeItem(STORAGE_KEY);
            return;
        }

        const allowed = await canUseMasterAccess();
        if (!allowed) {
            localStorage.removeItem(STORAGE_KEY);
            return;
        }

        renderBanner(session.targetName);
    }

    return {
        getActiveSession,
        canUseMasterAccess,
        startAccess,
        endAccess,
        initOnLoad
    };
})();
