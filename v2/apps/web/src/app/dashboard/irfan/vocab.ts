/**
 * مفرداتُ غرفة «عِرفان» — بلا إطار، فيستوردها الخادمُ والعميل. ورموزُ الردّ توأمُ ما يُرجعه
 * `send_irfan` في القاعدة (`20261017081023_irfan_02_whatsapp_share.sql`).
 */
import type { IrfanCard, IrfanLook } from "@/lib/irfan/card";

export type IrfanResult = { ok: boolean; message: string; id?: number };

/**
 * جوابُ الإرسال: ومعه ما يلزم المتصفّحَ بعده — رابطٌ موقَّعٌ لرفع صورة المعاينة، ورابطُ محادثة
 * القائد في واتساب (`null` إن لم يُفهم رقمُه، فتبقى الرسالةُ في بوّابته وحدها).
 */
export type IrfanSent = IrfanResult & {
  upload?: { path: string; token: string } | null;
  whatsapp?: string | null;
};

export const SEND_ERRORS: Record<string, string> = {
  NOT_MEMBER: "عِرفان لأعضاء أدِيب.",
  CLOSED: "موسمُ عِرفان مغلقٌ الآن.",
  SELF: "لا يُكتب عِرفانٌ للنفس.",
  NOT_LEADER: "لم يعد في مقعد قيادة.",
  LENGTH: "الرسالةُ بين 40 و500 حرف.",
  LOOK: "اختر تصميم البطاقة.",
  ALREADY: "كتبتَ له في هذا الموسم.",
};

export const LOOK_NAMES: Record<IrfanLook, string> = { letter: "رسالة", aurora: "شفق" };

/** رسالةٌ كما تعرضها الغرفة: البطاقةُ جاهزةٌ للرسم، ومعها ما يخصّ الناظر. */
export type IrfanItem = {
  id: number;
  /** وصلتني · أرسلتُها. */
  dir: "in" | "out";
  card: IrfanCard;
  look: IrfanLook;
  at: string;
  unread: boolean;
};

export type IrfanSeason = { id: number; title: string; closesAt: string };

export type IrfanRoomData = {
  season: IrfanSeason | null;
  items: IrfanItem[];
  error: string | null;
};

/** من يُكتب له: قائدٌ في المجلسين، ومعه مقعدُه بجنسه ومجلسُه. */
export type Recipient = { id: string; name: string; gender: "male" | "female" | null; seat: string; council: string; avatar: string | null };
