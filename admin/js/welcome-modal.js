/**
 * نافذة ترحيب بالعضو عند أول تسجيل دخول
 * تعتمد على modals.css (modal-confirm) بلون افتراضي + بالونات متحركة.
 */

window.WelcomeModal = (function () {
    const sb = window.sbClient;
    const STORAGE_PREFIX = 'adeeb_welcome_seen_';

    async function isFirstLogin(userId) {
        try {
            if (localStorage.getItem(STORAGE_PREFIX + userId) === '1') {
                return false;
            }

            const { count, error } = await sb
                .from('activity_log')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('action_type', 'login');

            if (error) {
                console.warn('[WelcomeModal] تعذر جلب سجل الأنشطة:', error);
                return false;
            }

            return (count ?? 0) <= 1;
        } catch (err) {
            console.warn('[WelcomeModal] خطأ غير متوقع:', err);
            return false;
        }
    }

    function markSeen(userId) {
        try {
            localStorage.setItem(STORAGE_PREFIX + userId, '1');
        } catch {}
    }

    async function fetchContext(userId) {
        try {
            const { data, error } = await sb
                .from('user_roles')
                .select(`
                    role:roles(role_name, role_name_ar, role_level),
                    committee:committees(committee_name_ar, department:departments(name_ar)),
                    department:departments(name_ar)
                `)
                .eq('user_id', userId)
                .eq('is_active', true);

            if (error || !data || data.length === 0) return {};

            const sorted = data.sort((a, b) => (b.role?.role_level || 0) - (a.role?.role_level || 0));
            const top = sorted[0];
            return {
                roleLabel: top.role?.role_name_ar || top.role?.role_name || '',
                committeeLabel: top.committee?.committee_name_ar || '',
                departmentLabel: top.department?.name_ar || top.committee?.department?.name_ar || ''
            };
        } catch (err) {
            console.warn('[WelcomeModal] تعذر جلب بيانات الدور:', err);
            return {};
        }
    }

    // ──────────────────────────────────────────
    //  Balloons Canvas — نفس فكرة eid-game.html
    // ──────────────────────────────────────────
    function launchBalloons() {
        const existing = document.getElementById('welcomeBalloonsCanvas');
        if (existing) existing.remove();

        const canvas = document.createElement('canvas');
        canvas.id = 'welcomeBalloonsCanvas';
        canvas.className = 'welcome-balloons-canvas';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');

        function resize() {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        const COLORS = [
            '#10b981', '#f59e0b', '#ef4444', '#3b82f6',
            '#8b5cf6', '#14b8a6', '#ec4899',
        ];

        class Balloon {
            constructor(delayOffset) {
                this.x         = Math.random() * canvas.width;
                this.y         = canvas.height + 60 + delayOffset;
                this.r         = 18 + Math.random() * 22;
                this.color     = COLORS[Math.floor(Math.random() * COLORS.length)];
                this.speedY    = 1.2 + Math.random() * 1.6;
                this.speedX    = (Math.random() - 0.5) * 0.8;
                this.sway      = Math.random() * Math.PI * 2;
                this.swaySpeed = 0.02 + Math.random() * 0.02;
                this.swayAmp   = 20 + Math.random() * 30;
                this.opacity   = 0.75 + Math.random() * 0.25;
                this.baseX     = this.x;
                this.done      = false;
            }
            update() {
                this.sway  += this.swaySpeed;
                this.x      = this.baseX + Math.sin(this.sway) * this.swayAmp;
                this.y     -= this.speedY;
                this.baseX += this.speedX;
                if (this.y < -this.r * 2) this.done = true;
            }
            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;

                ctx.beginPath();
                ctx.ellipse(this.x, this.y, this.r * 0.85, this.r, 0, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();

                ctx.beginPath();
                ctx.ellipse(
                    this.x - this.r * 0.25,
                    this.y - this.r * 0.3,
                    this.r * 0.2,
                    this.r * 0.3,
                    -Math.PI / 4, 0, Math.PI * 2
                );
                ctx.fillStyle = 'rgba(255,255,255,.35)';
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(this.x, this.y + this.r);
                ctx.quadraticCurveTo(
                    this.x + 8, this.y + this.r + 15,
                    this.x - 4, this.y + this.r + 28
                );
                ctx.strokeStyle = this.color;
                ctx.lineWidth   = 1.2;
                ctx.globalAlpha = this.opacity * 0.6;
                ctx.stroke();

                ctx.restore();
            }
        }

        const COUNT = 60;
        const balloons = Array.from({ length: COUNT }, (_, i) =>
            new Balloon(i * (canvas.height / COUNT))
        );

        let animId;
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            balloons.forEach(b => { if (!b.done) { b.update(); b.draw(); } });

            if (balloons.every(b => b.done)) {
                cancelAnimationFrame(animId);
                canvas.remove();
                window.removeEventListener('resize', resize);
                return;
            }
            animId = requestAnimationFrame(animate);
        }
        animate();
    }

    // ──────────────────────────────────────────
    //  بناء وعرض النافذة
    // ──────────────────────────────────────────
    async function show(user, role) {
        if (!window.ModalHelper) {
            console.warn('[WelcomeModal] ModalHelper غير متاح');
            return;
        }

        const ctx = await fetchContext(user.id);
        const roleLabel       = ctx.roleLabel       || role?.role_name_ar || role?.role_name || '';
        const committeeLabel  = ctx.committeeLabel  || role?.committee_name_ar || '';
        const departmentLabel = ctx.departmentLabel || '';

        const firstName = (user.full_name || '').trim().split(/\s+/)[0] || 'عزيزنا العضو';

        const badges = [
            roleLabel       ? { icon: 'fa-user-shield', label: roleLabel }       : null,
            departmentLabel ? { icon: 'fa-sitemap',     label: departmentLabel } : null,
            committeeLabel  ? { icon: 'fa-users',       label: committeeLabel }  : null,
        ].filter(Boolean);

        const badgesHtml = badges.length ? `
            <div class="welcome-modal-badge">
                ${badges.map(b => `
                    <span class="welcome-modal-badge-item">
                        <i class="fa-solid ${b.icon}"></i> ${b.label}
                    </span>
                `).join('')}
            </div>
        ` : '';

        const bodyHtml = `
            <div class="modal-confirm-icon">
                <i class="fa-solid fa-hands-clapping"></i>
            </div>
            <div class="modal-confirm-content">
                <h3 class="modal-confirm-title">أهلاً أهلاً ${firstName} نوّرت عائلتك 🥳💙!</h3>
                <p class="modal-confirm-message">
                    يُسعدنا انضمامك لعائلة أدِيب. ولا تستحي المكان مكانك،
                    هِنا لوحة التحكم الخاصة فيك الي فيها كُل شيء تحتاجه،
                    وبالبداية توجّه لتبويب <strong>عائلتي</strong> حتى تتعرف على هيكلة أدِيب
                    وقسمك ولجنتك ومجالسنا الرهيبة، ولا تنسى تنضمّ لقروب قسمك ولجنتك.
                </p>
                ${badgesHtml}
            </div>
        `;

        const api = window.ModalHelper.show({
            size: 'sm',
            extraClass: 'modal-confirm welcome-modal',
            html: bodyHtml,
            showClose: false,
            footerButtons: [
                {
                    text: '<i class="fa-solid fa-arrow-left"></i> يلا نبدأ',
                    class: 'btn btn-primary',
                    callback: () => markSeen(user.id)
                }
            ]
        });

        // تعطيل إغلاق النافذة عند الضغط خارجها أو ESC
        const backdrop = document.getElementById(api.element.id + '-backdrop');
        if (backdrop) backdrop.onclick = null;

        const trapEscape = (e) => {
            if (e.key === 'Escape' && document.getElementById(api.element.id)) {
                e.stopImmediatePropagation();
                e.preventDefault();
            }
        };
        document.addEventListener('keydown', trapEscape, true);

        // مراقبة الإغلاق لإزالة مستمع ESC
        const observer = new MutationObserver(() => {
            if (!document.getElementById(api.element.id)) {
                document.removeEventListener('keydown', trapEscape, true);
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true });

        // إطلاق البالونات
        launchBalloons();

        return api;
    }

    async function checkAndShow(user, role) {
        if (!user?.id) return;
        const first = await isFirstLogin(user.id);
        if (!first) return;
        await show(user, role);
    }

    return { checkAndShow, show, isFirstLogin, markSeen };
})();
