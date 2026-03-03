// ========================================
// تهيئة التطبيق عند تحميل الصفحة
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    initVisitorCounter();
    initShareButton();
    initAnimations();
});

// ========================================
// إدارة الوضع الليلي/النهاري
// ========================================
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const html = document.documentElement;
    
    // استرجاع الوضع المحفوظ من localStorage
    const savedTheme = localStorage.getItem('adeeb-theme') || 'light';
    html.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    // إضافة مستمع للنقر على زر التبديل
    themeToggle.addEventListener('click', function() {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        // تطبيق الوضع الجديد
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('adeeb-theme', newTheme);
        updateThemeIcon(newTheme);
        
        // تأثير بصري عند التبديل
        themeToggle.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            themeToggle.style.transform = '';
        }, 300);
    });
}

// تحديث أيقونة زر الوضع الليلي
function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('themeToggle');
    const icon = themeToggle.querySelector('i');
    
    if (theme === 'dark') {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
}

// ========================================
// عداد الزوار
// ========================================
function initVisitorCounter() {
    const visitorCountElement = document.getElementById('visitorCount');
    
    // استرجاع عدد الزوار من localStorage
    let visitorCount = parseInt(localStorage.getItem('adeeb-visitor-count')) || 0;
    
    // زيادة العدد بواحد
    visitorCount++;
    
    // حفظ العدد الجديد
    localStorage.setItem('adeeb-visitor-count', visitorCount);
    
    // عرض العدد مع تأثير العد التصاعدي
    animateCounter(visitorCountElement, 0, visitorCount, 1000);
}

// تأثير العد التصاعدي
function animateCounter(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16); // 60 FPS
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
            element.textContent = end.toLocaleString('ar-SA');
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current).toLocaleString('ar-SA');
        }
    }, 16);
}

// ========================================
// زر المشاركة
// ========================================
function initShareButton() {
    const shareBtn = document.getElementById('shareBtn');
    
    shareBtn.addEventListener('click', async function() {
        const shareData = {
            title: 'روابط أدِيب - Adeeb Links',
            text: 'تابع نادي أدِيب الأدبي على جميع منصات التواصل الاجتماعي',
            url: window.location.href
        };
        
        // التحقق من دعم Web Share API
        if (navigator.share) {
            try {
                await navigator.share(shareData);
                showNotification('تم المشاركة بنجاح! ✅', 'success');
            } catch (err) {
                // المستخدم ألغى المشاركة
                if (err.name !== 'AbortError') {
                    fallbackShare();
                }
            }
        } else {
            // استخدام الطريقة البديلة للمتصفحات التي لا تدعم Web Share API
            fallbackShare();
        }
    });
}

// طريقة بديلة للمشاركة (نسخ الرابط)
function fallbackShare() {
    const url = window.location.href;
    
    // نسخ الرابط إلى الحافظة
    navigator.clipboard.writeText(url).then(() => {
        showNotification('تم نسخ الرابط! 📋', 'success');
    }).catch(() => {
        // طريقة بديلة للنسخ
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            showNotification('تم نسخ الرابط! 📋', 'success');
        } catch (err) {
            showNotification('فشل نسخ الرابط ❌', 'error');
        }
        
        document.body.removeChild(textArea);
    });
}

// عرض إشعار للمستخدم
function showNotification(message, type = 'info') {
    // إنشاء عنصر الإشعار
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // إضافة الأنماط
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#4299e1'};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        font-weight: 600;
        animation: slideInRight 0.3s ease-out;
        direction: rtl;
    `;
    
    // إضافة الإشعار إلى الصفحة
    document.body.appendChild(notification);
    
    // إزالة الإشعار بعد 3 ثواني
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// ========================================
// تأثيرات الحركة عند التمرير
// ========================================
function initAnimations() {
    // إضافة تأثير الظهور التدريجي للبطاقات
    const cards = document.querySelectorAll('.link-card');
    
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
    
    // إضافة تأثير الموجة عند النقر على البطاقات
    cards.forEach(card => {
        card.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            
            const rect = card.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.3);
                left: ${x}px;
                top: ${y}px;
                pointer-events: none;
                animation: rippleEffect 0.6s ease-out;
            `;
            
            card.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// ========================================
// تتبع النقرات على الروابط (اختياري)
// ========================================
document.querySelectorAll('.link-card').forEach(card => {
    card.addEventListener('click', function() {
        const platform = this.classList[1]; // youtube, twitter, etc.
        trackLinkClick(platform);
    });
});

function trackLinkClick(platform) {
    // حفظ إحصائيات النقرات في localStorage
    const clicks = JSON.parse(localStorage.getItem('adeeb-link-clicks')) || {};
    clicks[platform] = (clicks[platform] || 0) + 1;
    localStorage.setItem('adeeb-link-clicks', JSON.stringify(clicks));
    
    // يمكن إرسال البيانات إلى خادم التحليلات هنا
    console.log(`تم النقر على رابط: ${platform}`);
}

// ========================================
// إضافة أنماط CSS للتأثيرات الديناميكية
// ========================================
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    @keyframes rippleEffect {
        from {
            transform: scale(0);
            opacity: 1;
        }
        to {
            transform: scale(2);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ========================================
// معاينة الروابط عند التمرير (تحسين تجربة المستخدم)
// ========================================
document.querySelectorAll('.link-card').forEach(card => {
    let hoverTimeout;
    
    card.addEventListener('mouseenter', function() {
        hoverTimeout = setTimeout(() => {
            this.style.transform = 'translateY(-6px) scale(1.02)';
        }, 100);
    });
    
    card.addEventListener('mouseleave', function() {
        clearTimeout(hoverTimeout);
        this.style.transform = '';
    });
});

// ========================================
// دعم اختصارات لوحة المفاتيح
// ========================================
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + K لفتح زر المشاركة
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('shareBtn').click();
    }
    
    // Ctrl/Cmd + D لتبديل الوضع الليلي
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        document.getElementById('themeToggle').click();
    }
});

// ========================================
// تحسين الأداء: Lazy Loading للصور
// ========================================
if ('loading' in HTMLImageElement.prototype) {
    const images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach(img => {
        img.src = img.dataset.src;
    });
} else {
    // Fallback للمتصفحات القديمة
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lazysizes/5.3.2/lazysizes.min.js';
    document.body.appendChild(script);
}

// ========================================
// إضافة دعم PWA (Progressive Web App)
// ========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // يمكن تفعيل Service Worker لاحقاً إذا لزم الأمر
        // navigator.serviceWorker.register('/service-worker.js');
    });
}

// ========================================
// تسجيل وقت الزيارة
// ========================================
const visitTime = new Date().toLocaleString('ar-SA', {
    timeZone: 'Asia/Riyadh',
    dateStyle: 'full',
    timeStyle: 'short'
});

console.log(`%c🎉 مرحباً بك في صفحة روابط أدِيب!`, 'font-size: 20px; color: #2c5f2d; font-weight: bold;');
console.log(`%c📅 وقت الزيارة: ${visitTime}`, 'font-size: 14px; color: #718096;');
console.log(`%c💚 شكراً لزيارتك!`, 'font-size: 16px; color: #97ce4c; font-weight: bold;');
