"use client";

import { useState, type ReactNode } from "react";
import { Badge, Button, Card, CardBody, CardHeader, Container, IconButton, Segmented } from "@adeeb/design-system";
import { Envelope, Key, Lock, UsersThree } from "@phosphor-icons/react";
import { CaretDown, Trash } from "@/app/_components/glyphs";
import { Avatar } from "../../dashboard/_components/Avatar";

/**
 * **مختبرُ صفّ الإعدادات، الجولةُ الثانية.**
 *
 * رُدَّت الجولةُ الأولى كلُّها («كلٌّ أقبحُ من الآخر»)، وأذِن المالك بالخروج عن الهويّة
 * طلبًا لصنعةٍ أعلى. والتشخيصُ الذي بُنيت عليه هذه: العلّةُ ليست الفراغَ الذي شكا منه،
 * بل ثلاثةٌ يصنعه أحدُها — **صفٌّ بلا مرساةٍ في بدايته**، و**سطرٌ واحدٌ** تتنازعه التسميةُ
 * والخبر، و**زرٌّ مؤطَّرٌ ثقيلٌ** في الحافّة المقابلة.
 *
 * ويُعتمد واحدٌ ثمّ تُعدَم البقيّة: لا تبقى أربعُ طرائقَ لصفٍّ واحد.
 */

type Row = {
  label: string;
  value: ReactNode;
  sub: string;
  action: ReactNode;
  avatar?: string;
  icon?: ReactNode;
  /** ما يقوله الضابطُ الآن: كلمةٌ واحدةٌ تصف الحالَ الجاري. */
  state: string;
};

const ghost = (label: string, icon: ReactNode, tone?: "danger") => (
  <Button variant={tone === "danger" ? "ghost-danger" : "ghost"} size="sm" className="shrink-0">
    {icon} {label}
  </Button>
);

/** فعلٌ خفيف: نصٌّ وسهمٌ بلا إطار — يُقرأ ضابطًا يُفتح، لا زرًّا يُدقّ. */
const soft = (label: string) => (
  <button type="button" className="abtn abtn-ghost abtn-sm">
    {label} <CaretDown size={14} />
  </button>
);

const SETS: Record<string, { title: string; icon: ReactNode; rows: Row[] }> = {
  shares: {
    title: "شركاءُ الباركود",
    icon: <UsersThree />,
    rows: [
      { label: "أَدِيب", sub: "يفتح الصفحة ويقرأ الإحصاء", value: <Badge tone="neutral" size="sm">يقرأ</Badge>, action: soft("يقرأ"), avatar: "أَدِيب", state: "يقرأ" },
      { label: "بشائر فاروق الحداد", sub: "تبدّل الوجهة والتصميم والحالة", value: <Badge tone="info" size="sm">يحرّر</Badge>, action: soft("يحرّر"), avatar: "بشائر فاروق الحداد", state: "يحرّر" },
    ],
  },
  security: {
    title: "الدخول والأمان",
    icon: <Envelope />,
    rows: [
      { label: "بريدُ دخولك", sub: "mohammad.bin.ismael@gmail.com", value: <span className="font-latin" dir="ltr">mohammad.bin.ismael@gmail.com</span>, action: ghost("تغيير", <Envelope />), icon: <Envelope />, state: "تغيير" },
      { label: "كلمة المرور", sub: "يلزمك إدخال الحاليّة قبل الجديدة", value: "يلزمك إدخال الحاليّة قبل الجديدة.", action: ghost("تغيير", <Lock />), icon: <Lock />, state: "تغيير" },
    ],
  },
  ways: {
    title: "طرق الدخول",
    icon: <Key />,
    rows: [
      { label: "بريدٌ وكلمةُ مرور", sub: "آخرُ دخولٍ 16 يناير 2026", value: "آخرُ دخولٍ 16 يناير 2026.", action: <Badge tone="neutral" size="sm">الأساس</Badge>, icon: <Envelope />, state: "الأساس" },
      { label: "قوقل", sub: "mohammad.bin.ismael@gmail.com، آخرُ دخولٍ 5 أغسطس 2026", value: "آخرُ دخولٍ 5 أغسطس 2026.", action: ghost("فكّ الربط", <Trash />, "danger"), icon: <Key />, state: "مربوط" },
      { label: "أبل", sub: "mohammad.bin.ismael@icloud.com، آخرُ دخولٍ 20 أغسطس 2026", value: "آخرُ دخولٍ 20 أغسطس 2026.", action: ghost("فكّ الربط", <Trash />, "danger"), icon: <Key />, state: "مربوط" },
    ],
  },
};

/** (أ) الحاليّ — للمقارنة. */
function Now({ rows }: { rows: Row[] }) {
  return (
    <div className="setl">
      {rows.map((r) => (
        <div className="flex items-center gap-3" key={r.label}>
          <span className="txt flex min-w-0 flex-1 items-baseline gap-2">
            <b className="shrink-0">{r.label}</b>
            <span className="truncate text-content-muted">{r.value}</span>
          </span>
          {r.action}
        </div>
      ))}
    </div>
  );
}

/** الشكلُ المصقول: مرساةٌ · سطران · ضابطٌ ثابتُ العرض · حذفٌ يُكشَف بالمرور. */
function Polished({ rows }: { rows: Row[] }) {
  return (
    <div className="lrow">
      {rows.map((r) => (
        <div className="lrow-i" key={r.label}>
          {r.avatar ? <Avatar name={r.avatar} size="md" className="shrink-0" /> : <span className="lrow-ic">{r.icon}</span>}
          <span className="lrow-tx">
            <b>{r.label}</b>
            <span>{r.sub}</span>
          </span>
          <span className="lrow-end">
            <Button variant="ghost" size="sm" className="lrow-sel">
              {r.state} <CaretDown size={14} />
            </Button>
            <IconButton tone="danger" size="lg" aria-label={`إخراج ${r.label}`}>
              <Trash />
            </IconButton>
          </span>
        </div>
      ))}
    </div>
  );
}



export default function RowListLab() {
  const [set, setSet] = useState("shares");
  const data = SETS[set];

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Setting Rows</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">صفُّ الإعدادات، مصقولًا</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          الفكرةُ نفسُها والكرتُ نفسُه: قائمةُ صفوفٍ في كرت. وإنّما صُقلت ستُّ تفاصيلَ كانت
          تجعلها تبدو غيرَ منتهية: ارتفاعُ الصفّ، ومرساةٌ في بدايته، وسطران بدل سطر، ولا خطوطَ
          فاصلة، وضابطٌ ثابتُ العرض بدل زرٍّ عائم، وحذفٌ يظهر عند القصد.
        </p>

        <div className="mt-6">
          <Segmented
            wide
            aria-label="البيانات المعروضة"
            value={set}
            onValueChange={setSet}
            items={[
              { value: "shares", label: "شركاء الباركود" },
              { value: "security", label: "الدخول والأمان" },
              { value: "ways", label: "طرق الدخول" },
            ]}
          />
        </div>

        <section className="mt-10">
          <h2 className="font-display text-xl font-black text-content">قبل</h2>
          <div className="card-grid mt-3">
            <Card className="card-full">
              <CardHeader variant="soft" icon={data.icon} title={data.title} />
              <CardBody><Now rows={data.rows} /></CardBody>
            </Card>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-black text-content">بعد</h2>
          <div className="card-grid mt-3">
            <Card className="card-full">
              <CardHeader variant="soft" icon={data.icon} title={data.title} />
              <CardBody><Polished rows={data.rows} /></CardBody>
            </Card>
          </div>
        </section>
      </Container>
    </main>
  );
}
