/**
 * توليد شهادة حضور كـ PDF (lazy load للمكتبات)
 * يُستدعى من my-bookings.js عند الضغط على زر "تنزيل الشهادة"
 *
 * المكتبات تُحمَّل عند الطلب فقط (شيمس CDN) لتقليل وزن الصفحة الأولي.
 */

(function () {
    'use strict';

    const CDN = {
        html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
        jsPDF:       'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
        qrcode:      'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js',
    };

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) return resolve();
            const s = document.createElement('script');
            s.src = src;
            s.async = true;
            s.onload = resolve;
            s.onerror = () => reject(new Error('فشل تحميل: ' + src));
            document.head.appendChild(s);
        });
    }

    async function loadDeps() {
        await Promise.all([
            loadScript(CDN.html2canvas),
            loadScript(CDN.jsPDF),
            loadScript(CDN.qrcode),
        ]);
    }

    function escapeHtml(t) {
        const d = document.createElement('div');
        d.textContent = t == null ? '' : String(t);
        return d.innerHTML;
    }

    function formatLongDate(d) {
        if (!d) return '';
        try {
            return new Date(d).toLocaleDateString('ar-SA', {
                weekday:'long', year:'numeric', month:'long', day:'numeric'
            });
        } catch (_) { return d; }
    }

    function activityTypeLabel(type) {
        switch (type) {
            case 'workshop': return 'الورشة';
            case 'program':  return 'البرنامج';
            default:         return 'النشاط';
        }
    }

    function buildCertificateHtml({ holderName, activityName, activityType, activityDate, serial, verifyUrl }) {
        // قالب A4 landscape بأبعاد 1123x794 px (تقريبًا 96 dpi)
        // تُلتقط لاحقًا بـ html2canvas ثم تحقن في jsPDF
        return `
        <div id="cert-canvas" style="
            width:1123px;height:794px;background:#fff;
            position:relative;font-family:'Tajawal',sans-serif;
            color:#0f172a;direction:rtl;box-sizing:border-box;
            padding:60px 80px;overflow:hidden;
        ">
            <div style="
                position:absolute;inset:18px;border:3px double #274060;
                border-radius:6px;pointer-events:none;
            "></div>
            <div style="
                position:absolute;inset:30px;border:1px solid #274060;
                border-radius:4px;pointer-events:none;opacity:0.4;
            "></div>

            <header style="text-align:center;margin-bottom:30px;">
                <div style="
                    display:inline-block;padding:12px 32px;
                    background:linear-gradient(135deg,#274060 0%,#3b5780 100%);
                    color:#fff;border-radius:8px;font-weight:800;font-size:22px;
                    letter-spacing:0.5px;
                ">
                    نادي أدِيب — جامعة الملك فيصل
                </div>
            </header>

            <h1 style="
                text-align:center;font-size:46px;font-weight:800;
                margin:20px 0 8px;color:#274060;letter-spacing:1px;
            ">
                شهادة حضور
            </h1>

            <p style="
                text-align:center;color:#64748b;font-size:18px;
                margin:0 0 40px;font-weight:500;
            ">
                Certificate of Attendance
            </p>

            <p style="
                text-align:center;font-size:20px;color:#475569;margin:0 0 12px;
            ">
                نشهد بأن
            </p>

            <h2 style="
                text-align:center;font-size:54px;font-weight:800;
                color:#0f172a;margin:0 0 20px;
                border-bottom:2px solid #cbd5e1;padding-bottom:14px;
                display:inline-block;width:80%;margin-right:10%;margin-left:10%;
            ">
                ${escapeHtml(holderName)}
            </h2>

            <p style="
                text-align:center;font-size:20px;color:#475569;
                margin:30px 60px 12px;line-height:1.8;
            ">
                قد حضر ${escapeHtml(activityTypeLabel(activityType))}
            </p>

            <h3 style="
                text-align:center;font-size:32px;font-weight:700;
                color:#274060;margin:0 0 16px;
            ">
                «${escapeHtml(activityName)}»
            </h3>

            <p style="
                text-align:center;font-size:18px;color:#64748b;margin:0;
            ">
                المُقام بتاريخ ${escapeHtml(formatLongDate(activityDate))}
            </p>

            <footer style="
                position:absolute;bottom:60px;left:80px;right:80px;
                display:flex;justify-content:space-between;align-items:flex-end;
            ">
                <div style="text-align:center;">
                    <div id="cert-qr" style="background:#fff;padding:6px;border:1px solid #e2e8f0;display:inline-block;"></div>
                    <p style="margin:6px 0 0;font-size:11px;color:#94a3b8;">امسح للتحقق</p>
                </div>

                <div style="text-align:center;">
                    <p style="margin:0 0 6px;font-size:13px;color:#64748b;">رقم الشهادة</p>
                    <p style="margin:0;font-family:'Courier New',monospace;font-size:18px;font-weight:700;color:#274060;letter-spacing:2px;direction:ltr;">
                        ${escapeHtml(serial)}
                    </p>
                    <p style="margin:18px 0 0;font-size:11px;color:#94a3b8;direction:ltr;">
                        ${escapeHtml(verifyUrl)}
                    </p>
                </div>

                <div style="text-align:center;">
                    <div style="
                        width:140px;height:60px;
                        border-bottom:2px solid #475569;margin-bottom:6px;
                        display:flex;align-items:flex-end;justify-content:center;
                        padding-bottom:6px;font-family:'Tajawal',sans-serif;
                        font-style:italic;color:#274060;font-weight:700;
                    ">
                        نادي أدِيب
                    </div>
                    <p style="margin:0;font-size:12px;color:#64748b;">إدارة النادي</p>
                </div>
            </footer>
        </div>`;
    }

    /**
     * يولّد ويُنزّل الشهادة كـ PDF
     * @param {Object} cert  — بيانات الشهادة من القاعدة
     *   holderName, activityName, activityType, activityDate, serial
     */
    async function downloadCertificate(cert) {
        if (!cert || !cert.serial) {
            throw new Error('بيانات الشهادة غير مكتملة');
        }

        await loadDeps();

        const verifyUrl = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}verify.html?serial=${encodeURIComponent(cert.serial)}`;

        // إعداد عنصر مخفي خارج الشاشة
        const wrap = document.createElement('div');
        wrap.style.position = 'fixed';
        wrap.style.left = '-9999px';
        wrap.style.top = '0';
        wrap.style.zIndex = '-1';
        wrap.innerHTML = buildCertificateHtml({ ...cert, verifyUrl });
        document.body.appendChild(wrap);

        try {
            const qrEl = wrap.querySelector('#cert-qr');
            if (qrEl && window.QRCode) {
                // qrcodejs ينشئ <table> داخل qrEl
                new window.QRCode(qrEl, {
                    text: verifyUrl,
                    width: 90,
                    height: 90,
                    correctLevel: window.QRCode.CorrectLevel.M,
                });
            }

            const target = wrap.querySelector('#cert-canvas');

            // انتظار قصير لرسم الخطوط/QR
            await new Promise(r => setTimeout(r, 150));

            const canvas = await window.html2canvas(target, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
            const pageWidth  = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
            const safeName = (cert.holderName || 'attendee').replace(/[^؀-ۿ\w\s\-]/g, '').trim() || 'attendee';
            pdf.save(`شهادة_${safeName}_${cert.serial}.pdf`);
        } finally {
            wrap.remove();
        }
    }

    window.AdeebCertificate = { downloadCertificate };
})();
