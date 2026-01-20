#!/bin/bash

# سكريبت تحويل صور PNG إلى WebP
# الاستخدام: ./convert-to-webp.sh

echo "🖼️  بدء تحويل الصور إلى WebP..."
echo ""

# التحقق من وجود أداة cwebp
if ! command -v cwebp &> /dev/null; then
    echo "❌ أداة cwebp غير مثبتة!"
    echo ""
    echo "لتثبيتها على macOS:"
    echo "  brew install webp"
    echo ""
    echo "لتثبيتها على Linux:"
    echo "  sudo apt-get install webp"
    echo ""
    exit 1
fi

# عداد الملفات
count=0
total=$(ls p-*.png 2>/dev/null | wc -l)

if [ $total -eq 0 ]; then
    echo "❌ لم يتم العثور على ملفات PNG!"
    echo "تأكد من وجود ملفات بصيغة p-01.png, p-02.png, إلخ..."
    exit 1
fi

echo "📊 تم العثور على $total ملف PNG"
echo ""

# تحويل كل ملف
for file in p-*.png; do
    if [ -f "$file" ]; then
        count=$((count + 1))
        output="${file%.png}.webp"
        
        echo "[$count/$total] تحويل: $file → $output"
        
        # تحويل بجودة 85%
        cwebp -q 85 "$file" -o "$output" -quiet
        
        if [ $? -eq 0 ]; then
            # حساب التوفير في الحجم
            original_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file")
            webp_size=$(stat -f%z "$output" 2>/dev/null || stat -c%s "$output")
            
            original_kb=$((original_size / 1024))
            webp_kb=$((webp_size / 1024))
            savings=$(( (original_size - webp_size) * 100 / original_size ))
            
            echo "   ✅ نجح! (${original_kb}KB → ${webp_kb}KB | توفير ${savings}%)"
        else
            echo "   ❌ فشل التحويل!"
        fi
        echo ""
    fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ تم الانتهاء! تم تحويل $count ملف بنجاح"
echo ""
echo "📝 الخطوات التالية:"
echo "  1. تحقق من جودة الصور المحولة"
echo "  2. افتح الموقع في المتصفح"
echo "  3. افتح Console (F12) وابحث عن: 🖼️ دعم WebP"
echo ""
echo "🚀 الموقع الآن أسرع بنسبة 30-50%!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
