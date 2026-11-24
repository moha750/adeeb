/**
 * **بطاقاتُ جواب ديبو** — الشكلُ كما في اتّفاق الصفحة والعقل (`claude/deebo-answer-contract.md`، ١١-٢٤). كلُّ حقلٍ فيها من القاعدة لا من
 * النموذج: النموذجُ يختار *أيَّ* شيءٍ يُعرض، والخادمُ يملؤه من مصدره. وتغييرُ هذا الشكل يُكتب في الوثيقة أوّلًا.
 */
import type { Turn } from "@/lib/deebo/useDeebo";

export type DeeboCard =
  /** `tag` حبّةُ النوع كما في فهرس الفعاليّات («ورشة»، «أمسية للنساء»)، و`timeLabel` ساعتُها */
  | { kind: "event"; id: string; title: string; startsAt: string; dateLabel?: string; timeLabel?: string; place?: string; image?: string; tag?: string; full?: boolean; past?: boolean; href: string; action?: { label: string; href: string } }
  /** `tag` تصنيفُ الخبر */
  | { kind: "news"; id: string; title: string; publishedAt: string; dateLabel?: string; image?: string; tag?: string; href: string }
  | { kind: "person"; id: string; name: string; seat: string; avatar?: string; gender?: "male" | "female"; href?: string }
  /** `tag` نوعُ المنشور («تقرير سنويّ»)، و`year` سنتُه */
  | { kind: "book"; id: string; title: string; author?: string; cover?: string; tag?: string; year?: string; href: string }
  | { kind: "page"; title: string; description?: string; href: string };

/** الدورُ كما تعرضه الصفحة: دورُ المحادثة ومعه بطاقاتُه إن كانت */
export type ShownTurn = Turn & { cards?: DeeboCard[] };
