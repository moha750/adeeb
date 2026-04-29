/**
 * توليد شهادة حضور كـ PDF — يرسم مباشرة على Canvas API
 * (لا يستخدم html2canvas — لا اعتماد على CSS الصفحة الأم).
 */

(function () {
    'use strict';

    const CANVAS_WIDTH  = 1414;
    const CANVAS_HEIGHT = 1000;
    const RENDER_SCALE  = 2; // للجودة العالية

    const LAYOUT = {
        holderName:   { x: 50, y: 42.5, size: 56,  color: '#334fa3', weight: 700 },
        activityName: { x: 50, y: 60.6, size: 45,  color: '#334fa3', weight: 600 },
        serial:       { x: 50, y: 92.9, size: 22,  color: '#8c92bf', weight: 400 },
        qr:           { x: 50, y: 83.5, size: 150, color: '#334fa3' },
    };

    const CDN = {
        jsPDF:  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
        qrcode: 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js',
    };

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) return resolve();
            const s = document.createElement('script');
            s.src = src; s.async = true;
            s.onload = resolve;
            s.onerror = () => reject(new Error('فشل تحميل: ' + src));
            document.head.appendChild(s);
        });
    }

    async function loadDeps() {
        await Promise.all([loadScript(CDN.jsPDF), loadScript(CDN.qrcode)]);
    }

    function getAssetsBaseUrl() {
        const path = location.pathname;
        const base = path.replace(/\/(admin|activities)\/[^/]*$/, '/');
        return location.origin + base;
    }

    function getTemplateUrl(gender) {
        const file = (gender === 'female') ? 'template-female.png' : 'template-male.png';
        return `${getAssetsBaseUrl()}assets/certificates/${file}`;
    }

    function loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('فشل تحميل الصورة: ' + url));
            img.src = url;
        });
    }

    async function ensureAdeebFonts() {
        if (!document.getElementById('adeeb-cert-fonts')) {
            const base = getAssetsBaseUrl();
            const u = (file) => encodeURI(`${base}fonts/${file}`);
            const css = `
                @font-face { font-family: 'Lyon Arabic'; src: url('${u('COMM - Lyon Arabic Display Light.otf')}')   format('opentype'); font-weight: 300; font-style: normal; }
                @font-face { font-family: 'Lyon Arabic'; src: url('${u('COMM - Lyon Arabic Display Regular.otf')}') format('opentype'); font-weight: 400; font-style: normal; }
                @font-face { font-family: 'Lyon Arabic'; src: url('${u('COMM - Lyon Arabic Display Medium.otf')}')  format('opentype'); font-weight: 500; font-style: normal; }
                @font-face { font-family: 'Lyon Arabic'; src: url('${u('COMM - Lyon Arabic Display Bold.otf')}')    format('opentype'); font-weight: 700; font-style: normal; }
                @font-face { font-family: 'Lyon Arabic'; src: url('${u('COMM - Lyon Arabic Display Black.otf')}')   format('opentype'); font-weight: 900; font-style: normal; }
                @font-face { font-family: 'ERA'; src: url('${u('ERASLGHT.TTF')}') format('truetype'); font-weight: 300; font-style: normal; }
                @font-face { font-family: 'ERA'; src: url('${u('ERASMD.TTF')}')   format('truetype'); font-weight: 400; font-style: normal; }
                @font-face { font-family: 'ERA'; src: url('${u('ERASDEMI.TTF')}') format('truetype'); font-weight: 600; font-style: normal; }
                @font-face { font-family: 'ERA'; src: url('${u('ERASBD.TTF')}')   format('truetype'); font-weight: 700; font-style: normal; }
            `;
            const style = document.createElement('style');
            style.id = 'adeeb-cert-fonts';
            style.textContent = css;
            document.head.appendChild(style);
        }

        // إجبار التنزيل لكل وزن مستخدم
        try {
            await Promise.all([
                document.fonts.load(`${LAYOUT.holderName.weight}   ${LAYOUT.holderName.size}px   "Lyon Arabic"`),
                document.fonts.load(`${LAYOUT.activityName.weight} ${LAYOUT.activityName.size}px "Lyon Arabic"`),
                document.fonts.load(`${LAYOUT.serial.weight}       ${LAYOUT.serial.size}px       "ERA"`),
            ]);
        } catch (e) { /* امضِ */ }
        await document.fonts.ready;
    }

    /** يولّد QR على canvas منفصل ويُعيده */
    function generateQrCanvas(text, size, colorDark) {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:fixed;left:-99999px;top:0;';
        document.body.appendChild(wrap);
        try {
            new window.QRCode(wrap, {
                text:         text,
                width:        size,
                height:       size,
                colorDark:    colorDark,
                colorLight:   'rgba(255,255,255,0)',
                correctLevel: window.QRCode.CorrectLevel.M,
            });
            return wrap.querySelector('canvas');
        } finally {
            // نُؤجّل الإزالة لأن canvas مرتبط بـ wrap في بعض المتصفحات
            setTimeout(() => wrap.remove(), 0);
        }
    }

    /**
     * يرسم الشهادة على canvas ويُعيده.
     */
    async function renderCertificate({ holderName, activityName, serial, verifyUrl, templateUrl }) {
        const W = CANVAS_WIDTH  * RENDER_SCALE;
        const H = CANVAS_HEIGHT * RENDER_SCALE;

        const canvas = document.createElement('canvas');
        canvas.width  = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');

        // تنعيم النص
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 1) القالب — يملأ كامل المساحة
        const tplImg = await loadImage(templateUrl);
        ctx.drawImage(tplImg, 0, 0, W, H);

        // 2) النصوص — مركزها عند (x%, y%)، نستخدم textBaseline=middle + textAlign=center
        ctx.textBaseline = 'middle';
        ctx.textAlign    = 'center';

        // اسم الحاضر
        const hn = LAYOUT.holderName;
        ctx.fillStyle = hn.color;
        ctx.font = `${hn.weight} ${hn.size * RENDER_SCALE}px "Lyon Arabic", "ERA", sans-serif`;
        ctx.direction = 'rtl';
        ctx.fillText(holderName, (hn.x / 100) * W, (hn.y / 100) * H);

        // اسم النشاط
        const an = LAYOUT.activityName;
        ctx.fillStyle = an.color;
        ctx.font = `${an.weight} ${an.size * RENDER_SCALE}px "Lyon Arabic", "ERA", sans-serif`;
        ctx.direction = 'rtl';
        ctx.fillText(activityName, (an.x / 100) * W, (an.y / 100) * H);

        // رقم الشهادة (LTR)
        const sr = LAYOUT.serial;
        ctx.fillStyle = sr.color;
        ctx.font = `${sr.weight} ${sr.size * RENDER_SCALE}px "ERA", "Lyon Arabic", sans-serif`;
        ctx.direction = 'ltr';
        ctx.fillText(serial, (sr.x / 100) * W, (sr.y / 100) * H);

        // 3) QR — نولّده على canvas منفصل ثم نرسمه
        const qr = LAYOUT.qr;
        const qrPx = qr.size * RENDER_SCALE;
        const qrCanvas = generateQrCanvas(verifyUrl, qrPx, qr.color);
        if (qrCanvas) {
            const qrX = (qr.x / 100) * W - qrPx / 2;
            const qrY = (qr.y / 100) * H - qrPx / 2;
            ctx.drawImage(qrCanvas, qrX, qrY, qrPx, qrPx);
        }

        return canvas;
    }

    async function downloadCertificate(cert) {
        if (!cert || !cert.serial) {
            throw new Error('بيانات الشهادة غير مكتملة');
        }

        await loadDeps();
        await ensureAdeebFonts();

        const templateUrl = getTemplateUrl(cert.gender);
        const verifyUrl   = `${getAssetsBaseUrl()}activities/verify.html?serial=${encodeURIComponent(cert.serial)}`;

        const canvas = await renderCertificate({
            holderName:   cert.holderName,
            activityName: cert.activityName,
            serial:       cert.serial,
            verifyUrl,
            templateUrl,
        });

        // تحويل لـ PDF
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        const pw = pdf.internal.pageSize.getWidth();
        const ph = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, 'JPEG', 0, 0, pw, ph);

        const safeName = (cert.holderName || 'attendee')
            .replace(/[^؀-ۿ\w\s\-]/g, '')
            .trim() || 'attendee';
        pdf.save(`شهادة_${safeName}_${cert.serial}.pdf`);
    }

    window.AdeebCertificate = { downloadCertificate };
})();
