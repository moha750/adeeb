/**
 * صفحة تحميل الشهادة العامة
 * تستقبل ?serial=ADEEB-YYYY-NNNN، تستدعي get_certificate_data،
 * ثم تستخدم AdeebCertificate.downloadCertificate لتحميل PDF تلقائياً.
 * متاحة بدون تسجيل دخول — لتسهيل الوصول من رابط واتساب.
 */

(function () {
    'use strict';

    const sb = window.sbClient;

    const els = {
        loading:        document.getElementById('dLoading'),
        valid:          document.getElementById('dValid'),
        invalid:        document.getElementById('dInvalid'),
        error:          document.getElementById('dError'),
        errorMsg:       document.getElementById('dErrorMsg'),
        name:           document.getElementById('dName'),
        activity:       document.getElementById('dActivity'),
        date:           document.getElementById('dDate'),
        serial:         document.getElementById('dSerial'),
        invalidSerial:  document.getElementById('dInvalidSerial'),
        downloadBtn:    document.getElementById('dDownloadBtn'),
        btnText:        document.getElementById('dBtnText'),
        verifyLink:     document.getElementById('dVerifyLink'),
    };

    let cachedCert = null;

    function show(name) {
        ['loading','valid','invalid','error'].forEach(s => {
            if (els[s]) els[s].hidden = (s !== name);
        });
    }

    function activityTypeLabel(type) {
        switch (type) {
            case 'workshop': return 'ورشة';
            case 'program':  return 'برنامج';
            case 'dialogue': return 'جلسة حوارية';
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

    function buildVerifyUrl(serial) {
        const base = location.pathname.replace(/\/[^/]*$/, '/');
        return `${location.origin}${base}verify.html?serial=${encodeURIComponent(serial)}`;
    }

    async function triggerDownload() {
        if (!cachedCert) return;
        if (!window.AdeebCertificate?.downloadCertificate) {
            els.errorMsg.textContent = 'تعذّر تحميل مكتبة الشهادات.';
            show('error');
            return;
        }
        const original = els.btnText.textContent;
        try {
            els.downloadBtn.disabled = true;
            els.btnText.textContent = 'جاري التوليد…';
            await window.AdeebCertificate.downloadCertificate(cachedCert);
            els.btnText.textContent = 'تم — تحميل مرة أخرى';
        } catch (err) {
            console.error('[download-certificate] download error:', err);
            els.btnText.textContent = 'إعادة المحاولة';
        } finally {
            els.downloadBtn.disabled = false;
            setTimeout(() => { els.btnText.textContent = original; }, 4000);
        }
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
            cachedCert = {
                serial:        serial,
                holderName:    c.holder_name,
                gender:        c.holder_gender,
                activityName:  c.activity_name,
                activityType:  c.activity_type,
                activityDate:  c.activity_date,
            };

            els.name.textContent     = c.holder_name || '—';
            els.activity.textContent = `${c.activity_name} (${activityTypeLabel(c.activity_type)})`;
            els.date.textContent     = formatDate(c.activity_date);
            els.serial.textContent   = serial;
            els.verifyLink.href      = buildVerifyUrl(serial);

            els.downloadBtn.addEventListener('click', triggerDownload);

            show('valid');

            // بدء التحميل تلقائياً بعد عرض البطاقة
            setTimeout(triggerDownload, 600);
        } catch (err) {
            console.error('[download-certificate] error:', err);
            els.errorMsg.textContent = err.message || 'حدث خطأ غير متوقع.';
            show('error');
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();
