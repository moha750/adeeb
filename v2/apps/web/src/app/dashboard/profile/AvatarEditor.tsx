"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, IconButton, Modal } from "@adeeb/design-system";
import { MagnifyingGlassMinus, MagnifyingGlassPlus } from "@phosphor-icons/react";
import { ArrowCounterClockwise } from "@/app/_components/glyphs";
import { Trash, UploadSimple } from "@/app/_components/glyphs";
import { Avatar } from "../_components/Avatar";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { useToast } from "../_components/ToastProvider";
import { removeMyAvatar, uploadMyAvatar } from "./actions";
import { UPLOAD_RULES, checkFile } from "@/lib/upload";

// وصفةُ أصل الأفتار من قانون المرفقات (`lib/upload`)
const SOURCE_RULE = UPLOAD_RULES.avatarSource;

/** ضلع مربّع المعاينة (بكسل CSS) — والخارج عنه هو المقصوص. */
const VIEW = 300;
/** ضلع الصورة المحفوظة — الأفتار لا يتجاوز ‎96px‎ في أكبر مقاساته، فالضِّعف الخماسيّ فوق الكفاية. */
const OUT = 512;
/** أقصى تكبيرٍ فوق «ما يملأ المربّع» — أبعدُ منه يُحوّل الوجه إلى بكسلات. */
const MAX_ZOOM = 5;
/** ما يقبله المتصفّح رسمًا — و«ما يُحفظ» صيغةٌ واحدة (WEBP) مهما كان الأصل. */
/** حدُّ الأصل قبل القصّ — الناتج يخرج نحو ٦٠ ك.ب مهما كبر الوارد، فالحدّ للذاكرة لا للتخزين. */

type Frame = { scale: number; x: number; y: number };

/** زاوية الأفتار من رمز الهوية — لا رقمَ محفور: المربّع المقصوص يُعاين بزاوية ما سيصير إليه. */
function radiusToken(): number {
  if (typeof window === "undefined") return 16;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--radius").trim();
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : 16;
}

/** أصغرُ تكبيرٍ **يملأ** المربّع — دونه تظهر فجوةٌ في وجهٍ لا خلفيّة له. */
const coverScale = (w: number, h: number) => Math.max(VIEW / w, VIEW / h);

/** يردّ الإزاحة إلى ما يُبقي المربّع مملوءًا — فلا يُفلت الوجه من إطاره بالسحب. */
function clampFrame(img: { width: number; height: number }, f: Frame): Frame {
  const w = img.width * f.scale;
  const h = img.height * f.scale;
  return {
    scale: f.scale,
    x: Math.min(0, Math.max(VIEW - w, f.x)),
    y: Math.min(0, Math.max(VIEW - h, f.y)),
  };
}

/**
 * **الصورة الشخصيّة — اختيارٌ فقصٌّ فرفع.**
 *
 * القصّ يقع في المتصفّح: يُرسَم الأصل في `canvas` مقصوصًا بزاوية الأفتار نفسها، فما تراه
 * في المربّع هو ما يُحفظ حرفًا بحرف. ثمّ يخرج ‎512×512‎ بصيغة WEBP — فيصل الخادمَ ملفٌّ
 * صغيرٌ مربّعٌ مهما كان الأصل، ولا تُرفَع عشرةُ ميغابايتٍ لتُعرَض في ‎44px‎.
 *
 * **ولا لوحة تنسيقٍ لهذا كلّه:** المربّعُ والقناعُ مرسومان **داخل** الكانفس نفسه (قصٌّ
 * بـ`roundRect` من رمز `--radius`)، والأزرارُ من المكتبة — فلا صنفَ شاردًا ولا مكوّنَ
 * جديدًا يُخترَع لشاشةٍ واحدة (ق١).
 */
export function AvatarEditor({ name, gender, avatar }: { name: string; gender: "male" | "female" | null; avatar: string | null }) {
  const toast = useToast();
  const router = useRouter();
  const pick = useRef<HTMLInputElement>(null);
  // مرجعٌ **دالّيّ** لا `useRef` وحدَه: النافذة تُركّب محتواها بعد دورةٍ من فتحها (`mounted` في
  // `Dialog` يُضبط داخل تأثير)، فتأثيرُ الرسم المعلّق على الصورة وحدها كان يجري على مرجعٍ فارغ
  // ثمّ لا يعود — فيبقى المربّع بلا رسم حتى أوّل سحبة. فتركيبُ الكانفس نفسُه تبعيّةٌ تُشعل الرسم.
  //
  // **واللوحُ في مرجعٍ والخبرُ في حالة**، لا اللوحُ نفسُه في حالة: مقاسُ الكانفس يُكتَب فيه
  // كتابةً (`canvas.width`)، والكتابةُ في قيمةٍ خرجت من `useState` تكسر قاعدةَ الجمود
  // (`immutability`) — فالحالةُ تُبدَّل بالضابط لا تُعدَّل. فالحالةُ هنا **علمُ حضورٍ** لا أكثر.
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const attachCanvas = useCallback((el: HTMLCanvasElement | null) => {
    canvasRef.current = el;
    setCanvasReady(el !== null);
  }, []);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [frame, setFrame] = useState<Frame>({ scale: 1, x: 0, y: 0 });
  const [saving, startSave] = useTransition();
  const [killing, startKill] = useTransition();
  const [confirmKill, setConfirmKill] = useState(false);

  /** إغلاقٌ يُحرّر الرابط المؤقّت — وإلّا بقيت الصورة في الذاكرة بعد انصراف صاحبها. */
  const close = useCallback(() => {
    setImg((prev) => {
      if (prev) URL.revokeObjectURL(prev.src);
      return null;
    });
  }, []);

  const onPick = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    // بوّابةٌ واحدةٌ للموقع كلِّه (`lib/upload`) — لا جملةً خاصّةً بهذه الشاشة
    const why = checkFile(file, SOURCE_RULE);
    if (why) { toast.error(why); return; }

    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => {
      const scale = coverScale(el.naturalWidth, el.naturalHeight);
      // تبدأ من الوسط: أكثرُ الصور وجهُها في وسطها
      setFrame({ scale, x: (VIEW - el.naturalWidth * scale) / 2, y: (VIEW - el.naturalHeight * scale) / 2 });
      setImg(el);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("تعذّر قراءة هذه الصورة. جرّب صيغة JPG أو PNG أو WEBP.");
    };
    el.src = url;
  };

  /** يرسم الأصل مقصوصًا بزاوية الأفتار — في المعاينة وفي الملفّ المحفوظ سواء. */
  const paint = useCallback((ctx: CanvasRenderingContext2D, source: HTMLImageElement, f: Frame, side: number) => {
    const k = side / VIEW;
    ctx.clearRect(0, 0, side, side);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, side, side, radiusToken() * k);
    ctx.clip();
    ctx.drawImage(source, f.x * k, f.y * k, source.naturalWidth * f.scale * k, source.naturalHeight * f.scale * k);
    ctx.restore();
  }, []);

  // المعاينة — تُعاد بكلّ سحبةٍ وتكبير، بدقّة الشاشة لا بدقّة CSS (فلا تخرج مشوّشة على الشاشات الحادّة)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = VIEW * dpr;
    canvas.height = VIEW * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint(ctx, img, frame, VIEW);
  }, [canvasReady, img, frame, paint]);

  /** التكبير حول **وسط المربّع** لا حول ركنه — فيبقى ما تنظر إليه في مكانه. */
  const zoomBy = useCallback((k: number) => {
    setFrame((f) => {
      if (!img) return f;
      const min = coverScale(img.naturalWidth, img.naturalHeight);
      const next = Math.min(min * MAX_ZOOM, Math.max(min, f.scale * k));
      const r = next / f.scale;
      const c = VIEW / 2;
      return clampFrame(
        { width: img.naturalWidth, height: img.naturalHeight },
        { scale: next, x: c - (c - f.x) * r, y: c - (c - f.y) * r },
      );
    });
  }, [img]);

  // عجلة الفأرة تكبّر ولا تُمرّر الصفحة — ولذلك تُربَط يدويًّا بـ`passive: false`
  // (React تربط `onWheel` سلبيًّا، فـ`preventDefault` فيها لا يعمل ويُنذر في الطرفيّة).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1);
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [canvasReady, img, zoomBy]);

  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !img) return;
    // الشاشة الضيّقة تُصغّر المربّع المعروض (`maxWidth`) دون إحداثيّاته — فتُقاس السحبة بنسبته
    // المعروضة، وإلّا مشت الصورة أبطأ من الإصبع.
    const shown = e.currentTarget.getBoundingClientRect().width || VIEW;
    const k = VIEW / shown;
    const dx = (e.clientX - d.x) * k;
    const dy = (e.clientY - d.y) * k;
    drag.current = { id: d.id, x: e.clientX, y: e.clientY };
    // السحب مع اتّجاه المؤشّر: الصفحة عربيّةٌ لكنّ الكانفس لوحةٌ لا نصّ، فلا انعكاس
    setFrame((f) => clampFrame({ width: img.naturalWidth, height: img.naturalHeight }, { ...f, x: f.x + dx, y: f.y + dy }));
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };

  const reset = () => {
    if (!img) return;
    const scale = coverScale(img.naturalWidth, img.naturalHeight);
    setFrame({ scale, x: (VIEW - img.naturalWidth * scale) / 2, y: (VIEW - img.naturalHeight * scale) / 2 });
  };

  const save = () => {
    if (!img) return;
    const out = document.createElement("canvas");
    out.width = OUT;
    out.height = OUT;
    const ctx = out.getContext("2d");
    if (!ctx) { toast.error("تعذّر تجهيز الصورة في هذا المتصفّح."); return; }
    paint(ctx, img, frame, OUT);

    out.toBlob((blob) => {
      if (!blob) { toast.error("تعذّر تجهيز الصورة."); return; }
      const fd = new FormData();
      fd.append("file", new File([blob], "avatar.webp", { type: "image/webp" }));
      startSave(async () => {
        const r = await uploadMyAvatar(fd);
        if (r.ok) {
          toast.success(r.message);
          close();
          router.refresh();
        } else toast.error(r.message);
      });
    }, "image/webp", 0.9);
  };

  const kill = () => {
    startKill(async () => {
      const r = await removeMyAvatar();
      if (r.ok) {
        toast.success(r.message);
        setConfirmKill(false);
        router.refresh();
      } else toast.error(r.message);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar name={name} src={avatar ?? undefined} gender={gender} size="2xl" />
      <div className="flex flex-col items-start gap-2">
        {/* «حذف» لا يظهر لمن لا صورة له — زرٌّ لا يفعل شيئًا وعدٌ كاذب */}
        <span className="btn-row">
          <Button variant="ghost" size="md" onClick={() => pick.current?.click()}>
            <UploadSimple size={18} aria-hidden />
            {avatar ? "تغيير الصورة" : "رفع صورة"}
          </Button>
          {avatar ? (
            <Button variant="ghost-danger" size="md" onClick={() => setConfirmKill(true)}>
              <Trash size={18} aria-hidden />
              حذف الصورة
            </Button>
          ) : null}
        </span>
        <span className="fld-help">صورةٌ مربّعة تُقصّ هنا قبل الرفع، تظهر في اللوحة وفي كشوف أعضاء أديب.</span>
      </div>

      <input
        ref={pick}
        type="file"
        accept={SOURCE_RULE.accept}
        hidden
        onChange={(e) => { onPick(e.target.files); e.target.value = ""; }}
      />

      <Modal
        open={img !== null}
        onClose={close}
        busy={saving}
        title="قصّ صورتك"
        description="اسحب الصورة لتضبط موضعها، وكبّرها بالعجلة أو بالزرّين. ما يظهر في المربّع هو ما يُحفظ."
        size="sm"
        // جسمٌ متوسّط: اللوح وأزرارُه بمقاسهما الطبيعيّ في وسط النافذة، لا ممتدَّين على الصفّ
        className="mdl-center"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={close} disabled={saving}>إلغاء</Button>
            <Button variant="primary" size="md" loading={saving} onClick={save}>حفظ الصورة</Button>
          </>
        }
      >
        <canvas
          ref={attachCanvas}
          className="touch-none cursor-move"
          style={{ width: VIEW, height: VIEW, maxWidth: "100%" }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          aria-label="معاينة قصّ الصورة"
          role="img"
        />
        <div className="flex items-center gap-2">
          <IconButton size="md" aria-label="تصغير" title="تصغير" onClick={() => zoomBy(1 / 1.2)}>
            <MagnifyingGlassMinus aria-hidden />
          </IconButton>
          <IconButton size="md" aria-label="تكبير" title="تكبير" onClick={() => zoomBy(1.2)}>
            <MagnifyingGlassPlus aria-hidden />
          </IconButton>
          <IconButton size="md" aria-label="إعادة الضبط" title="إعادة الضبط" onClick={reset}>
            <ArrowCounterClockwise aria-hidden />
          </IconButton>
        </div>
      </Modal>

      {/* الحذف صُلبٌ لا رجعةَ فيه — الملفّ يُمحى من التخزين، فيُقال ذلك قبل الضغط لا بعده */}
      <ConfirmDialog
        open={confirmKill}
        onClose={() => setConfirmKill(false)}
        tone="danger"
        icon={<Trash />}
        title="حذف صورتك؟"
        text="تُحذف نهائيًّا ولا نسخة منها، ويعود مكانها أيقونتك. ويمكنك رفع غيرها متى شئت."
        confirmLabel="حذف الصورة"
        loading={killing}
        onConfirm={kill}
      />
    </div>
  );
}
