/* ===========================================================
   نادي أديب — منشئ بطاقات عيد الأضحى المُبارك
   13 بطاقة من 5 مصممين + شريط إهداء اختياري
=========================================================== */

// ===========================================================
// Supabase
// ===========================================================
const SUPABASE_URL = 'https://nnlhkfeybyhvlinbqqfa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubGhrZmV5YnlodmxpbmJxcWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODIyODcsImV4cCI6MjA4NDE1ODI4N30.VhQgdxHt6YOQu8IJ-eni6_9qIeua1ZM3hx8hVe3YgZg';

let supabaseClient;
if (typeof window.supabase !== 'undefined') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

async function incrementStat(statType) {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.rpc('increment_stat', { p_stat_type: statType });
        if (error) throw error;
        return data;
    } catch (err) {
        console.error('خطأ في تحديث العداد:', err);
    }
}

let visitorRecorded = false;
async function recordVisitor() {
    if (visitorRecorded) return;
    visitorRecorded = true;
    await incrementStat('visitors');
}

// ===========================================================
// التصاميم
// ===========================================================
// لكل بطاقة: موضع الاسم (نسبي 0-1)، حجم الخط (نسبي من الارتفاع)، اللون، الظل
const TEMPLATES = {
    t1:  { designer: 'محمد إسماعيل المطر',  file: 'templates/محمد إسماعيل المطر 1.png',
           name: { x: 0.5, y: 0.910, sizeRatio: 0.035, color: '#ffecc8', } },
    t2:  { designer: 'محمد إسماعيل المطر',  file: 'templates/محمد إسماعيل المطر 2.png',
           name: { x: 0.5, y: 0.890, sizeRatio: 0.035, color: '#FFFFFF', } },
    t3:  { designer: 'محمد إسماعيل المطر',  file: 'templates/محمد إسماعيل المطر 3.png',
           name: { x: 0.5, y: 0.910, sizeRatio: 0.030, color: '#1A1310', } },
    t4:  { designer: 'رغد حسين الخليفه',     file: 'templates/رغد حسين الخليفه.jpg',
           name: { x: 0.5, y: 0.750, sizeRatio: 0.033, color: '#ffffff', } },
    t5:  { designer: 'زينب عبدالله العبيدان', file: 'templates/زينب عبدالله العبيدان.png',
           name: { x: 0.5, y: 0.490, sizeRatio: 0.035, color: '#1A1310', } },
    t6:  { designer: 'قاسم عبدلله العيثان',  file: 'templates/قاسم عبدلله العيثان 1.png',
           name: { x: 0.5, y: 0.450, sizeRatio: 0.034, color: '#2A1810', } },
    t7:  { designer: 'قاسم عبدلله العيثان',  file: 'templates/قاسم عبدلله العيثان 2.png',
           name: { x: 0.5, y: 0.700, sizeRatio: 0.040, color: '#E0BC6E', } },
    t8:  { designer: 'قاسم عبدلله العيثان',  file: 'templates/قاسم عبدلله العيثان 3.png',
           name: { x: 0.5, y: 0.360, sizeRatio: 0.032, color: '#ffffff', } },
    t9:  { designer: 'قاسم عبدلله العيثان',  file: 'templates/قاسم عبدلله العيثان 4.png',
           name: { x: 0.5, y: 0.630, sizeRatio: 0.044, color: '#ffffff', } },
    t10: { designer: 'مي عبدالعزيز الجهني', file: 'templates/مي عبدالعزيز الجهني 1.jpg',
           name: { x: 0.5, y: 0.820, sizeRatio: 0.030, color: '#ffffff', } },
    t11: { designer: 'مي عبدالعزيز الجهني', file: 'templates/مي عبدالعزيز الجهني 2.jpg',
           name: { x: 0.5, y: 0.855, sizeRatio: 0.034, color: '#ffffff', } },
    t12: { designer: 'مي عبدالعزيز الجهني', file: 'templates/مي عبدالعزيز الجهني 3.jpg',
           name: { x: 0.5, y: 0.875, sizeRatio: 0.034, color: '#ffffff', } },
    t13: { designer: 'مي عبدالعزيز الجهني', file: 'templates/مي عبدالعزيز الجهني 4.jpg',
           name: { x: 0.5, y: 0.850, sizeRatio: 0.034, color: '#ffffff', } }
};
const TEMPLATE_ORDER = Object.keys(TEMPLATES);

// ===========================================================
// التهيئة
// ===========================================================
document.addEventListener('DOMContentLoaded', () => {

    const canvas        = document.getElementById('cardCanvas');
    const ctx           = canvas.getContext('2d');
    const cardStage     = document.getElementById('cardStage');
    const designerName  = document.getElementById('designerName');
    const recipientInput= document.getElementById('recipientName');
    const clearNameBtn  = document.getElementById('clearName');
    const downloadBtn   = document.getElementById('downloadBtn');
    const shareBtn      = document.getElementById('shareBtn');
    const prevBtn       = document.getElementById('prevBtn');
    const nextBtn       = document.getElementById('nextBtn');
    const currentIdxEl  = document.getElementById('currentIdx');
    const totalIdxEl    = document.getElementById('totalIdx');
    const filterBar     = document.getElementById('filterBar');
    const galleryStrip  = document.getElementById('galleryStrip');
    const galleryCount  = document.getElementById('galleryCount');
    const stripLeftBtn  = document.getElementById('stripLeft');
    const stripRightBtn = document.getElementById('stripRight');

    const popupContainer = document.createElement('div');
    popupContainer.className = 'popup-container';
    document.body.appendChild(popupContainer);

    let currentTemplate = 't1';
    let currentImage    = null;
    let currentFilter   = 'all';
    const imageCache    = {};

    const arNumerals = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
    const toArabicDigits = n => String(n).replace(/[0-9]/g, d => arNumerals[+d]);

    // ===========================================================
    // تحميل الصور
    // ===========================================================
    function loadImage(src) {
        if (imageCache[src] && imageCache[src].complete && imageCache[src].naturalWidth > 0) {
            return Promise.resolve(imageCache[src]);
        }
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload  = () => { imageCache[src] = img; resolve(img); };
            img.onerror = () => reject(new Error('تعذّر تحميل الصورة'));
            img.src = src;
        });
    }

    // ===========================================================
    // رسم البطاقة + الاسم عليها مباشرة
    // ===========================================================
    function renderCard(img, name) {
        const imgW = img.naturalWidth;
        const imgH = img.naturalHeight;

        canvas.width  = imgW;
        canvas.height = imgH;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, imgW, imgH);

        const trimmedName = (name || '').trim();
        if (!trimmedName) return;

        drawRecipientName(trimmedName);
    }

    function drawRecipientName(name) {
        const cfg = TEMPLATES[currentTemplate];
        const meta = cfg.name;
        if (!meta) return;

        const w = canvas.width;
        const h = canvas.height;
        const x = w * meta.x;
        const y = h * meta.y;
        const maxWidth = w * 0.78;

        let fontSize = Math.round(h * meta.sizeRatio);
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        do {
            ctx.font = `bold ${fontSize}px fbb, fb, Arial`;
            if (ctx.measureText(name).width <= maxWidth || fontSize <= 18) break;
            fontSize -= 2;
        } while (true);

        // طبقة stroke خفيفة لإبراز الاسم على أي خلفية
        if (meta.stroke) {
            ctx.lineWidth = Math.max(3, fontSize * 0.12);
            ctx.strokeStyle = meta.stroke;
            ctx.lineJoin = 'round';
            ctx.miterLimit = 2;
            ctx.strokeText(name, x, y);
        }

        // ظل ناعم
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = Math.max(4, fontSize * 0.12);
        ctx.shadowOffsetY = Math.max(1, fontSize * 0.04);

        ctx.fillStyle = meta.color;
        ctx.fillText(name, x, y);
        ctx.restore();
    }

    // ===========================================================
    // الـ Stage (المعاينة)
    // ===========================================================
    async function selectTemplate(key, opts = { scrollIntoView: true }) {
        const cfg = TEMPLATES[key];
        if (!cfg) return;
        currentTemplate = key;

        cardStage.classList.add('loading');
        designerName.textContent = cfg.designer;
        updateGallerySelection();
        updateCounter();
        updateNavButtons();

        try {
            const img = await loadImage(cfg.file);
            currentImage = img;
            renderCard(img, recipientInput.value);
        } catch (err) {
            console.error(err);
            showPopup('error', 'تعذّر تحميل البطاقة');
        } finally {
            cardStage.classList.remove('loading');
        }

        if (opts.scrollIntoView) scrollGalleryToSelected();
    }

    function rerenderCurrent() {
        if (!currentImage) return;
        renderCard(currentImage, recipientInput.value);
    }

    function updateGallerySelection() {
        document.querySelectorAll('.gallery-item').forEach(it => {
            it.classList.toggle('selected', it.dataset.template === currentTemplate);
        });
    }

    function visibleTemplates() {
        if (currentFilter === 'all') return TEMPLATE_ORDER.slice();
        return TEMPLATE_ORDER.filter(k => TEMPLATES[k].designer === currentFilter);
    }

    function updateCounter() {
        const visible = visibleTemplates();
        const idx = visible.indexOf(currentTemplate);
        currentIdxEl.textContent = toArabicDigits(Math.max(0, idx) + 1);
        totalIdxEl.textContent   = toArabicDigits(visible.length);
    }

    function updateNavButtons() {
        const visible = visibleTemplates();
        const idx = visible.indexOf(currentTemplate);
        prevBtn.disabled = idx <= 0;
        nextBtn.disabled = idx >= visible.length - 1;
    }

    function navStep(delta) {
        const visible = visibleTemplates();
        let idx = visible.indexOf(currentTemplate);
        idx = Math.max(0, Math.min(visible.length - 1, idx + delta));
        const next = visible[idx];
        if (next && next !== currentTemplate) selectTemplate(next);
    }

    function scrollGalleryToSelected() {
        const el = document.querySelector(`.gallery-item[data-template="${currentTemplate}"]`);
        if (!el) return;
        const stripRect = galleryStrip.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const offset = (elRect.left + elRect.width / 2) - (stripRect.left + stripRect.width / 2);
        galleryStrip.scrollBy({ left: offset, behavior: 'smooth' });
    }

    // ===========================================================
    // Filter
    // ===========================================================
    function setupFilters() {
        filterBar.addEventListener('click', e => {
            const pill = e.target.closest('.filter-pill');
            if (!pill) return;
            currentFilter = pill.dataset.filter;
            document.querySelectorAll('.filter-pill').forEach(p => p.classList.toggle('active', p === pill));
            applyFilter();
        });
    }

    function applyFilter() {
        let visibleCount = 0;
        document.querySelectorAll('.gallery-item').forEach(item => {
            const show = currentFilter === 'all' || item.dataset.designer === currentFilter;
            item.classList.toggle('hidden', !show);
            if (show) visibleCount++;
        });
        galleryCount.textContent = `${toArabicDigits(visibleCount)} ${visibleCount === 1 ? 'بطاقة' : 'بطاقة'}`;

        // إذا البطاقة المختارة مخفية، اختر أول بطاقة مرئية
        const visible = visibleTemplates();
        if (!visible.includes(currentTemplate) && visible.length > 0) {
            selectTemplate(visible[0]);
        } else {
            updateCounter();
            updateNavButtons();
        }
    }

    // ===========================================================
    // Gallery & Strip nav
    // ===========================================================
    function setupGallery() {
        document.querySelectorAll('.gallery-item').forEach(item => {
            item.addEventListener('click', () => selectTemplate(item.dataset.template));
        });

        stripLeftBtn.addEventListener('click', () => galleryStrip.scrollBy({ left: -400, behavior: 'smooth' }));
        stripRightBtn.addEventListener('click', () => galleryStrip.scrollBy({ left: 400, behavior: 'smooth' }));
    }

    // ===========================================================
    // Name input + Nav
    // ===========================================================
    function setupControls() {
        recipientInput.addEventListener('input', rerenderCurrent);
        clearNameBtn.addEventListener('click', () => {
            recipientInput.value = '';
            recipientInput.focus();
            rerenderCurrent();
        });
        prevBtn.addEventListener('click', () => navStep(-1));
        nextBtn.addEventListener('click', () => navStep(1));

        document.addEventListener('keydown', e => {
            if (document.activeElement === recipientInput) return;
            if (e.key === 'ArrowLeft')  navStep(1);
            if (e.key === 'ArrowRight') navStep(-1);
        });
    }

    // ===========================================================
    // Download
    // ===========================================================
    async function downloadCard() {
        const cfg = TEMPLATES[currentTemplate];
        const recipient = recipientInput.value.trim();
        const safeDesigner = cfg.designer.replace(/[\\/:*?"<>|]/g, '');
        const safeName     = recipient.replace(/[\\/:*?"<>|]/g, '');
        const fileName = recipient
            ? `بطاقة_عيد_الأضحى_لـ_${safeName}_تصميم_${safeDesigner}.png`
            : `بطاقة_عيد_الأضحى_تصميم_${safeDesigner}.png`;

        const originalHTML = downloadBtn.innerHTML;
        downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>جاري التحميل…</span>';
        downloadBtn.disabled = true;

        try {
            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob(b => b ? resolve(b) : reject(new Error('فشل توليد الصورة')), 'image/png', 1.0);
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            await incrementStat('downloads');
            showPopup('success', recipient
                ? `تم تحميل بطاقتك ${recipient} — تقبّل الله منا ومنكم!`
                : `تم تحميل بطاقة ${cfg.designer} بنجاح — تقبّل الله منا ومنكم!`);
        } catch (err) {
            showPopup('error', 'حدث خطأ أثناء التحميل: ' + err.message);
        } finally {
            downloadBtn.innerHTML = originalHTML;
            downloadBtn.disabled = false;
        }
    }

    // ===========================================================
    // Share via WhatsApp
    // ===========================================================
    function shareWhatsApp() {
        const cfg = TEMPLATES[currentTemplate];
        const recipient = recipientInput.value.trim();
        const text = recipient
            ? `كل عام وأنتم بخير ${recipient} — عيد أضحى مبارك\nبطاقة من تصميم ${cfg.designer} — نادي أديب\n${location.href}`
            : `عيد أضحى مبارك — تقبّل الله منا ومنكم\nبطاقة من تصميم ${cfg.designer} — نادي أديب\n${location.href}`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    }

    // ===========================================================
    // Popup
    // ===========================================================
    function showPopup(type, message, buttons = null) {
        closePopup();
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error:   '<i class="fas fa-exclamation-circle"></i>',
            info:    '<i class="fas fa-info-circle"></i>',
            confirm: '<i class="fas fa-question-circle"></i>'
        };
        const titles = { success: 'تم بنجاح!', error: 'حدث خطأ!', info: 'تنبيه', confirm: 'تأكيد' };

        let btnsHTML;
        if (buttons && Array.isArray(buttons)) {
            btnsHTML = `<div class="popup-buttons">${buttons.map(b => `<button class="popup-btn ${b.class || ''}">${b.text}</button>`).join('')}</div>`;
        } else {
            btnsHTML = `<div class="popup-buttons"><button class="popup-btn">حسناً</button></div>`;
        }

        const popup = document.createElement('div');
        popup.className = `popup popup-${type}`;
        popup.innerHTML = `
            <div class="popup-content">
                <button class="popup-close">&times;</button>
                <div class="popup-icon">${icons[type] || icons.info}</div>
                <h3>${titles[type] || ''}</h3>
                <p>${message}</p>
                ${btnsHTML}
            </div>`;

        popupContainer.appendChild(popup);
        popupContainer.style.display = 'flex';

        if (buttons && Array.isArray(buttons)) {
            buttons.forEach((b, i) => {
                popup.querySelectorAll('.popup-btn')[i].addEventListener('click', () => { b.action(); closePopup(); });
            });
        } else {
            popup.querySelector('.popup-btn').addEventListener('click', closePopup);
        }
        popup.querySelector('.popup-close').addEventListener('click', closePopup);
        popupContainer.addEventListener('click', e => { if (e.target === popupContainer) closePopup(); });
    }

    function closePopup() {
        popupContainer.style.display = 'none';
        popupContainer.innerHTML = '';
    }

    // ===========================================================
    // Init
    // ===========================================================
    function initApp() {
        setupFilters();
        setupGallery();
        setupControls();
        downloadBtn.addEventListener('click', downloadCard);
        shareBtn.addEventListener('click', shareWhatsApp);
        selectTemplate('t1', { scrollIntoView: false });
        setTimeout(recordVisitor, 1000);
    }

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(initApp).catch(initApp);
    } else {
        initApp();
    }
});
