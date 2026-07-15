# ‎@adeeb/design-system — نظام رموز نادي أديب

المصدر الوحيد لهوية أديب على الويب (ولاحقًا الجوال). مبني على **العلامة الرسمية**:
اللون الأساسي كحلي **#274060** + الثانوي فولاذي **#335C81**، وخطّا **Lyon Arabic** (عربي) + **Eras** (لاتيني).

## الملفات
| الملف | الدور |
|------|-------|
| `tokens.css` | كل الرموز كمتغيّرات CSS (ألوان، طباعة، مسافات، زوايا، ظلال، حركة) + الوضع الداكن. **⚠️ المصدر الوحيد — لا تُعرّف `:root` في مكان آخر.** |
| `fonts.css` | تعريف `@font-face` واحد لخطوط العلامة (يستبدل 13 تعريفًا والاختصارات `fr/fb/fbb`). |
| `tailwind.preset.js` | ربط أدوات Tailwind بالرموز (لتطبيق Next.js). |
| `tokens.ts` | نفس القيم كـ TS (لـ React Native مستقبلًا). |
| `components.css` | مكتبة المكوّنات (المصدر المشترك) — أصناف `.abtn`/`.mdl`/… يستهلكها التطبيق ومعرض `/ui` الحيّ. |
| `fonts/` | ملفات الخطوط (Lyon ×5 · Eras ×4) بأسماء واضحة. |
| `brand/` | الشعار (أفقي/عمودي + أبيض) والباترن (خطّي/دائري + أبيض) بصيغة SVG. |

## الاستخدام (لاحقًا في `apps/web`)
```css
@import "@adeeb/design-system/fonts.css";
@import "@adeeb/design-system/tokens.css";
```
```js
// tailwind.config.js
module.exports = { presets: [require('@adeeb/design-system/tailwind.preset')] };
```
ثم استخدم `bg-primary`، `text-content-muted`، `font-display`، `rounded-lg`، `shadow-md` … كلها تشير للرموز.

## ينمو باستمرار
هذه **الطبقة الأساس**. تُبنى فوقها مكتبة مكوّنات تتوسّع تدريجيًا: أزرار، حقول، **بطاقات**،
**إشعارات/Toasts**، نوافذ، تبويبات، جداول، شارات، Avatar… كلٌّ من الرموز نفسها، فيبقى كل شيء متّسقًا.

> يستبدل هذا النظامُ ملفَّ `admin/css/design-tokens.css` القديم ويعمّمه على الموقع كله.
> القيم الرسمية مصدرها `Adeeb Visual identity/palette.md`.
