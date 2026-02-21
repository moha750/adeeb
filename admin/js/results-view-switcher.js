/**
 * مبدل عرض نتائج الاستبيانات
 * يتحكم في التبديل بين الأقسام المختلفة عبر القائمة المنسدلة
 */

(function() {
    'use strict';

    function initResultsViewSwitcher() {
        const viewSelect = document.getElementById('resultsViewSelect');
        if (!viewSelect) return;

        viewSelect.addEventListener('change', function() {
            const selectedView = this.value;
            switchView(selectedView);
        });
    }

    function switchView(viewName) {
        // إخفاء جميع الأقسام
        const allPanes = document.querySelectorAll('.tab-pane');
        allPanes.forEach(pane => {
            pane.classList.remove('active');
        });

        // إظهار القسم المحدد
        const targetPane = document.getElementById(`${viewName}-tab`);
        if (targetPane) {
            targetPane.classList.add('active');
        }
    }

    // تصدير الدالة للاستخدام العام
    window.resultsViewSwitcher = {
        init: initResultsViewSwitcher,
        switchView: switchView
    };

    // التهيئة التلقائية عند تحميل الصفحة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initResultsViewSwitcher);
    } else {
        initResultsViewSwitcher();
    }
})();
