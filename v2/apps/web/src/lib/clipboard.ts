/**
 * النسخُ إلى الحافظة — **مصدرٌ واحد**، وسببُ وجوده أنّ `navigator.clipboard` **ليست موجودةً
 * دائمًا**: المتصفّح لا يعرضها إلّا في **سياقٍ آمن** (https أو localhost). فمن فتح اللوحة من
 * جوّاله على عنوان الشبكة المحلّيّة (`http://192.168.x.x:3000`) لم يجدها، فيُقال له «متصفّحك
 * يمنع الحافظة» وهو لا يمنع شيئًا. ووقع هذا فعلًا (٢٠٢٦-٠٨-١٦).
 *
 * فالطريق طريقان: الحديثةُ أوّلًا، فإن غابت أو رُدّت فحقلٌ خفيٌّ و`execCommand('copy')` العتيقة
 * (تعمل على http). و**يُرمى الخطأ عند فشل الطريقين** فلا يظنّ النداءُ أنّه نسخ ولم ينسخ:
 * توقيعٌ يوافق ما كانت عليه النداءات المباشرة، فمن استبدلها به لم يغيّر منطقَه.
 */
export async function copyText(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch { /* غيابُ الإذن أو السياق ⇒ الطريق العتيق أدناه */ }
  }

  // الحقلُ يجب أن يكون **في المستند ومرئيًّا للمتصفّح** كي يصحّ التحديد؛ يُخفى بالموضع لا
  // بـ`display:none`. و`readOnly` يمنع لوحةَ مفاتيح الجوّال من القفز عند التركيز.
  const area = document.createElement("textarea");
  area.value = text;
  area.readOnly = true;
  area.setAttribute("aria-hidden", "true");
  area.style.cssText = "position:fixed;top:-1000px;left:-1000px;opacity:0";
  document.body.appendChild(area);
  try {
    area.focus();
    area.setSelectionRange(0, area.value.length);
    if (!document.execCommand("copy")) throw new Error("تعذّر النسخ.");
  } finally {
    area.remove();
  }
}
