/**
 * صفحة التحقق العامة من شهادة حضور
 * تستقبل ?serial=ADEEB-YYYY-NNNN وتستدعي RPC get_certificate_data
 * (متاحة للزوار غير المسجّلين). لا تكشف بيانات حساسة.
 */

(function () {
    'use strict';

    const sb = window.sbClient;

    const els = {
        loading:        document.getElementById('vLoading'),
        valid:          document.getElementById('vValid'),
        invalid:        document.getElementById('vInvalid'),
        error:          document.getElementById('vError'),
        errorMsg:       document.getElementById('vErrorMsg'),
        name:           document.getElementById('vName'),
        activity:       document.getElementById('vActivity'),
        date:           document.getElementById('vDate'),
        issued:         document.getElementById('vIssued'),
        serial:         document.getElementById('vSerial'),
        invalidSerial:  document.getElementById('vInvalidSerial'),
    };

    function show(name) {
        ['loading','valid','invalid','error'].forEach(s => {
            if (els[s]) els[s].hidden = (s !== name);
        });
    }

    function escapeHtml(t) {
        const d = document.createElement('div');
        d.textContent = t == null ? '' : String(t);
        return d.innerHTML;
    }

    function activityTypeLabel(type) {
        switch (type) {
            case 'workshop': return 'ورشة';
            case 'program':  return 'برنامج';
            default:         return 'نشاط';
        }
    }

    function formatDate(d) {
        if (!d) return '';
        try {
            return new Date(d).toLocaleDateString('ar-SA', {
                weekday:'long', year:'numeric', month:'long', day:'numeric'
            });
        } catch (_) { return d; }
    }

    function formatDateTime(d) {
        if (!d) return '';
        try {
            return new Date(d).toLocaleDateString('ar-SA', {
                year:'numeric', month:'long', day:'numeric'
            });
        } catch (_) { return d; }
    }

    async function init() {
        const params = new URLSearchParams(location.search);
        const serial = (params.get('serial') || '').trim();

        if (!serial) {
            els.invalidSerial.textContent = '— لا يوجد رقم —';
            show('invalid');
            return;
        }

        if (!sb) {
            els.errorMsg.textContent = 'تعذّر الاتصال بقاعدة البيانات.';
            show('error');
            return;
        }

        try {
            const { data, error } = await sb.rpc('get_certificate_data', { p_serial: serial });
            if (error) throw error;

            if (!data || data.length === 0) {
                els.invalidSerial.textContent = serial;
                show('invalid');
                return;
            }

            const c = data[0];
            els.name.textContent     = c.holder_name || '—';
            els.activity.textContent = `${c.activity_name} (${activityTypeLabel(c.activity_type)})`;
            els.date.textContent     = formatDate(c.activity_date);
            els.issued.textContent   = formatDateTime(c.issued_at);
            els.serial.textContent   = serial;
            show('valid');
        } catch (err) {
            console.error('[verify] error:', err);
            els.errorMsg.textContent = err.message || 'حدث خطأ غير متوقع.';
            show('error');
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();
