"use client";

// عميليّ لا خادميّ — **لا لتفاعلٍ فيه** بل لأنّ أيقونات Phosphor تُنشئ `createContext` عند
// تحميل الوحدة، وذلك ممنوعٌ في مكوّنٍ خادميّ. فالصفحة الخادميّة تجلب البيانات وحدها وتمرّرها،
// كما تفعل `EventsView` و`MembersView` — لا أيقونةَ تُستورَد في `page.tsx`.

import { Alert, Badge, Card, CardBody, CardHeader } from "@adeeb/design-system";
import { Binoculars, Path, ShieldWarning, Signpost } from "@phosphor-icons/react";
import { EmptyState } from "../_components/EmptyState";
import { categoryLabel, dots, remainingText, warningTitle } from "@/lib/warnings/vocab";
import { Journey } from "./Journey";
import { MembershipCard } from "./MembershipCard";
import type { Membership } from "./data";

/**
 * طبقتان: **بطاقة العضويّة** (من أنت الآن)، ثمّ **مسيرتك** (كيف وصلت). ولا ثالثة تسرد
 * بياناتِ السجلّ — من أرادها فمكانُها ملفُّ العضو عند الإدارة، لا تُكرَّر هنا.
 */
export function MembershipView({ membership: m }: { membership: Membership }) {
  return (
    <div className="mpage">
      <MembershipCard
        name={m.name}
        role={m.role}
        status={m.status}
        avatar={m.avatar}
        gender={m.gender}
        chain={m.chain}
        joined={m.joined}
        duration={m.duration}
      />

      {/* الإشراف تكليفٌ لا منصب — فله سطرُه، ولا يُحشر في السلسلة ولا في المسيرة. */}
      {m.supervising.length ? (
        <Card>
          <CardHeader
            variant="soft"
            icon={<Binoculars weight="fill" />}
            title="لجانٌ تشرف عليها"
            subtitle="تكليفٌ من إدارتك — يدور ويتبدّل، ولا يجعلك عضوًا فيها"
          />
          <CardBody>
            <div className="chip-row">
              {/* الفولاذيّ في الشارة اسمُه `info` — لا `brand` (تلك نغمة الكرت والإحصائيّة) */}
              {m.supervising.map((c) => <Badge key={c} tone="info" variant="soft">{c}</Badge>)}
            </div>
          </CardBody>
        </Card>
      ) : null}

      {/* إنذاراتي — لا تظهر إلّا لمن عليه إنذارٌ سارٍ. والشفافيّة قرارُ المالك: يرى السبب كما كُتب،
          فلا يبقى يسأل «كم عليّ؟» — والعاقبةُ مقولةٌ صراحةً قبل أن تقع. */}
      {m.warnings.length ? (
        <Card>
          <CardHeader
            variant="soft"
            icon={<ShieldWarning weight="fill" />}
            title="إنذاراتي"
            subtitle={`${dots(m.warnings.length, m.warningLimit)} · ${remainingText(m.warnings.length, m.warningLimit)}`}
          />
          <CardBody>
            {m.warnings.map((w) => (
              <Alert
                key={w.id}
                tone={w.ordinal >= m.warningLimit ? "danger" : "warning"}
                title={`${warningTitle(w.ordinal)} · ${categoryLabel(w.category)} · ${w.date}`}
              >
                {w.reason}
              </Alert>
            ))}
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader variant="soft" icon={<Path weight="fill" />} title="مسيرتي في أديب" subtitle="انضمامك وما تلاه من مناصب" />
        <CardBody>
          {m.journey.length ? (
            <Journey stops={m.journey} />
          ) : (
            <EmptyState
              icon={<Signpost weight="duotone" />}
              title="لا محطّات بعد"
              description="لم يُسجَّل لك تاريخ انضمامٍ ولا تعيينٌ في منصب."
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
