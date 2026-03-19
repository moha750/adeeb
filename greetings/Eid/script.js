// ===========================
// إعدادات Supabase
// ===========================
const SUPABASE_URL = 'https://nnlhkfeybyhvlinbqqfa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubGhrZmV5YnlodmxpbmJxcWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODIyODcsImV4cCI6MjA4NDE1ODI4N30.VhQgdxHt6YOQu8IJ-eni6_9qIeua1ZM3hx8hVe3YgZg';

let supabaseClient;
if (typeof window.supabase !== 'undefined') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ===========================
// وظائف العدادات
// ===========================
async function incrementStat(statType) {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.rpc('increment_stat', {
            p_stat_type: statType
        });
        if (error) throw error;
        return data;
    } catch (err) {
        console.error('خطأ في تحديث العداد:', err);
    }
}

async function loadStats() {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient
            .from('stats')
            .select('stat_type, count');
        
        if (error) throw error;
        
        data.forEach(stat => {
            if (stat.stat_type === 'visitors') {
                animateCounter('visitorsCount', stat.count);
            } else if (stat.stat_type === 'downloads') {
                animateCounter('downloadsCount', stat.count);
            }
        });
    } catch (err) {
        console.error('خطأ في تحميل الإحصائيات:', err);
    }
}

function animateCounter(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const counter = element.querySelector('.counter');
    if (!counter) return;
    
    const duration = 2000;
    const start = 0;
    const increment = targetValue / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= targetValue) {
            counter.textContent = targetValue.toLocaleString('ar-SA');
            clearInterval(timer);
        } else {
            counter.textContent = Math.floor(current).toLocaleString('ar-SA');
        }
    }, 16);
}

// تسجيل زيارة عند تحميل الصفحة
let visitorRecorded = false;
async function recordVisitor() {
    if (visitorRecorded) return;
    visitorRecorded = true;
    
    const newCount = await incrementStat('visitors');
    if (newCount) {
        animateCounter('visitorsCount', newCount);
    }
}

document.addEventListener('DOMContentLoaded', function () {

    // ===========================
    // العناصر الأساسية
    // ===========================
    const canvas      = document.getElementById('myCanvas');
    const ctx         = canvas.getContext('2d');
    const textInput   = document.getElementById('textInput');
    const clearBtn    = document.getElementById('clearName');
    const downloadBtn = document.getElementById('downloadBtn');
    const visualPicker = document.getElementById('visualPicker');

    // Popup container
    const popupContainer = document.createElement('div');
    popupContainer.className = 'popup-container';
    document.body.appendChild(popupContainer);

    // ===========================
    // إعدادات القوالب (12 قالب)
    // ===========================
    const templates = {
        '1.png':  { name: 'تصميم 1',  canvasW: 1080, canvasH: 1920, textPosition: { x: 540, y: 1180 }, textColor: '#844799', fontSize: 60, fontStyle: 'bold' },
        '2.png':  { name: 'تصميم 2',  canvasW: 1080, canvasH: 1920, textPosition: { x: 540, y: 1120 }, textColor: '#375178', fontSize: 70, fontStyle: 'bold' },
        '3.png':  { name: 'تصميم 3',  canvasW: 1080, canvasH: 1920, textPosition: { x: 540, y: 1230 }, textColor: '#c09a20', fontSize: 70, fontStyle: 'bold' },
        '4.png':  { name: 'تصميم 4',  canvasW: 1080, canvasH: 1920, textPosition: { x: 540, y: 1290 }, textColor: '#2c3d5d', fontSize: 60, fontStyle: 'bold' },
        '5.png':  { name: 'تصميم 5',  canvasW: 1080, canvasH: 1920, textPosition: { x: 540, y: 1520 }, textColor: '#8d7c3f', fontSize: 70, fontStyle: 'bold' },
        '6.png':  { name: 'تصميم 6',  canvasW: 1080, canvasH: 1920, textPosition: { x: 540, y: 1580 }, textColor: '#000000', fontSize: 70, fontStyle: 'bold' },
        '7.png':  { name: 'تصميم 7',  canvasW: 1080, canvasH: 1920, textPosition: { x: 540, y: 1420 }, textColor: '#ab9a84', fontSize: 66, fontStyle: 'bold' },
        '8.png':  { name: 'تصميم 8',  canvasW: 1080, canvasH: 1920, textPosition: { x: 540, y: 1250 }, textColor: '#762824', fontSize: 66, fontStyle: 'bold' },
        '9.png':  { name: 'تصميم 9',  canvasW: 1080, canvasH: 1920, textPosition: { x: 540, y: 1320 }, textColor: '#6c6a58', fontSize: 66, fontStyle: 'bold' },
        '10.png': { name: 'تصميم 10', canvasW: 1080, canvasH: 1920, textPosition: { x: 540, y: 1450 }, textColor: '#cebb82', fontSize: 70, fontStyle: 'bold' },
        '11.png': { name: 'تصميم 11', canvasW: 1080, canvasH: 1920, textPosition: { x: 540, y: 1250 }, textColor: '#ffffff', fontSize: 70, fontStyle: 'bold' },
        '12.png': { name: 'تصميم 12', canvasW: 1080, canvasH: 1920, textPosition: { x: 540, y: 1280 }, textColor: '#060108', fontSize: 60, fontStyle: 'bold' },
    };

    let currentTemplate = '1.png';
    let backgroundImage = new Image();

    // ===========================
    // تهيئة التطبيق
    // ===========================
    initApp();

    function initApp() {
        loadTemplate(currentTemplate);
        setupVisualPicker();
        setupNameInput();
        setupDownloadBtn();
        
        // تحميل الإحصائيات وتسجيل الزيارة
        loadStats();
        setTimeout(recordVisitor, 1000);
    }

    // ===========================
    // تحميل القالب وضبط Canvas
    // ===========================
    function loadTemplate(file) {
        currentTemplate = file;
        const cfg = templates[file];

        // ضبط أبعاد canvas
        canvas.width  = cfg.canvasW;
        canvas.height = cfg.canvasH;

        canvas.classList.remove('canvas-square');

        backgroundImage = new Image();
        backgroundImage.onload = drawCanvas;
        backgroundImage.onerror = function () {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#e8eaf0';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#274060';
            ctx.font = 'bold 60px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('تعذّر تحميل الصورة', canvas.width / 2, canvas.height / 2);
        };
        backgroundImage.src = file;
    }

    // ===========================
    // رسم Canvas
    // ===========================
    function drawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (backgroundImage.complete && backgroundImage.naturalWidth > 0) {
            ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
        }
        if (textInput.value.trim()) {
            drawText();
        }
    }

    function drawText() {
        const text = textInput.value.trim();
        const cfg   = templates[currentTemplate];

        let fontSize = cfg.fontSize;
        const maxWidth = canvas.width * 0.8;

        // تصغير الخط تلقائياً إن كان الاسم طويلاً
        ctx.textAlign = 'center';
        do {
            ctx.font = `${cfg.fontStyle} ${fontSize}px fr, Arial`;
            if (ctx.measureText(text).width <= maxWidth || fontSize <= 20) break;
            fontSize -= 2;
        } while (true);

        ctx.fillStyle   = cfg.textColor;
        ctx.shadowColor = 'transparent';
        ctx.fillText(text, cfg.textPosition.x, cfg.textPosition.y);
    }

    // ===========================
    // Visual Picker
    // ===========================
    function setupVisualPicker() {
        document.querySelectorAll('.vpick-item').forEach(item => {
            item.addEventListener('click', function () {
                selectVpick(this);
            });
        });
    }

    function selectVpick(item) {
        document.querySelectorAll('.vpick-item').forEach(i => i.classList.remove('selected-vpick'));
        item.classList.add('selected-vpick');
        loadTemplate(item.dataset.template);
    }

    // ===========================
    // حقل الاسم
    // ===========================
    function setupNameInput() {
        textInput.addEventListener('input', drawCanvas);

        clearBtn.addEventListener('click', function () {
            textInput.value = '';
            textInput.focus();
            drawCanvas();
        });
    }

    // ===========================
    // تحميل البطاقة
    // ===========================
    function setupDownloadBtn() {
        downloadBtn.addEventListener('click', downloadImage);
    }

    function downloadImage() {
        const cfg       = templates[currentTemplate];
        const nameVal   = textInput.value.trim();
        const fileName  = nameVal
            ? `بطاقة_${cfg.name}_لـ_${nameVal}`
            : `بطاقة_${cfg.name}`;

        downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحميل...';
        downloadBtn.disabled  = true;

        setTimeout(async () => {
            try {
                const dataUrl = canvas.toDataURL('image/png', 1.0);
                const link    = document.createElement('a');
                link.href     = dataUrl;
                link.download = `${fileName}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // تسجيل التحميل في قاعدة البيانات
                const newCount = await incrementStat('downloads');
                if (newCount) {
                    animateCounter('downloadsCount', newCount);
                }
                
                showPopup('success', 'تم تحميل البطاقة بنجاح!');
            } catch (err) {
                showPopup('error', 'حدث خطأ أثناء التحميل: ' + err.message);
            } finally {
                downloadBtn.innerHTML = '<i class="fas fa-download"></i> تحميل البطاقة';
                downloadBtn.disabled  = false;
            }
        }, 400);
    }

    // ===========================
    // Popup
    // ===========================
    function showPopup(type, message, buttons = null, duration = 4500) {
        closePopup();

        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error:   '<i class="fas fa-exclamation-circle"></i>',
            info:    '<i class="fas fa-info-circle"></i>',
            confirm: '<i class="fas fa-question-circle"></i>'
        };
        const titles = {
            success: 'تم بنجاح!',
            error:   'حدث خطأ!',
            info:    'تنبيه',
            confirm: 'تأكيد'
        };

        let btnsHTML = '';
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

        if (duration && type !== 'confirm');
    }

    function closePopup() {
        popupContainer.style.display = 'none';
        popupContainer.innerHTML = '';
    }

});
