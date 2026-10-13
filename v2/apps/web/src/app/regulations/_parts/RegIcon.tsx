// رمزُ كلِّ وثيقةٍ من مفردات المنصّة نفسِها (رموزُ اللوحة لأبوابها): الهويّةُ ألّا يُسمّى الشيءُ
// برمزين. ومن مدخل الخادم بوزنه الصريح، فيصلح في الفهرس الخادميّ وفي صفحة الوثيقة معًا.
import {
  BookOpenText,
  Books,
  Certificate,
  Handshake,
  IdentificationBadge,
  ListNumbers,
  Scales,
  Scroll,
  ShieldWarning,
  UserGear,
} from "@phosphor-icons/react/dist/ssr";
import { arCount } from "@/lib/arabicCount";
import { ICON_WEIGHT } from "@/lib/iconWeight";
import { AR_ARTICLE, AR_CHAPTER } from "@/lib/regulations/text";

export function RegIcon({ slug }: { slug: string }) {
  switch (slug) {
    case "constitution":
      return <Scroll weight={ICON_WEIGHT} aria-hidden />;
    case "membership":
      return <IdentificationBadge weight={ICON_WEIGHT} aria-hidden />;
    case "positions":
      return <UserGear weight={ICON_WEIGHT} aria-hidden />;
    case "elections":
      return <Scales weight={ICON_WEIGHT} aria-hidden />;
    case "discipline":
      return <ShieldWarning weight={ICON_WEIGHT} aria-hidden />;
    case "volunteering":
      return <Handshake weight={ICON_WEIGHT} aria-hidden />;
    case "certificates":
      return <Certificate weight={ICON_WEIGHT} aria-hidden />;
    default:
      return <Books weight={ICON_WEIGHT} aria-hidden />;
  }
}

/** عددا الوثيقة كلٌّ برقاقته: الموادُّ ثمّ الأبواب (المالك ٢٠٢٦-١٠-١٣). */
export function RegFacts({ articles, chapters }: { articles: number; chapters: number }) {
  return (
    <span className="reg-facts">
      <span className="reg-fact">
        <span className="tico tico-steel">
          <ListNumbers weight={ICON_WEIGHT} aria-hidden />
        </span>
        {arCount(articles, AR_ARTICLE)}
      </span>
      <span className="reg-fact">
        <span className="tico tico-steel">
          <BookOpenText weight={ICON_WEIGHT} aria-hidden />
        </span>
        {arCount(chapters, AR_CHAPTER)}
      </span>
    </span>
  );
}
