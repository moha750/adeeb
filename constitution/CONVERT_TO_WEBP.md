# تحويل الصور إلى WebP

## 📌 لماذا WebP؟
- تقليل حجم الملفات بنسبة **30-50%**
- جودة أفضل من PNG/JPG بنفس الحجم
- دعم واسع في جميع المتصفحات الحديثة

## 🛠️ طرق التحويل:

### الطريقة 1: استخدام أداة أونلاين (الأسهل)
1. افتح: https://cloudconvert.com/png-to-webp
2. ارفع جميع ملفات PNG (p-01.png إلى p-18.png)
3. حدد جودة 85-90%
4. حمّل الملفات المحولة
5. ضعها في نفس المجلد مع ملفات PNG

### الطريقة 2: استخدام سطر الأوامر (للمطورين)

#### على macOS:
```bash
# تثبيت الأداة
brew install webp

# تحويل جميع الملفات
for file in p-*.png; do
  cwebp -q 85 "$file" -o "${file%.png}.webp"
done
```

#### على Windows:
```powershell
# تحميل الأداة من: https://developers.google.com/speed/webp/download

# تحويل جميع الملفات
Get-ChildItem -Filter "p-*.png" | ForEach-Object {
  cwebp -q 85 $_.FullName -o ($_.BaseName + ".webp")
}
```

#### على Linux:
```bash
# تثبيت الأداة
sudo apt-get install webp

# تحويل جميع الملفات
for file in p-*.png; do
  cwebp -q 85 "$file" -o "${file%.png}.webp"
done
```

### الطريقة 3: استخدام Photoshop/GIMP
1. افتح الصورة
2. File > Export As > WebP
3. اختر جودة 85-90%
4. احفظ بنفس الاسم مع امتداد .webp

## ✅ بعد التحويل:
- ضع ملفات WebP في نفس المجلد مع PNG
- الموقع سيستخدم WebP تلقائياً في المتصفحات الداعمة
- سيعود لـ PNG في المتصفحات القديمة

## 📊 النتيجة المتوقعة:
- **قبل**: 18 صورة PNG × ~500KB = ~9MB
- **بعد**: 18 صورة WebP × ~250KB = ~4.5MB
- **التوفير**: ~50% أسرع! 🚀

## 🔍 التحقق من النجاح:
افتح Console في المتصفح وابحث عن:
```
🖼️ دعم WebP: مفعّل ✅
```

---
**ملاحظة:** الكود يدعم كلا الصيغتين، لذا لا داعي للقلق إذا لم تحول الصور الآن.
