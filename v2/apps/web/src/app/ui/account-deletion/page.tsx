/**
 * **معاينةُ الخروج من أديب لكلّ دورٍ ومنصب** — بطلب المالك ١٩ أغسطس ٢٠٢٦.
 *
 * السؤالُ الذي تجيب عنه بالعين: «من يضغط زرَّ الخروج، ماذا يقع له؟» وهو سؤالٌ لا يُشرَح
 * بالكلام لأنّ الشجرةَ فيها أحدَ عشرَ دورًا و١٦٠ حاملًا، ولكلٍّ بابُه.
 *
 * **وهذه الصفحةُ غيّرت النظامَ لا وصفتْه**: في جيلها الأوّل عرضت القانونَ النازلَ حينها
 * (كلُّ حاملِ منصبٍ يُمنع من الحذف حتى يُعفى)، فرأى المالكُ في أرقامها أنّ خروجَ مئةٍ
 * وخمسةٍ وثلاثين عضوَ لجنةٍ معلَّقٌ على ثلاثةِ أشخاص، فقضى في ٢٠ أغسطس بما تعرضه اليوم:
 * العضويّةُ تُنهى **قبل** الحساب لا معه، وبابُها يتبدّل بالمقعد.
 *
 * وصارت خادميّةً بعد أن كانت عميليّة: لا حالةَ فيها تُبدَّل بعد أن استقرّ القانون.
 * ولا صفَّ حيًّا ولا اسمَ ههنا: معرضُ `/ui` بلا بابٍ في الإنتاج بعدُ.
 */

import { Alert, Badge, Card, CardBody, CardHeader, Container, Stat } from "@adeeb/design-system";
import { UserMinus, Users } from "@phosphor-icons/react/dist/ssr";
import { ICON_WEIGHT } from "@/lib/iconWeight";
import { AFTER, PLAIN, ROLES, decidersFor, judge, tally, type Door } from "./cases";

export const metadata = { title: "الخروج من أديب لكلّ دور" };

/** شارةُ الباب — لونُها معناها: خضراءُ لمن يمضي بيده، وصفراءُ لمن ينتظر قرارًا. */
const DOOR_TONE: Record<Door, "danger" | "warning" | "success" | "neutral"> = {
  sealed: "danger",
  request: "warning",
  end_now: "success",
  delete: "neutral",
};

export default function AccountExitPreview() {
  const t = tally();

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Membership Exit, Roles</p>
        <h1 className="mt-2 text-3xl font-bold">الخروجُ من أديب لكلّ دورٍ ومنصب</h1>
        <p className="mt-3 max-w-2xl text-content-muted">
          العضويّةُ تُنهى أوّلًا ثمّ يُحذف الحساب، والسببُ إجباريٌّ في البابين. أحدَ عشرَ دورًا
          في الشجرة و160 حاملًا، وأربعُ حالاتٍ بلا مقعد. والأعدادُ لقطةُ 20 أغسطس 2026.
        </p>

        <div className="mt-8 max-w-3xl">
          <Alert tone="info" title="سلطةُ القضاء تتبع مقعدَ الطالب">
            صاحبُ المنصب يزيل ما دونه لا نفسَه. فرئيسُ المجلس يقضي في طلبه رئيسُ النادي وحدَه،
            وقائدا الإدارتين والمستشارُ للرئيسين، وعضوُ الضمان لقائد إدارته، وما سواهم لقائد
            الموارد ومن فوقه.
          </Alert>
        </div>

        <div className="stat-grid mt-6">
          <Stat tone="success" icon={<UserMinus weight={ICON_WEIGHT} />} value={t.self} label="يمضون بزرٍّ بلا طلب" />
          <Stat tone="warning" icon={<Users weight={ICON_WEIGHT} />} value={t.request} label="طلبٌ يُقرّ أو يُردّ" />
          <Stat tone="danger" icon={<UserMinus weight={ICON_WEIGHT} />} value={t.sealed} label="مقعدٌ مختومٌ لا مخرجَ له" />
        </div>

        <h2 className="mt-14 text-xl font-bold">الأدوارُ في الشجرة</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((r) => {
            const v = judge(r);
            return (
              <Card key={r.key} tone={v.tone}>
                <CardHeader
                  variant="soft"
                  icon={<UserMinus weight={ICON_WEIGHT} />}
                  title={r.full}
                  subtitle={`${r.unit}، ${r.holders} يحملونه اليوم`}
                  actions={<Badge tone={v.tone} variant="soft" size="sm">{v.label}</Badge>}
                />
                <CardBody>
                  <p>{v.line}</p>
                  {v.door === "request" ? (
                    <p className="mt-3 text-sm">
                      <b>يقضي فيه: </b>
                      <span className="text-content-muted">{decidersFor(r.key).join("، ")}</span>
                    </p>
                  ) : null}
                  {r.caveat ? <p className="mt-2 text-sm text-content-muted">{r.caveat}</p> : null}
                </CardBody>
              </Card>
            );
          })}
        </div>

        <h2 className="mt-14 text-xl font-bold">ومن لا مقعدَ له</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {PLAIN.map((p) => (
            <Card key={p.key} tone={p.forbidden ? "danger" : p.door === "end_now" ? "success" : undefined}>
              <CardHeader
                variant="soft"
                icon={<UserMinus weight={ICON_WEIGHT} />}
                title={p.ar}
                subtitle={p.count}
                actions={
                  <Badge tone={p.forbidden ? "danger" : DOOR_TONE[p.door]} variant="soft" size="sm">
                    {p.forbidden ? "ممنوعة" : p.door === "end_now" ? "زرٌّ فوريّ" : "حذفُ الحساب"}
                  </Badge>
                }
              />
              <CardBody>{p.what}</CardBody>
            </Card>
          ))}
        </div>

        <h2 className="mt-14 text-xl font-bold">رحلةُ الخروج بالترتيب</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {AFTER.map((a) => (
            <Card key={a.at}>
              <CardHeader variant="soft" icon={<UserMinus weight={ICON_WEIGHT} />} title={a.at} />
              <CardBody>{a.text}</CardBody>
            </Card>
          ))}
        </div>
      </Container>
    </main>
  );
}
