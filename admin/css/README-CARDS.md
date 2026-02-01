# 📊 نظام البطاقات والإحصائيات - Cards & Stats System

## 📁 الملفات

### 1. `stats-cards.css` - بطاقات الإحصائيات
ملف CSS مخصص لتصميم بطاقات الإحصائيات بشكل حديث ومتطور مع أنيميشن وتأثيرات متقدمة.

### 2. `cards.css` - البطاقات العامة
ملف CSS للبطاقات العامة (Card Component) المستخدمة في جميع أنحاء النظام.

### 3. `stats-counter.js` - أنيميشن العد
سكريبت JavaScript لإضافة أنيميشن عد تصاعدي للأرقام والإحصائيات.

---

## 🎨 استخدام بطاقات الإحصائيات

### البنية الأساسية

```html
<div class="stats-grid">
    <div class="stat-card">
        <div class="stat-card__header">
            <div class="stat-card__icon">
                <i class="fa-solid fa-users"></i>
            </div>
        </div>
        <div class="stat-card__content">
            <h4 class="stat-card__title">إجمالي الأعضاء</h4>
            <div class="stat-card__value">1250</div>
            <div class="stat-card__change stat-card__change--positive">
                <i class="fa-solid fa-arrow-up"></i>
                <span>+12% من الشهر الماضي</span>
            </div>
        </div>
    </div>
</div>
```

### أنواع البطاقات (Variants)

```html
<!-- Primary (أزرق) -->
<div class="stat-card stat-card--primary">...</div>

<!-- Success (أخضر) -->
<div class="stat-card stat-card--success">...</div>

<!-- Warning (برتقالي) -->
<div class="stat-card stat-card--warning">...</div>

<!-- Danger (أحمر) -->
<div class="stat-card stat-card--danger">...</div>

<!-- Info (أزرق فاتح) -->
<div class="stat-card stat-card--info">...</div>
```

### مع Badge (شارة)

```html
<div class="stat-card__header">
    <div class="stat-card__icon">
        <i class="fa-solid fa-users"></i>
    </div>
    <div class="stat-card__badge">
        <i class="fa-solid fa-fire"></i>
        <span>جديد</span>
    </div>
</div>
```

### مع Footer (تذييل)

```html
<div class="stat-card__footer">
    <div class="stat-card__footer-text">
        <i class="fa-solid fa-clock"></i>
        <span>آخر تحديث: منذ 5 دقائق</span>
    </div>
    <a href="#" class="stat-card__footer-link">
        عرض التفاصيل
        <i class="fa-solid fa-arrow-left"></i>
    </a>
</div>
```

### حالة التحميل

```html
<div class="stat-card stat-card--loading">
    <!-- المحتوى -->
</div>
```

---

## 🎯 استخدام أنيميشن العد

### التفعيل التلقائي

السكريبت يعمل تلقائياً عند تحميل الصفحة ويراقب جميع عناصر `.stat-card__value`.

### التخصيص

```javascript
// إنشاء instance مخصص
const customCounter = new StatsCounter({
    duration: 3000,        // مدة الأنيميشن (ميلي ثانية)
    easing: 'easeOutExpo', // نوع التسارع
    separator: ',',        // فاصل الآلاف
    decimal: '.',          // فاصل الأعشار
    prefix: '',            // بادئة (مثل: $)
    suffix: ''             // لاحقة (مثل: %)
});
```

### أنواع التسارع المتاحة

- `linear`
- `easeInQuad`, `easeOutQuad`, `easeInOutQuad`
- `easeInCubic`, `easeOutCubic`, `easeInOutCubic`
- `easeInQuart`, `easeOutQuart`, `easeInOutQuart`
- `easeInExpo`, `easeOutExpo`, `easeInOutExpo`
- `easeInCirc`, `easeOutCirc`, `easeInOutCirc`
- `easeInBack`, `easeOutBack`, `easeInOutBack`

### تحديث قيمة ديناميكياً

```javascript
const card = document.querySelector('.stat-card');
window.statsCounter.updateCard(card, 2500); // تحديث القيمة إلى 2500
```

### إعادة التهيئة

```javascript
window.statsCounter.refresh(); // إعادة مراقبة جميع البطاقات
```

### التدمير

```javascript
window.statsCounter.destroy(); // إيقاف المراقبة
```

---

## 🎨 استخدام البطاقات العامة

### البنية الأساسية

```html
<div class="card">
    <div class="card-header">
        <h3>
            <i class="fa-solid fa-chart-line"></i>
            عنوان البطاقة
        </h3>
    </div>
    <div class="card-body">
        <!-- المحتوى -->
    </div>
    <div class="card-footer">
        <!-- التذييل (اختياري) -->
    </div>
</div>
```

---

## 📱 الاستجابة (Responsive)

جميع البطاقات مستجيبة بالكامل وتتكيف مع:
- Desktop (1024px+)
- Tablet (768px - 1024px)
- Mobile (< 768px)
- Small Mobile (< 480px)

---

## ♿ إمكانية الوصول (Accessibility)

- دعم `prefers-reduced-motion` لتقليل الحركة
- Focus states واضحة
- دعم قارئات الششة

---

## 🌙 الوضع الداكن (Dark Mode)

جميع البطاقات تدعم الوضع الداكن تلقائياً عبر `prefers-color-scheme: dark`.

---

## 🖨️ الطباعة (Print)

تنسيقات خاصة للطباعة مع إزالة الظلال والأنيميشن.

---

## 📝 ملاحظات مهمة

1. **لا تضع تنسيقات البطاقات في ملفات أخرى** - استخدم الملفات المخصصة فقط
2. **الأنيميشن يعمل عند الظهور في Viewport** - يستخدم Intersection Observer
3. **الأرقام تُعد مرة واحدة فقط** - يتم إضافة class `counted` تلقائياً
4. **التوافق مع المتصفحات** - يدعم جميع المتصفحات الحديثة

---

## 🔧 استكشاف الأخطاء

### الأنيميشن لا يعمل؟
- تأكد من تضمين `stats-counter.js`
- تحقق من وجود class `stat-card__value`
- افتح Console للتحقق من الأخطاء

### التنسيقات لا تظهر؟
- تأكد من ترتيب ملفات CSS الصحيح
- `layout.css` → `cards.css` → `stats-cards.css`

---

## 📦 الملفات المطلوبة

```html
<!-- CSS -->
<link rel="stylesheet" href="css/layout.css" />
<link rel="stylesheet" href="css/cards.css" />
<link rel="stylesheet" href="css/stats-cards.css" />

<!-- JavaScript -->
<script src="js/stats-counter.js"></script>
```

---

تم التطوير بواسطة نظام إدارة نادي أدِيب 🎯
