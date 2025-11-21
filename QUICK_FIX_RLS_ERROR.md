# حل سريع: خطأ 406 - RLS ⚡

## الخطأ
```
GET /rest/v1/members 406 (Not Acceptable)
Error: فشل ربط الحساب ببيانات العضوية
```

---

## السبب
محاولة قراءة بيانات العضو **قبل** تسجيل الدخول.
RLS Policy تحتاج `auth.uid()` لكنه `NULL`.

---

## الحل (تم تطبيقه)

✅ **تم إصلاح الكود تلقائياً**

الترتيب الجديد:
```
1. إنشاء الحساب ✅
2. ربط user_id ✅
3. تسجيل الدخول ✅ ← المفتاح
4. التحقق من الربط ✅
```

---

## اختبار الحل

1. افتح رابط تفعيل جديد
2. أدخل كلمة مرور قوية
3. اضغط "تفعيل الحساب"
4. يجب أن يعمل بدون أخطاء ✨

---

## إذا استمر الخطأ

### تحقق من RLS Policies:

1. **Supabase Dashboard** → **Database** → **Tables** → **members**
2. تأكد من وجود Policy:
   ```sql
   "Members can read own data"
   USING (auth.uid() = user_id)
   ```

### تحقق من Session:
افتح Console:
```javascript
const { data: { session } } = await sb.auth.getSession();
console.log('Session:', session);
```

يجب أن يكون `session` **ليس NULL**

---

## مراجع

📄 **التفاصيل الكاملة**: `FIX_RLS_406_ERROR.md`
📄 **ملخص شامل**: `ACTIVATION_ISSUES_SUMMARY.md`
