"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Modal, Select, Stat } from "@adeeb/design-system";
import { Plus } from "@/app/_components/glyphs";
import { fmtDate } from "@/lib/dates";
import { IconNews } from "../../../_shell/icons";
import { EmptyState } from "../../../_components/EmptyState";
import { PageHeader } from "../../../_components/PageHeader";
import { useToast } from "../../../_components/ToastProvider";
import type { HeroNewsOption, HeroNewsRow } from "../data";
import { addHeroNews, moveHeroNews, removeHeroNews } from "../actions";
import { AnnouncementsTabs } from "../AnnouncementsTabs";
import { HeroNewsCard } from "./HeroNewsCard";

/**
 * **الأخبار المعروضة** — شرائحُ عارض الصدر في الصفحة الرئيسية، البابُ الثاني في
 * «اللوحة الإعلانية» (طلبُ المالك ٢٠٢٦-١٠-٠٣: «أضف قسمًا للتحكّم في الأخبار التي تظهر»،
 * ثمّ صار بابًا بمبدّلٍ لا قسمًا تحت الشريط — `AnnouncementsTabs`).
 *
 * كانت أحدثَ أربعةٍ منشورة بلا يدٍ فيها، والمالكُ قال قبلها «نختارها». فصار الاختيارُ
 * جدولًا (`hero_news`) وهذا بابُه، وبُذر بالأربعة التي كانت تُعرَض فلم يتبدّل شيءٌ للزائر.
 *
 * **ولا يُضاف إلّا منشورٌ له غلاف:** العارضُ صورةٌ قبل أن يكون عنوانًا. وخبرٌ أُرشف بعد
 * اختياره يبقى هنا بنغمة التحذير ولا يمرّ، حتّى يُعاد نشرُه أو يُزال.
 *
 * **وكروتٌ بلا مبدّل عرض:** الجدولُ يُسقط الصورة، وهي ما يُرتَّب هنا؛ والقائمةُ أربعٌ
 * أو ستّ تُرى بنظرة، فلا بحثَ ولا فرز. والترتيبُ هنا ترتيبُ المرور هناك.
 */
export function HeroNewsView({
  picked,
  options,
  error,
}: {
  picked: HeroNewsRow[];
  options: HeroNewsOption[];
  error: string | null;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [adding, setAdding] = useState(false);
  const [pick, setPick] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; message: string }>, after?: () => void) => {
    startPending(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message);
        after?.();
        router.refresh();
      } else toast.error(r.message);
    });
  };

  const openAdd = () => {
    setPick("");
    setAdding(true);
  };

  /* «غير متاح» حقًّا حين لا يبقى منشورٌ بغلافٍ خارج العارض (ق٧): الزرُّ يُطفأ ولا يَعِد
     بنافذةٍ قائمتُها فارغة. */
  const cannotAdd = !!error || options.length === 0;
  const live = picked.filter((p) => !p.hidden).length;

  return (
    <>
      <PageHeader
        title="اللوحة الإعلانية"
        crumbLeaf="الأخبار المعروضة"
        action={{ label: "إضافة خبر", icon: <Plus size={18} />, onClick: openAdd, disabled: cannotAdd }}
      />

      <AnnouncementsTabs on="news" />

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <Stat icon={<IconNews />} value={live} label="أخبار معروضة" tone="success" />
      </div>

      {error ? (
        <Alert tone="warning" title="تعذّر جلب الأخبار المعروضة">{error}</Alert>
      ) : picked.length === 0 ? (
        <div className="card-empty">
          <EmptyState
            variant="aurora"
            icon={<IconNews />}
            title="لا أخبار معروضة"
            description="أضِف خبرًا منشورًا يظهر في صدر الصفحة الرئيسية."
            action={
              <Button variant="primary" size="md" onClick={openAdd} disabled={cannotAdd}>
                <Plus size={18} />
                إضافة خبر
              </Button>
            }
          />
        </div>
      ) : (
        <div className="card-grid card-grid-1col">
          {picked.map((row, i) => (
            <HeroNewsCard
              key={row.newsId}
              row={row}
              order={i + 1}
              canUp={i > 0}
              canDown={i < picked.length - 1}
              busy={pending}
              onMove={(dir) => run(() => moveHeroNews(row.newsId, dir))}
              onRemove={() => run(() => removeHeroNews(row.newsId))}
            />
          ))}
        </div>
      )}

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        busy={pending}
        title="إضافة خبر"
        description="يظهر في صدر الصفحة الرئيسية"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setAdding(false)} disabled={pending}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={pending}
              disabled={!pick}
              onClick={() => run(() => addHeroNews(pick), () => setAdding(false))}
            >
              إضافة الخبر
            </Button>
          </>
        }
      >
        <Select
          label="الخبر"
          icon={<IconNews />}
          options={options.map((o) => ({ value: o.id, label: o.title, hint: fmtDate(o.publishedAt) }))}
          value={pick}
          onValueChange={setPick}
          searchable
          required
        />
      </Modal>
    </>
  );
}
