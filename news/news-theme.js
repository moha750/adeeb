// ===== Dark/Light Mode System for News Pages =====

// تهيئة نظام الوضع الليلي/النهاري
function initNewsTheme() {
  const themeToggle = document.getElementById('themeToggle');
  const html = document.documentElement;
  
  if (!themeToggle) return;
  
  // استرجاع الوضع المحفوظ من localStorage
  const savedTheme = localStorage.getItem('adeeb-news-theme') || 'light';
  html.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
  
  // إضافة مستمع للنقر على زر التبديل
  themeToggle.addEventListener('click', function() {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    // تطبيق الوضع الجديد
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('adeeb-news-theme', newTheme);
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
  if (!themeToggle) return;
  
  const icon = themeToggle.querySelector('i');
  
  if (theme === 'dark') {
    icon.className = 'fas fa-sun';
  } else {
    icon.className = 'fas fa-moon';
  }
}

// تهيئة النظام عند تحميل الصفحة
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNewsTheme);
} else {
  initNewsTheme();
}

// دعم اختصارات لوحة المفاتيح
document.addEventListener('keydown', function(e) {
  // Ctrl/Cmd + D لتبديل الوضع الليلي
  if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
    e.preventDefault();
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.click();
    }
  }
});
