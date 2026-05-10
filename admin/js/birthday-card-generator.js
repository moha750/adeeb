/**
 * Birthday Card Generator
 * يرسم بطاقة ميلاد على Canvas: قالب رمادي + tint بلون العضو المفضل + اسمه
 * يستخدم ModalHelper الموجود لعرض المعاينة + التحميل/الطباعة.
 */
(function () {
    'use strict';

    const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;

    const CONFIG = {
        templatePath: '../assets/birthdays/template.png',
        canvasW: 1080,
        canvasH: 1920,
        textPosition: { x: 540, y: 1120 },
        fontFamily: 'Lyon Arabic',
        fontSize: 105,
        fontStyle: 'bold',
        textColor: '#ffffff',
        maxTextWidthRatio: 0.8,
        minFontSize: 24,
        tintBlendMode: 'color',
        fallbackColor: '#3d8fd6',
        thumbnailMaxWidth: 280,

        // ── قيم افتراضية للـ sliders داخل النافذة (passthrough = بلا تطبيع)
        // المستخدم يضبطها يدويًا إن أراد تطبيعًا حيًّا.
        tintLightnessMax: 1.00,
        tintSaturationMin: 0.00,
        tintSaturationMax: 1.00,
    };

    let _templatePromise = null;
    let _templateLoadFailed = false;

    function loadTemplate() {
        if (_templatePromise) return _templatePromise;
        _templatePromise = new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => {
                _templateLoadFailed = true;
                reject(new Error('Template image failed to load: ' + CONFIG.templatePath));
            };
            img.src = CONFIG.templatePath;
        });
        return _templatePromise;
    }

    function pickTint(favorite_color) {
        return HEX_RE.test(favorite_color || '') ? favorite_color : CONFIG.fallbackColor;
    }

    function hexToRgb(hex) {
        let h = String(hex || '').replace('#', '');
        if (h.length === 3) h = h.split('').map(c => c + c).join('');
        if (h.length === 4) h = h.slice(0, 3).split('').map(c => c + c).join('');
        if (h.length === 8) h = h.slice(0, 6);
        if (h.length !== 6) return null;
        return {
            r: parseInt(h.slice(0, 2), 16),
            g: parseInt(h.slice(2, 4), 16),
            b: parseInt(h.slice(4, 6), 16),
        };
    }

    function rgbToHsl({ r, g, b }) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const l = (max + min) / 2;
        let h = 0, s = 0;
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (max === r)      h = (g - b) / d + (g < b ? 6 : 0);
            else if (max === g) h = (b - r) / d + 2;
            else                h = (r - g) / d + 4;
            h /= 6;
        }
        return { h, s, l };
    }

    function hslToRgb({ h, s, l }) {
        if (s === 0) {
            const v = Math.round(l * 255);
            return { r: v, g: v, b: v };
        }
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        return {
            r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
            g: Math.round(hue2rgb(p, q, h) * 255),
            b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
        };
    }

    function rgbToHex({ r, g, b }) {
        return '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('');
    }

    // نسخة داكنة من اللون مع الحفاظ على الـ hue/saturation — مناسبة لنص فوق نفس الصبغة
    function darkenForText(hex) {
        const rgb = hexToRgb(hex);
        if (!rgb) return '#1e293b';
        const hsl = rgbToHsl(rgb);
        hsl.l = Math.min(hsl.l, 0.36);
        return rgbToHex(hslToRgb(hsl));
    }

    // طبقة العرض الآمن: تطبّع لون tint قبل ما يلامس Canvas
    // - تكسر السطوع الزائد (الأصفر الفاقع، الأبيض)
    // - تضع أرضية إشباع للألوان الباهتة (إن كان فيها hue) وسقفًا للنيون
    // - تترك الرمادي/الأبيض رماديًا بدون hue عشوائي
    function normalizeForTint(hex, opts) {
        const rgb = hexToRgb(hex);
        if (!rgb) return CONFIG.fallbackColor;
        const lMax = opts && typeof opts.lightnessMax === 'number' ? opts.lightnessMax : CONFIG.tintLightnessMax;
        const sMin = opts && typeof opts.saturationMin === 'number' ? opts.saturationMin : CONFIG.tintSaturationMin;
        const sMax = opts && typeof opts.saturationMax === 'number' ? opts.saturationMax : CONFIG.tintSaturationMax;
        const hsl = rgbToHsl(rgb);
        hsl.l = Math.min(hsl.l, lMax);
        if (hsl.s > 0.05) {
            hsl.s = Math.min(Math.max(hsl.s, sMin), sMax);
        }
        return rgbToHex(hslToRgb(hsl));
    }

    function drawAutoFitText(ctx, text, cfg, colorOverride) {
        const maxWidth = cfg.canvasW * cfg.maxTextWidthRatio;
        let fontSize = cfg.fontSize;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        do {
            ctx.font = `${cfg.fontStyle} ${fontSize}px "${cfg.fontFamily}", Arial`;
            if (ctx.measureText(text).width <= maxWidth || fontSize <= cfg.minFontSize) break;
            fontSize -= 2;
        } while (true);

        let displayText = text;
        if (ctx.measureText(displayText).width > maxWidth) {
            while (displayText.length > 1 && ctx.measureText(displayText + '…').width > maxWidth) {
                displayText = displayText.slice(0, -1);
            }
            displayText += '…';
        }

        ctx.fillStyle = colorOverride || cfg.textColor;
        ctx.fillText(displayText, cfg.textPosition.x, cfg.textPosition.y);
    }

    function drawErrorPlaceholder(ctx, cfg) {
        ctx.fillStyle = '#e9ecef';
        ctx.fillRect(0, 0, cfg.canvasW, cfg.canvasH);
        ctx.fillStyle = '#6c757d';
        ctx.font = `bold 48px "${cfg.fontFamily}", Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('تعذّر تحميل قالب البطاقة', cfg.canvasW / 2, cfg.canvasH / 2 - 30);
        ctx.font = `28px "${cfg.fontFamily}", Arial`;
        ctx.fillText('تأكّد من وضع الملف في:', cfg.canvasW / 2, cfg.canvasH / 2 + 30);
        ctx.fillText(CONFIG.templatePath, cfg.canvasW / 2, cfg.canvasH / 2 + 70);
    }

    async function renderToCanvas(canvas, member, normOpts) {
        const cfg = CONFIG;
        const ctx = canvas.getContext('2d');
        canvas.width = cfg.canvasW;
        canvas.height = cfg.canvasH;
        ctx.clearRect(0, 0, cfg.canvasW, cfg.canvasH);

        const rawTint = pickTint(member && member.favorite_color);
        const tint = normalizeForTint(rawTint, normOpts);
        const name = (member && member.full_name) ? String(member.full_name).trim() : '';

        let img;
        try {
            img = await loadTemplate();
        } catch (err) {
            console.error('[BirthdayCardGenerator]', err);
            drawErrorPlaceholder(ctx, cfg);
            return;
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(img, 0, 0, cfg.canvasW, cfg.canvasH);

        ctx.globalCompositeOperation = cfg.tintBlendMode;
        ctx.fillStyle = tint;
        ctx.fillRect(0, 0, cfg.canvasW, cfg.canvasH);

        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(img, 0, 0, cfg.canvasW, cfg.canvasH);

        ctx.globalCompositeOperation = 'source-over';

        if (document.fonts && document.fonts.load) {
            try {
                await document.fonts.load(`${cfg.fontStyle} ${cfg.fontSize}px "${cfg.fontFamily}"`);
            } catch (_) { /* تجاهل: نكمل بالخط الاحتياطي */ }
        }

        if (name) {
            const textColor = darkenForText(tint);
            drawAutoFitText(ctx, name, cfg, textColor);
        }
    }

    async function renderThumbnail(member) {
        const offCanvas = document.createElement('canvas');
        await renderToCanvas(offCanvas, member);

        const img = document.createElement('img');
        img.alt = 'بطاقة ميلاد ' + (member.full_name || '');
        img.src = offCanvas.toDataURL('image/png');
        img.dataset.bcgAction = 'open';
        img.dataset.name = member.full_name || '';
        img.dataset.color = member.favorite_color || '';
        img.dataset.avatar = member.avatar_url || '';
        img.style.cursor = 'pointer';
        img.style.maxWidth = '100%';
        return img;
    }

    function downloadCanvas(canvas, fullName) {
        const safeName = (fullName || 'عضو').trim().replace(/[\\/:*?"<>|]+/g, '_');
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `بطاقة_ميلاد_${safeName}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function openModal(member) {
        if (!window.ModalHelper || typeof window.ModalHelper.show !== 'function') {
            console.error('[BirthdayCardGenerator] ModalHelper غير متوفر');
            return;
        }

        const m = {
            full_name: member.full_name || member.name || '',
            favorite_color: member.favorite_color || member.color || '',
            avatar_url: member.avatar_url || member.avatar || '',
        };

        // variant ينتقل من الزر المُستدعِي → يلوّن النافذة وأزرارها وقسم الإعدادات
        const ALLOWED_VARIANTS = ['primary', 'success', 'warning', 'danger', 'info', 'purple', 'teal'];
        const variant = ALLOWED_VARIANTS.includes(member.variant) ? member.variant : 'primary';
        // .collapse-panel لا يملك variant افتراضي --primary لأنه اللون الأساسي → نتركه بدون modifier
        const collapseVariantClass = variant === 'primary' ? '' : ` collapse-panel--${variant}`;

        // إعدادات حيّة قابلة للضبط — تبدأ من الافتراضي ولا تُحفظ
        const settings = {
            lightnessMax:  CONFIG.tintLightnessMax,
            saturationMin: CONFIG.tintSaturationMin,
            saturationMax: CONFIG.tintSaturationMax,
        };
        const DEFAULTS = { ...settings };

        const html = `
            <small>
                <i class="fa-solid fa-circle-info"></i>
                إذا كان اللون مُزعجًا أو يحتاج لتعديل، استخدم «الإعدادات المتقدمة» أدناه لضبط السطوع والإشباع للمعاينة الحالية.
            </small>
            <div class="mt-3" style="display:flex; justify-content:center;">
                <canvas id="bcgCanvas" style="max-width:50%; height:auto; max-height:65vh; border-radius:8px; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.08);"></canvas>
            </div>
            <details class="collapse-panel${collapseVariantClass} mt-3">
                <summary class="collapse-panel__head">
                    <div class="collapse-panel__head-content">
                        <i class="fa-solid fa-sliders"></i>
                        <span>إعدادات متقدمة (لتعديل اللون)</span>
                    </div>
                    <i class="fa-solid fa-chevron-down collapse-panel__chevron"></i>
                </summary>
                <div class="collapse-panel__body d-flex flex-column gap-16">
                    <div class="form-range-wrap">
                        <div class="d-flex justify-content-between align-items-center">
                            <label style="font-size:0.85rem; font-weight:600;">سقف السطوع</label>
                            <span class="form-range-value" data-bcg-l-max-val>${(settings.lightnessMax * 100).toFixed(0)}%</span>
                        </div>
                        <input type="range" class="form-range" id="bcgLMax"
                               min="0.20" max="1.00" step="0.05" value="${settings.lightnessMax}" />
                        <div class="form-range-labels"><span>أعمق</span><span>أفتح</span></div>
                    </div>
                    <div class="form-range-wrap">
                        <div class="d-flex justify-content-between align-items-center">
                            <label style="font-size:0.85rem; font-weight:600;">أرضية الإشباع</label>
                            <span class="form-range-value" data-bcg-s-min-val>${(settings.saturationMin * 100).toFixed(0)}%</span>
                        </div>
                        <input type="range" class="form-range" id="bcgSMin"
                               min="0.00" max="1.00" step="0.05" value="${settings.saturationMin}" />
                        <div class="form-range-labels"><span>أهدأ</span><span>أكثر لونًا</span></div>
                    </div>
                    <div class="form-range-wrap">
                        <div class="d-flex justify-content-between align-items-center">
                            <label style="font-size:0.85rem; font-weight:600;">سقف الإشباع</label>
                            <span class="form-range-value" data-bcg-s-max-val>${(settings.saturationMax * 100).toFixed(0)}%</span>
                        </div>
                        <input type="range" class="form-range" id="bcgSMax"
                               min="0.30" max="1.00" step="0.05" value="${settings.saturationMax}" />
                        <div class="form-range-labels"><span>هادئ</span><span>نيون</span></div>
                    </div>
                    <button type="button" class="btn btn-outline btn-sm" data-bcg-reset
                            style="align-self:flex-start;">
                        <i class="fa-solid fa-rotate-left"></i> إعادة الافتراضي
                    </button>
                </div>
            </details>
        `;

        const footerHtml = `
            <button type="button" class="btn btn-outline" data-bcg-cancel>
                <i class="fa-solid fa-xmark"></i> إلغاء
            </button>
            <button type="button" class="btn btn-${variant}" data-bcg-download>
                <i class="fa-solid fa-download"></i> تحميل PNG
            </button>
        `;

        const modalRef = window.ModalHelper.show({
            title: `بطاقة ميلاد ${escapeHtml(m.full_name)}`,
            html,
            size: 'lg',
            type: variant,
            iconClass: 'fa-cake-candles',
            footerHtml,
            onOpen: () => {
                const canvas = document.getElementById('bcgCanvas');
                if (!canvas) return;

                if (window.CollapsePanel) window.CollapsePanel.init();

                let renderToken = 0;
                const reRender = () => {
                    const token = ++renderToken;
                    renderToCanvas(canvas, m, settings).catch((err) => {
                        if (token === renderToken) console.error('[BirthdayCardGenerator] reRender error', err);
                    });
                };
                reRender();

                const dlBtn = document.querySelector('[data-bcg-download]');
                if (dlBtn) dlBtn.onclick = () => downloadCanvas(canvas, m.full_name);

                const cancelBtn = document.querySelector('[data-bcg-cancel]');
                if (cancelBtn) cancelBtn.onclick = () => modalRef && modalRef.close && modalRef.close();

                // sliders
                const wireSlider = (id, key, displaySel) => {
                    const input = document.getElementById(id);
                    const display = document.querySelector(displaySel);
                    if (!input) return;
                    input.addEventListener('input', () => {
                        const v = parseFloat(input.value);
                        settings[key] = v;
                        if (display) display.textContent = `${(v * 100).toFixed(0)}%`;
                        reRender();
                    });
                };
                wireSlider('bcgLMax', 'lightnessMax',  '[data-bcg-l-max-val]');
                wireSlider('bcgSMin', 'saturationMin', '[data-bcg-s-min-val]');
                wireSlider('bcgSMax', 'saturationMax', '[data-bcg-s-max-val]');

                const resetBtn = document.querySelector('[data-bcg-reset]');
                if (resetBtn) resetBtn.onclick = () => {
                    Object.assign(settings, DEFAULTS);
                    const setSlider = (id, key, displaySel) => {
                        const input = document.getElementById(id);
                        const display = document.querySelector(displaySel);
                        if (input) input.value = String(settings[key]);
                        if (display) display.textContent = `${(settings[key] * 100).toFixed(0)}%`;
                    };
                    setSlider('bcgLMax', 'lightnessMax',  '[data-bcg-l-max-val]');
                    setSlider('bcgSMin', 'saturationMin', '[data-bcg-s-min-val]');
                    setSlider('bcgSMax', 'saturationMax', '[data-bcg-s-max-val]');
                    reRender();
                };
            },
        });
    }

    window.BirthdayCardGenerator = {
        CONFIG,
        renderToCanvas,
        renderThumbnail,
        openModal,
        get templateLoadFailed() { return _templateLoadFailed; },
    };
})();
