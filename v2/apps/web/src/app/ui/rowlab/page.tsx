/**
 * **معرضُ نماذجَ خارجَ الهويّة** — بأمر المالك ٢٠٢٦-٠٩-٠٧ بعد أن رُدَّت ثلاثُ جولاتٍ
 * داخلها: «صمّم لي معاينةً احترافيّةً جميلةً خارجَ الهويّة تمامًا، أبغى أشوف نماذج».
 *
 * فهذه خمسةُ عوالمَ بصريّةٍ مستقلّة، لكلٍّ لوحُ ألوانه وخطُّه وسلّمُ تباعده — لا تستعمل
 * `tokens.css` ولا `components.css` بحال. وأنماطُها **محبوسةٌ في هذه الصفحة** (وسمُ
 * `<style>` واحدٌ بمحدِّداتٍ مسبوقةٍ بـ`lab-`) كي لا يتسرّب حرفٌ منها إلى المكتبة، فيبقى
 * قانونُ المصدر الواحد سليمًا مهما رُدَّت هذه أو اعتُمدت.
 *
 * والبياناتُ هي هي في الخمسة: ثلاثةُ شركاءَ في باركود. **يُختار واحدٌ ثمّ يُترجَم إلى
 * الهويّة** (أو يُقرّ خارجَها بأمره)، وتُحذف هذه الصفحةُ بعدها.
 */

const PEOPLE = [
  { n: "أَدِيب", s: "الحساب الرسميّ للنادي", r: "يقرأ", i: "أ" },
  { n: "بشائر فاروق الحداد", s: "رئيسة المجلس التنفيذيّ", r: "يحرّر", i: "ب" },
  { n: "نورة الدوسري", s: "قائدة لجنة الإعلام", r: "يقرأ", i: "ن" },
];

const CSS = `
.lab { --pad: 40px; background: #f6f7f9; padding: var(--pad); }
.lab-h { font: 700 13px/1.4 ui-sans-serif, system-ui, sans-serif; letter-spacing: .06em; color: #8a94a6; margin: 0 0 14px; }
.lab-wrap + .lab-wrap { margin-top: 56px; }

/* ══ النموذج أ، هدوء ══ لوحٌ أبيضُ صارمُ المقاس، خطٌّ نظاميّ، رمادٌ باردٌ وحبرٌ قاتم. */
.a { direction: rtl; font-family: ui-sans-serif, system-ui, "Segoe UI", sans-serif; background: #fff; border: 1px solid #e7e9ee; border-radius: 12px; overflow: hidden; }
.a-top { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 18px 14px; border-bottom: 1px solid #eff1f4; }
.a-t { margin: 0; font-size: 14px; font-weight: 650; color: #10141c; letter-spacing: -.01em; }
.a-d { margin: 3px 0 0; font-size: 12.5px; color: #6d7684; }
.a-btn { flex-shrink: 0; padding: 7px 13px; font: 600 12.5px/1 inherit; color: #fff; background: #10141c; border: 0; border-radius: 7px; cursor: pointer; }
.a-list { padding: 6px; }
.a-r { display: flex; align-items: center; gap: 11px; padding: 9px 12px; border-radius: 8px; }
.a-r:hover { background: #f7f8fa; }
.a-av { display: grid; place-items: center; flex-shrink: 0; width: 30px; height: 30px; font-size: 12px; font-weight: 650; color: #4b5563; background: #eef0f4; border-radius: 50%; }
.a-tx { flex: 1; min-width: 0; }
.a-n { font-size: 13.5px; font-weight: 600; color: #10141c; }
.a-s { margin-top: 1px; font-size: 12px; color: #79818f; }
.a-role { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; color: #6d7684; }
.a-x { display: grid; place-items: center; width: 26px; height: 26px; color: #aab1bc; background: 0; border: 0; border-radius: 6px; cursor: pointer; }
.a-x:hover { color: #d0342c; background: #fdeeed; }

/* ══ النموذج ب، ورقة ══ بياضٌ واسع، خطوطٌ رفيعةٌ جدًّا، ولونُ فعلٍ بنفسجيٌّ واحد. */
.b { direction: rtl; font-family: ui-sans-serif, system-ui, sans-serif; background: #fff; border-radius: 8px; box-shadow: 0 0 0 1px #e3e8ee, 0 2px 5px -1px rgba(50,50,93,.08), 0 1px 3px -1px rgba(0,0,0,.06); }
.b-top { padding: 22px 26px 18px; }
.b-t { margin: 0; font-size: 15px; font-weight: 650; color: #1a1f36; }
.b-d { margin: 5px 0 0; font-size: 13px; line-height: 1.5; color: #697386; }
.b-r { display: flex; align-items: center; gap: 14px; padding: 15px 26px; border-top: 1px solid #f0f3f6; }
.b-av { display: grid; place-items: center; flex-shrink: 0; width: 34px; height: 34px; font-size: 12.5px; font-weight: 600; color: #635bff; background: #f0efff; border-radius: 8px; }
.b-tx { flex: 1; min-width: 0; }
.b-n { font-size: 14px; font-weight: 600; color: #1a1f36; }
.b-s { margin-top: 2px; font-size: 12.5px; color: #8792a2; }
.b-lbl { font: 600 10.5px/1 inherit; letter-spacing: .09em; color: #8792a2; }
.b-v { margin-top: 5px; font-size: 13px; color: #3c4257; }
.b-a { padding: 0; font: 600 13px/1 inherit; color: #635bff; background: 0; border: 0; cursor: pointer; }
.b-a + .b-a { margin-inline-start: 16px; color: #8792a2; }

/* ══ النموذج ج، لوحٌ داكن ══ سطحٌ ليليّ، حدودٌ خافتة، وأزرقُ باردٌ للفعل. */
.c { direction: rtl; font-family: ui-sans-serif, system-ui, sans-serif; background: #14161b; border: 1px solid #23272f; border-radius: 14px; overflow: hidden; }
.c-top { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 20px; border-bottom: 1px solid #21252c; }
.c-t { margin: 0; font-size: 14.5px; font-weight: 650; color: #eceef1; }
.c-d { margin: 4px 0 0; font-size: 12.5px; color: #8b929d; }
.c-btn { padding: 8px 14px; font: 600 12.5px/1 inherit; color: #0f1115; background: #e8eaee; border: 0; border-radius: 8px; cursor: pointer; }
.c-r { display: flex; align-items: center; gap: 13px; padding: 14px 20px; }
.c-r + .c-r { border-top: 1px solid #1d2128; }
.c-r:hover { background: #181b21; }
.c-av { display: grid; place-items: center; flex-shrink: 0; width: 36px; height: 36px; font-size: 13px; font-weight: 650; color: #cfd4dc; background: linear-gradient(140deg, #2a303b, #1b1f27); border: 1px solid #333a45; border-radius: 50%; }
.c-tx { flex: 1; min-width: 0; }
.c-n { font-size: 14px; font-weight: 600; color: #e9ebee; }
.c-s { margin-top: 2px; font-size: 12.5px; color: #838a95; }
.c-pill { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; font-size: 12.5px; font-weight: 600; color: #c4cad3; background: #1d2128; border: 1px solid #2b313a; border-radius: 999px; cursor: pointer; }
.c-x { display: grid; place-items: center; width: 30px; height: 30px; color: #6f7784; background: 0; border: 0; border-radius: 8px; cursor: pointer; }
.c-x:hover { color: #ff6b60; background: #221a1a; }

/* ══ النموذج د، مجموعات ══ قائمةٌ مجمَّعةٌ على نمط أنظمة الجوّال: سطحٌ رماديٌّ ولوحٌ أبيض. */
.d { direction: rtl; font-family: -apple-system, ui-sans-serif, system-ui, sans-serif; background: #f2f2f7; padding: 20px; border-radius: 16px; }
.d-cap { margin: 0 4px 8px; font-size: 12.5px; font-weight: 500; color: #6c6c70; }
.d-p { background: #fff; border-radius: 12px; overflow: hidden; }
.d-r { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 8px 16px; }
.d-r + .d-r { box-shadow: inset 0 1px 0 #e5e5ea; }
.d-av { display: grid; place-items: center; flex-shrink: 0; width: 34px; height: 34px; font-size: 13px; font-weight: 600; color: #fff; background: #a1a1aa; border-radius: 50%; }
.d-tx { flex: 1; min-width: 0; }
.d-n { font-size: 15px; color: #000; }
.d-s { margin-top: 1px; font-size: 13px; color: #8a8a8e; }
.d-v { font-size: 15px; color: #8a8a8e; }
.d-ch { color: #c7c7cc; }
.d-note { margin: 8px 4px 0; font-size: 12.5px; line-height: 1.45; color: #8a8a8e; }

/* ══ النموذج ه، دافئ ══ ورقٌ كريميّ، زوايا أوسع، ورقائقُ لونٍ هادئة. */
.e { direction: rtl; font-family: ui-serif, Georgia, serif; background: #fffdf9; border: 1px solid #ece7dd; border-radius: 18px; padding: 8px; }
.e-top { padding: 16px 16px 12px; }
.e-t { margin: 0; font-size: 17px; font-weight: 600; color: #2f2a22; }
.e-d { margin: 4px 0 0; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 13px; color: #8a8071; }
.e-r { display: flex; align-items: center; gap: 13px; padding: 12px 16px; border-radius: 12px; font-family: ui-sans-serif, system-ui, sans-serif; }
.e-r:hover { background: #faf6ef; }
.e-av { display: grid; place-items: center; flex-shrink: 0; width: 36px; height: 36px; font-size: 13px; font-weight: 600; color: #7a6a52; background: #f2ece1; border-radius: 11px; }
.e-tx { flex: 1; min-width: 0; }
.e-n { font-size: 14px; font-weight: 600; color: #2f2a22; }
.e-s { margin-top: 2px; font-size: 12.5px; color: #9a8f7e; }
.e-chip { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; font-size: 12.5px; font-weight: 600; color: #6b5f4b; background: #f4efe6; border: 1px solid #e8e0d2; border-radius: 999px; cursor: pointer; }
.e-x { display: grid; place-items: center; width: 30px; height: 30px; color: #b3a894; background: 0; border: 0; border-radius: 9px; cursor: pointer; }
.e-x:hover { color: #b4442f; background: #f7ece8; }
`;

const Chev = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const X = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const Arrow = () => (
  <svg width="8" height="13" viewBox="0 0 8 13" fill="none" aria-hidden>
    <path d="M6.5 1L1.5 6.5 6.5 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function RowLab() {
  return (
    <div className="lab">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="lab-wrap">
        <p className="lab-h">النموذج أ، هدوء</p>
        <div className="a">
          <div className="a-top">
            <div>
              <h3 className="a-t">شركاء الباركود</h3>
              <p className="a-d">الملكيّة تبقى لك، والشريك يقرأ أو يحرّر بحسب إذنك.</p>
            </div>
            <button type="button" className="a-btn">أضِف شريكًا</button>
          </div>
          <div className="a-list">
            {PEOPLE.map((p) => (
              <div className="a-r" key={p.n}>
                <span className="a-av">{p.i}</span>
                <span className="a-tx">
                  <div className="a-n">{p.n}</div>
                  <div className="a-s">{p.s}</div>
                </span>
                <button type="button" className="a-role">{p.r} <Chev /></button>
                <button type="button" className="a-x" aria-label="إخراج"><X /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lab-wrap">
        <p className="lab-h">النموذج ب، ورقة</p>
        <div className="b">
          <div className="b-top">
            <h3 className="b-t">شركاء الباركود</h3>
            <p className="b-d">الملكيّة تبقى لك، والشريك يقرأ أو يحرّر بحسب إذنك. وكلّ تغيير يُقيَّد في السجلّ باسم فاعله.</p>
          </div>
          {PEOPLE.map((p) => (
            <div className="b-r" key={p.n}>
              <span className="b-av">{p.i}</span>
              <span className="b-tx">
                <div className="b-n">{p.n}</div>
                <div className="b-s">{p.s}</div>
              </span>
              <span>
                <div className="b-lbl">الإذن</div>
                <div className="b-v">{p.r}</div>
              </span>
              <span>
                <button type="button" className="b-a">تغيير</button>
                <button type="button" className="b-a">إخراج</button>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="lab-wrap">
        <p className="lab-h">النموذج ج، لوحٌ داكن</p>
        <div className="c">
          <div className="c-top">
            <div>
              <h3 className="c-t">شركاء الباركود</h3>
              <p className="c-d">ثلاثةُ شركاء، والملكيّة لك.</p>
            </div>
            <button type="button" className="c-btn">أضِف شريكًا</button>
          </div>
          {PEOPLE.map((p) => (
            <div className="c-r" key={p.n}>
              <span className="c-av">{p.i}</span>
              <span className="c-tx">
                <div className="c-n">{p.n}</div>
                <div className="c-s">{p.s}</div>
              </span>
              <button type="button" className="c-pill">{p.r} <Chev /></button>
              <button type="button" className="c-x" aria-label="إخراج"><X /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="lab-wrap">
        <p className="lab-h">النموذج د، مجموعات</p>
        <div className="d">
          <p className="d-cap">شركاء الباركود</p>
          <div className="d-p">
            {PEOPLE.map((p) => (
              <div className="d-r" key={p.n}>
                <span className="d-av">{p.i}</span>
                <span className="d-tx">
                  <div className="d-n">{p.n}</div>
                  <div className="d-s">{p.s}</div>
                </span>
                <span className="d-v">{p.r}</span>
                <span className="d-ch"><Arrow /></span>
              </div>
            ))}
          </div>
          <p className="d-note">الملكيّة تبقى لك. الشريك الذي يقرأ يرى الإحصاء فقط، والذي يحرّر يبدّل الوجهة والتصميم والحالة والجدولة.</p>
        </div>
      </div>

      <div className="lab-wrap">
        <p className="lab-h">النموذج ه، دافئ</p>
        <div className="e">
          <div className="e-top">
            <h3 className="e-t">شركاء الباركود</h3>
            <p className="e-d">الملكيّة تبقى لك، والشريك يقرأ أو يحرّر بحسب إذنك.</p>
          </div>
          {PEOPLE.map((p) => (
            <div className="e-r" key={p.n}>
              <span className="e-av">{p.i}</span>
              <span className="e-tx">
                <div className="e-n">{p.n}</div>
                <div className="e-s">{p.s}</div>
              </span>
              <button type="button" className="e-chip">{p.r} <Chev /></button>
              <button type="button" className="e-x" aria-label="إخراج"><X /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
