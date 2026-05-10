/**
 * Collapse Panel — انيميشن سلس لفتح/إغلاق <details class="collapse-panel">
 *
 * الميزات:
 *  - فتح/إغلاق سلس عبر تحريك height + opacity في JS (الـ <details> الأصلي فوري).
 *  - مجموعات حصرية: العناصر التي تشترك في نفس data-collapse-group تُعامَل كأكورديون
 *    (فتح واحد يُغلق الآخرين بسلاسة).
 *  - حماية من النقرات المتتابعة أثناء الانيميشن.
 *
 * الاستخدام:
 *   <details class="collapse-panel" data-collapse-group="months">…</details>
 *   <details class="collapse-panel" data-collapse-group="months">…</details>
 *   ← فتح أحدهما يُغلق الآخر
 *
 *   window.CollapsePanel.init(root)  ← لإعادة الربط بعد render ديناميكي
 */
(function () {
    'use strict';

    const DURATION_MS = 350;
    const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

    function getBody(details) {
        return details.querySelector(':scope > .collapse-panel__body');
    }

    function smoothOpen(details) {
        const body = getBody(details);
        if (!body || details._cpAnimating) return;
        details._cpAnimating = true;

        details.open = true;                            // الجسم يدخل الـ DOM
        const targetHeight = body.scrollHeight;

        body.style.overflow   = 'hidden';
        body.style.transition = `height ${DURATION_MS}ms ${EASE}, opacity ${Math.round(DURATION_MS * 0.7)}ms ease`;
        body.style.height     = '0px';
        body.style.opacity    = '0';
        void body.offsetHeight;                         // إجبار reflow
        body.style.height     = targetHeight + 'px';
        body.style.opacity    = '1';

        const onEnd = (ev) => {
            if (ev.target !== body || ev.propertyName !== 'height') return;
            body.removeEventListener('transitionend', onEnd);
            body.style.transition = '';
            body.style.height     = '';
            body.style.overflow   = '';
            body.style.opacity    = '';
            details._cpAnimating  = false;
        };
        body.addEventListener('transitionend', onEnd);
    }

    function smoothClose(details) {
        const body = getBody(details);
        if (!body || details._cpAnimating || !details.open) return;
        details._cpAnimating = true;

        const startHeight = body.scrollHeight;

        body.style.overflow   = 'hidden';
        body.style.transition = `height ${DURATION_MS}ms ${EASE}, opacity ${Math.round(DURATION_MS * 0.7)}ms ease`;
        body.style.height     = startHeight + 'px';
        body.style.opacity    = '1';
        void body.offsetHeight;
        body.style.height     = '0px';
        body.style.opacity    = '0';

        const onEnd = (ev) => {
            if (ev.target !== body || ev.propertyName !== 'height') return;
            body.removeEventListener('transitionend', onEnd);
            details.open = false;
            body.style.transition = '';
            body.style.height     = '';
            body.style.overflow   = '';
            body.style.opacity    = '';
            details._cpAnimating  = false;
        };
        body.addEventListener('transitionend', onEnd);
    }

    function closeOthersInGroup(details) {
        const group = details.getAttribute('data-collapse-group');
        if (!group) return;
        const root = details.closest('[data-collapse-scope]') || document;
        root.querySelectorAll(`details.collapse-panel[data-collapse-group="${group}"][open]`)
            .forEach(other => {
                if (other !== details) smoothClose(other);
            });
    }

    function wire(details) {
        if (!details || details._cpWired) return;
        const summary = details.querySelector(':scope > summary');
        if (!summary) return;
        details._cpWired = true;

        summary.addEventListener('click', (e) => {
            e.preventDefault();
            if (details._cpAnimating) return;

            if (details.open) {
                smoothClose(details);
            } else {
                closeOthersInGroup(details);
                smoothOpen(details);
            }
        });
    }

    function init(root) {
        const scope = root || document;
        scope.querySelectorAll('details.collapse-panel').forEach(wire);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => init());
    } else {
        init();
    }

    window.CollapsePanel = { init, wire, smoothOpen, smoothClose };
})();
