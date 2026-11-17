"use client";

/**
 * **سلوكُ محرّر تصميم الباركود** (٢٠٢٦-١١-١٦): الحالُ والمواصفةُ والمعاينةُ والحفظُ التلقائيُّ المصفوفُ والتنزيلان — منقولةٌ من `QrToolView`
 * حرفًا لتقرأها غرفةُ الهويّة الجديدة (`_ad/rooms/QrDesignRoom`) بلا أن يتغيّر من السلوك شيء. والقديمُ باقٍ كما هو حتى يُعتمد الجديد.
 * العللُ مكتوبةٌ في القديم بأطول من هذا: البذرةُ من `look`، والمحفورُ رابطُ الرمز القصير دائمًا، والبصمةُ من المواصفة المبنيّة، والحفظُ
 * لا يتسابق (واحدٌ في الطريق ومن جاء بعده يُؤجَّل)، والتلقائيُّ بمهلة سكونٍ وسقفِ انتظار، وما لم يسكن يُحفظ عند المغادرة.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { qrPng, qrSvg, qrSvgBlob, type Paint, type QrFramePlace, type QrFrameStyle, type QrSpec } from "@/lib/qr";
import { qrShortUrl } from "@/lib/qrLinks";
import { downloadBlob } from "@/lib/download";
import { UPLOAD_RULES, checkFile } from "@/lib/upload";
import { look } from "./look";
import type { QrSpecSaver } from "./QrToolView";

export const QR_LOGO_RULE = UPLOAD_RULES.qrLogo;
/** اسمُ شعار أدِيب حين يُختار: به يُعرف أنّه المختار فلا يُعرض زرُّه */
export const BRAND_LOGO = "شعار أدِيب";
const IDLE_MS = 1500;
const MAX_WAIT_MS = 5000;
export const QR_PREVIEW = 360;
/** أقصى ضلعٍ للشعار المخزَّن بالبكسل (كما كان) */
const LOGO_PX = 640;

/** المرفوعُ ليس المحفوظ: يُصغَّر في المتصفّح قبل أن يُضمَّن (كما كان في `QrToolView`) */
async function shrinkLogo(file: File): Promise<{ href: string }> {
  const raw = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(typeof r.result === "string" ? r.result : "");
    r.onerror = () => rej(new Error("read"));
    r.readAsDataURL(file);
  });
  if (file.type === "image/svg+xml") return { href: raw };
  const img = new Image();
  img.src = raw;
  await img.decode();
  const side = Math.max(img.naturalWidth, img.naturalHeight);
  if (side <= LOGO_PX && raw.length < 120_000) return { href: raw };
  const k = Math.min(1, LOGO_PX / side);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * k));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * k));
  const ctx = canvas.getContext("2d");
  if (!ctx) return { href: raw };
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const out = canvas.toDataURL("image/webp", 0.9);
  return { href: out.length < raw.length ? out : raw };
}

export function useQrDesign({ code, title, initial, onSaveSpec }: { code: string; title?: string; initial?: QrSpec | null; onSaveSpec?: QrSpecSaver }) {
  const [seed] = useState(() => look(initial));
  const fileStem = title?.trim() || "باركود-أديب";
  const [saving, setSaving] = useState(false);

  const [gradient, setGradient] = useState(seed.gradient);
  const [ink, setInk] = useState(seed.ink);
  const [ink2, setInk2] = useState(seed.ink2);
  const [gradKind, setGradKind] = useState<"linear" | "radial">(seed.gradKind);
  const [angle, setAngle] = useState(seed.angle);
  const [cx, setCx] = useState(seed.cx);
  const [cy, setCy] = useState(seed.cy);
  const [hasBg, setHasBg] = useState(seed.hasBg);
  const [bg, setBg] = useState(seed.bg);
  const [eyeTinted, setEyeTinted] = useState(seed.eyeTinted);
  const [eyeColor, setEyeColor] = useState(seed.eyeColor);
  const [pupilColor, setPupilColor] = useState(seed.pupilColor);
  const [logo, setLogo] = useState<string | null>(seed.logo);
  const [logoOk, setLogoOk] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  // اسمُ الشعار الحاليّ ليُقال في صفّه (عرضٌ لا سلوك): المحفوظُ من قبلُ لا اسمَ له فيبقى فارغًا
  const [logoName, setLogoName] = useState<string | null>(null);
  const [framed, setFramed] = useState(seed.framed);
  const [frameStyle, setFrameStyle] = useState<QrFrameStyle>(seed.frameStyle);
  const [framePlace, setFramePlace] = useState<QrFramePlace>(seed.framePlace);
  const [caption, setCaption] = useState(seed.caption);
  const [frameColor, setFrameColor] = useState(seed.frameColor);
  const [captionColor, setCaptionColor] = useState(seed.captionColor);

  const payload = qrShortUrl(code);
  const paint = useMemo((): Paint => (!gradient ? { kind: "solid", color: ink }
    : gradKind === "radial" ? { kind: "radial", from: ink, to: ink2, cx, cy } : { kind: "linear", from: ink, to: ink2, angle }),
  [gradient, gradKind, ink, ink2, angle, cx, cy]);
  const spec = useMemo((): QrSpec => ({
    text: payload,
    size: seed.size,
    dots: { shape: seed.dotsShape, paint },
    eye: { shape: seed.eyeShape, color: eyeTinted ? eyeColor : null },
    pupil: { shape: seed.pupilShape, color: eyeTinted ? pupilColor : null },
    bg: hasBg ? bg : null,
    logo: logo ? { href: logo, scale: seed.logoScale } : null,
    frame: framed ? { color: frameColor, caption, textColor: captionColor, style: frameStyle, place: framePlace } : null,
  }), [payload, seed, paint, eyeTinted, eyeColor, pupilColor, hasBg, bg, logo, framed, frameStyle, framePlace, frameColor, caption, captionColor]);

  const preview = useMemo(() => {
    try {
      return { svg: qrSvg({ ...spec, size: QR_PREVIEW }), error: null as string | null };
    } catch (e) {
      return { svg: null as string | null, error: e instanceof Error ? e.message : "تعذّر توليد الباركود." };
    }
  }, [spec]);

  const pickLogo = (file: File) => {
    const why = checkFile(file, QR_LOGO_RULE);
    if (why) { setLogoOk(null); setLogoError(`${why}. الشعارُ يُضمَّن في كلّ نسخةٍ من الرمز، فاختر ملفًّا أخفّ`); return; }
    void (async () => {
      try {
        const { href } = await shrinkLogo(file);
        setLogo(href);
        setLogoName(file.name);
        setLogoError(null);
        setLogoOk(`أُدرج «${file.name}» في قلب الباركود`);
      } catch {
        setLogoOk(null);
        setLogoError("تعذّرت قراءة الملفّ.");
      }
    })();
  };
  const pickBrandLogo = async () => {
    try {
      const res = await fetch("/brand/logo-vertical.svg");
      if (!res.ok) throw new Error();
      const svg = await res.text();
      setLogo(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
      setLogoName(BRAND_LOGO);
      setLogoError(null);
    } catch {
      setLogoError("تعذّر جلب شعار أدِيب من أصول العلامة.");
    }
  };
  const clearLogo = () => { setLogo(null); setLogoName(null); setLogoOk(null); };

  const [dlError, setDlError] = useState<string | null>(null);
  const savePng = async () => {
    try { setDlError(null); downloadBlob(await qrPng(spec), `${fileStem}.png`, "qr.png"); }
    catch { setDlError("تعذّر رسمُ الصورة. جرّب مرّةً أخرى، وإن تكرّر فأزِل الشعار ثمّ أعِد المحاولة."); }
  };
  const saveSvg = () => {
    try { setDlError(null); downloadBlob(qrSvgBlob(spec), `${fileStem}.svg`, "qr.svg"); }
    catch { setDlError("تعذّر إخراجُ الملفّ. جرّب مرّةً أخرى."); }
  };

  const [savedFingerprint, setSavedFingerprint] = useState(() => JSON.stringify(spec));
  const dirty = !!onSaveSpec && JSON.stringify(spec) !== savedFingerprint;
  const specRef = useRef(spec);
  const savedRef = useRef(savedFingerprint);
  useEffect(() => { specRef.current = spec; savedRef.current = savedFingerprint; }, [spec, savedFingerprint]);
  const inFlight = useRef(false);
  const queued = useRef(false);
  const saveRef = useRef<(silent?: boolean) => Promise<void>>(async () => {});
  const saveDesign = useCallback(async (silent = false): Promise<void> => {
    if (!onSaveSpec) return;
    if (inFlight.current) { queued.current = true; return; }
    inFlight.current = true;
    setSaving(true);
    const snapshot = specRef.current;
    const print = JSON.stringify(snapshot);
    const res = await onSaveSpec(snapshot, { silent });
    inFlight.current = false;
    setSaving(false);
    if (res.ok) setSavedFingerprint(print);
    const again = queued.current && JSON.stringify(specRef.current) !== print;
    queued.current = false;
    if (again) void saveRef.current(true);
  }, [onSaveSpec]);
  useEffect(() => { saveRef.current = saveDesign; }, [saveDesign]);

  const firstDirtyAt = useRef<number | null>(null);
  useEffect(() => {
    if (!dirty) { firstDirtyAt.current = null; return; }
    if (firstDirtyAt.current === null) firstDirtyAt.current = Date.now();
    const waited = Date.now() - firstDirtyAt.current;
    const delay = Math.max(0, Math.min(IDLE_MS, MAX_WAIT_MS - waited));
    const t = setTimeout(() => { firstDirtyAt.current = null; void saveDesign(true); }, delay);
    return () => clearTimeout(t);
  }, [spec, dirty, saveDesign]);
  useEffect(() => {
    if (!onSaveSpec) return;
    const flush = () => { if (JSON.stringify(specRef.current) !== savedRef.current) void saveDesign(true); };
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [onSaveSpec, saveDesign]);

  return {
    spec, preview, dirty, saving, saveDesign, savePng, saveSvg, dlError,
    gradient, setGradient, ink, setInk, ink2, setInk2, gradKind, setGradKind, angle, setAngle, cx, cy, setCx, setCy,
    hasBg, setHasBg, bg, setBg, eyeTinted, setEyeTinted, eyeColor, setEyeColor, pupilColor, setPupilColor,
    logo, logoName, logoOk, logoError, pickLogo, pickBrandLogo, clearLogo,
    framed, setFramed, frameStyle, setFrameStyle, framePlace, setFramePlace, caption, setCaption, frameColor, setFrameColor, captionColor, setCaptionColor,
  };
}
