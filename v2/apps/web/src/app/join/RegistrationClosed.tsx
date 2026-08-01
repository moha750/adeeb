import Link from "next/link";
import { Card, CardBody } from "@adeeb/design-system";

/** قفلٌ SVG داخليّ (currentColor) — بنمط أيقونات نظام التصميم، فلا يعتمد المكوّن الخادميّ على أيقونة عميليّة. */
const LockIcon = () => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    <path d="M12 14.5v2.5" />
  </svg>
);

export type RegistrationClosedProps = {
  title: string;
  message: string;
  buttonText: string;
  /** موعد الفتح القادم منسَّقًا (يُحسب خادميًّا) — يُعرض إن وُجد. */
  openAtLabel: string | null;
};

/** شاشة إغلاق باب التسجيل — نصوصها من membership_settings (يضبطها كونسول الإدارة لاحقًا). */
export function RegistrationClosed({ title, message, buttonText, openAtLabel }: RegistrationClosedProps) {
  return (
    <Card className="mx-auto max-w-xl text-center">
      <CardBody className="p-8 md:p-10">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-surface-2 text-3xl text-secondary">
          <LockIcon />
        </div>
        <h1 className="font-display text-2xl font-black text-content md:text-3xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-content-muted">{message}</p>
        {openAtLabel ? (
          <p className="mt-4 font-body text-sm font-bold text-secondary">يُفتح التسجيل في: {openAtLabel}</p>
        ) : null}
        <div className="mt-7 flex justify-center">
          <Link href="/" className="abtn abtn-primary abtn-lg">{buttonText}</Link>
        </div>
      </CardBody>
    </Card>
  );
}
