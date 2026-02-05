# دليل الانتقال من SweetAlert2 إلى النظام الجديد

## 📋 نظرة عامة

تم استبدال مكتبة SweetAlert2 بنظام مخصص يستخدم:
- **modals.css** - للنوافذ المنبثقة
- **toast-notifications.css** - للإشعارات
- **modal-helper.js** - دوال مساعدة للنوافذ
- **toast-notifications.js** - دوال مساعدة للإشعارات

## 🔄 جدول التحويل السريع

### إشعارات بسيطة (Toast)

| SweetAlert2 | النظام الجديد |
|------------|---------------|
| `Swal.fire({ icon: 'success', title: 'نجح', text: 'تم الحفظ' })` | `Toast.success('تم الحفظ', 'نجح')` |
| `Swal.fire({ icon: 'error', title: 'خطأ', text: 'فشل' })` | `Toast.error('فشل', 'خطأ')` |
| `Swal.fire({ icon: 'warning', title: 'تنبيه' })` | `Toast.warning('رسالة التنبيه', 'تنبيه')` |
| `Swal.fire({ icon: 'info', title: 'معلومة' })` | `Toast.info('المعلومة', 'معلومة')` |

### نوافذ التأكيد

**قبل (SweetAlert2):**
```javascript
const result = await Swal.fire({
    title: 'هل أنت متأكد؟',
    text: 'لا يمكن التراجع',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'نعم، احذف',
    cancelButtonText: 'إلغاء'
});

if (result.isConfirmed) {
    // تنفيذ الحذف
}
```

**بعد (النظام الجديد):**
```javascript
const confirmed = await ModalHelper.confirm({
    title: 'هل أنت متأكد؟',
    message: 'لا يمكن التراجع',
    type: 'danger',
    confirmText: 'نعم، احذف',
    cancelText: 'إلغاء'
});

if (confirmed) {
    // تنفيذ الحذف
    Toast.success('تم الحذف بنجاح');
}
```

### نوافذ بنماذج

**قبل (SweetAlert2):**
```javascript
const { value: formValues } = await Swal.fire({
    title: 'إضافة عنصر',
    html: `
        <input id="name" class="swal2-input" placeholder="الاسم">
        <textarea id="desc" class="swal2-textarea"></textarea>
    `,
    preConfirm: () => {
        return {
            name: document.getElementById('name').value,
            desc: document.getElementById('desc').value
        };
    }
});
```

**بعد (النظام الجديد):**
```javascript
const formData = await ModalHelper.form({
    title: 'إضافة عنصر',
    fields: [
        {
            name: 'name',
            type: 'text',
            label: 'الاسم',
            placeholder: 'أدخل الاسم',
            required: true
        },
        {
            name: 'desc',
            type: 'textarea',
            label: 'الوصف',
            placeholder: 'أدخل الوصف'
        }
    ],
    submitText: 'حفظ',
    cancelText: 'إلغاء',
    onSubmit: (data) => {
        console.log(data);
        Toast.success('تم الحفظ');
    }
});
```

### نوافذ مخصصة

**قبل (SweetAlert2):**
```javascript
await Swal.fire({
    title: 'العنوان',
    html: '<div>محتوى HTML</div>',
    width: '800px'
});
```

**بعد (النظام الجديد):**
```javascript
await ModalHelper.show({
    title: 'العنوان',
    html: '<div>محتوى HTML</div>',
    size: 'lg', // sm, md, lg, xl
    showClose: true
});
```

## 📝 أمثلة عملية

### مثال 1: إنشاء مسودة خبر

```javascript
async function createNewsDraft() {
    const formData = await ModalHelper.form({
        title: '📰 إنشاء مسودة خبر جديد',
        fields: [
            {
                name: 'title',
                type: 'text',
                label: 'عنوان الخبر',
                placeholder: 'أدخل عنوان الخبر',
                required: true
            },
            {
                name: 'category',
                type: 'select',
                label: 'التصنيف',
                options: [
                    { value: 'events', label: 'فعاليات' },
                    { value: 'achievements', label: 'إنجازات' },
                    { value: 'announcements', label: 'إعلانات' }
                ]
            },
            {
                name: 'notes',
                type: 'textarea',
                label: 'ملاحظات أولية',
                placeholder: 'ملاحظات أو تعليمات للكتّاب...'
            }
        ],
        submitText: 'إنشاء المسودة',
        onSubmit: async (data) => {
            try {
                const loadingToast = Toast.loading('جاري الإنشاء...');
                
                // حفظ في قاعدة البيانات
                const result = await saveToDatabase(data);
                
                Toast.close(loadingToast);
                Toast.success('تم إنشاء المسودة بنجاح');
                
                return result;
            } catch (error) {
                Toast.error('حدث خطأ: ' + error.message);
            }
        }
    });
}
```

### مثال 2: حذف عنصر

```javascript
async function deleteItem(itemId) {
    const confirmed = await ModalHelper.confirm({
        title: 'تأكيد الحذف',
        message: 'هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.',
        type: 'danger',
        confirmText: 'نعم، احذف',
        cancelText: 'إلغاء'
    });

    if (confirmed) {
        try {
            const loadingToast = Toast.loading('جاري الحذف...');
            
            await deleteFromDatabase(itemId);
            
            Toast.close(loadingToast);
            Toast.success('تم الحذف بنجاح');
            
            // تحديث الواجهة
            refreshList();
        } catch (error) {
            Toast.error('فشل الحذف: ' + error.message);
        }
    }
}
```

### مثال 3: معاينة محتوى

```javascript
async function previewNews(newsData) {
    await ModalHelper.show({
        title: newsData.title,
        html: `
            <div style="text-align: right;">
                ${newsData.image ? `<img src="${newsData.image}" style="width: 100%; border-radius: 8px; margin-bottom: 1rem;">` : ''}
                ${newsData.summary ? `<p style="font-weight: 600; margin-bottom: 1rem;">${newsData.summary}</p>` : ''}
                <div style="line-height: 1.8;">${newsData.content}</div>
            </div>
        `,
        size: 'xl',
        showClose: true,
        showFooter: true,
        footerButtons: [
            {
                text: 'إغلاق',
                class: 'btn--outline btn--outline-secondary'
            },
            {
                text: 'نشر الآن',
                class: 'btn--primary',
                callback: () => publishNews(newsData.id)
            }
        ]
    });
}
```

### مثال 4: Toast مع أزرار إجراءات

```javascript
function showUndoToast(action) {
    Toast.show({
        type: 'info',
        title: 'تم الحذف',
        message: 'تم حذف العنصر',
        duration: 5000,
        actions: [
            {
                label: 'تراجع',
                type: 'primary',
                callback: () => {
                    undoDelete();
                    Toast.success('تم التراجع');
                }
            }
        ]
    });
}
```

## 🎨 أنواع Toast المتاحة

```javascript
// نجاح
Toast.success('تم الحفظ بنجاح');

// خطأ
Toast.error('حدث خطأ في الحفظ');

// تنبيه
Toast.warning('يرجى ملء جميع الحقول');

// معلومة
Toast.info('تم إرسال الإشعار');

// تحميل (يبقى حتى تغلقه يدوياً)
const loadingId = Toast.loading('جاري التحميل...');
// ... عملية طويلة
Toast.close(loadingId);

// مخصص
Toast.show({
    type: 'success',
    title: 'عنوان مخصص',
    message: 'رسالة مخصصة',
    duration: 3000,
    icon: '<i class="fa-solid fa-heart"></i>',
    closable: true
});
```

## 🎨 أنواع Modal المتاحة

```javascript
// تأكيد بسيط
await ModalHelper.confirm({
    title: 'تأكيد',
    message: 'هل أنت متأكد؟',
    type: 'warning' // warning, danger, info, success
});

// نموذج
await ModalHelper.form({
    title: 'إضافة',
    fields: [...]
});

// مخصص
await ModalHelper.show({
    title: 'عنوان',
    html: '<div>محتوى</div>',
    size: 'md' // sm, md, lg, xl
});
```

## 🔧 خيارات متقدمة

### Toast دائم (لا يختفي تلقائياً)

```javascript
Toast.show({
    type: 'warning',
    title: 'تحذير مهم',
    message: 'يرجى قراءة هذا',
    persistent: true, // لن يختفي تلقائياً
    closable: true
});
```

### Toast مع صورة

```javascript
Toast.show({
    type: 'info',
    title: 'إشعار جديد',
    message: 'لديك رسالة من أحمد',
    image: '/path/to/avatar.jpg'
});
```

### Modal مع callback عند الإغلاق

```javascript
await ModalHelper.show({
    title: 'عنوان',
    html: '<div>محتوى</div>',
    onClose: (result) => {
        console.log('تم إغلاق Modal:', result);
    }
});
```

## 📦 الملفات المطلوبة

تأكد من تضمين هذه الملفات في HTML:

```html
<!-- CSS -->
<link rel="stylesheet" href="css/modals.css">
<link rel="stylesheet" href="css/toast-notifications.css">

<!-- JavaScript -->
<script src="js/modal-helper.js"></script>
<script src="js/toast-notifications.js"></script>
```

## ✅ قائمة التحقق للمطورين

عند تحويل كود من SweetAlert2:

- [ ] استبدل `Swal.fire()` البسيطة بـ `Toast.success/error/warning/info()`
- [ ] استبدل نوافذ التأكيد بـ `ModalHelper.confirm()`
- [ ] استبدل النماذج بـ `ModalHelper.form()`
- [ ] استبدل النوافذ المخصصة بـ `ModalHelper.show()`
- [ ] أزل `import Swal from 'sweetalert2'` أو `<script src="sweetalert2.js">`
- [ ] اختبر جميع الوظائف المحولة

## 🎯 الفوائد

1. **حجم أصغر**: لا حاجة لمكتبة خارجية ثقيلة
2. **تخصيص كامل**: تحكم كامل في التصميم
3. **أداء أفضل**: كود مُحسّن للمشروع
4. **توافق**: يعمل مع نظام التصميم الحالي
5. **سهولة الصيانة**: كود واضح وبسيط

## 📞 الدعم

للمساعدة أو الإبلاغ عن مشاكل، راجع الملفات:
- `modal-helper.js`
- `toast-notifications.js`
- `modals.css`
- `toast-notifications.css`
