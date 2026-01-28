# تطبيق Migration لإضافة عمود notes

## المشكلة
عند رفض متقدم من البرزخ، يظهر خطأ:
```
Could not find the 'notes' column of 'membership_interviews' in the schema cache
```

## الحل
يجب تطبيق ملف migration التالي على قاعدة البيانات:

**الملف:** `supabase/migrations/047_add_notes_to_interviews.sql`

## خطوات التطبيق

### الطريقة 1: عبر Supabase Dashboard (الأسهل)
1. افتح [Supabase Dashboard](https://supabase.com/dashboard)
2. اختر مشروعك
3. اذهب إلى **SQL Editor**
4. انسخ والصق المحتوى التالي:

```sql
-- إضافة عمود notes إلى جدول membership_interviews
ALTER TABLE membership_interviews 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- إضافة تعليق توضيحي
COMMENT ON COLUMN membership_interviews.notes IS 'ملاحظات إدارية وأسباب الرفض أو القبول';

-- تحديث السجلات الموجودة لنقل البيانات من result_notes إلى notes إن وجدت
UPDATE membership_interviews 
SET notes = result_notes 
WHERE notes IS NULL AND result_notes IS NOT NULL;
```

5. اضغط **Run** أو **F5**
6. تأكد من ظهور رسالة نجاح

### الطريقة 2: عبر Supabase CLI
```bash
# في مجلد المشروع
supabase db push
```

## التحقق من النجاح
بعد تطبيق Migration، جرب:
1. اذهب إلى قسم البرزخ
2. اختر متقدم واضغط "حذف/رفض"
3. اختر سبب الرفض
4. يجب أن يعمل بدون أخطاء

## ملاحظة
- العمود `notes` سيحل محل `result_notes` القديم
- جميع الملاحظات القديمة سيتم نقلها تلقائياً
- العمود يدعم النصوص الطويلة (TEXT)
