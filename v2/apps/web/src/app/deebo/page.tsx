import { Container } from "@adeeb/design-system";
import { DeeboChat } from "./DeeboChat";

export const metadata = {
  title: "ديبو",
  description: "مساعدُ نادي أديب. اسأله عن النادي وفعاليّاته وعضويّته.",
};

/**
 * صفحةُ ديبو المستقلّة.
 *
 * خادميّةٌ لتمرير مفتاح Turnstile العلنيّ وحده، والمحادثةُ كلُّها عميليّة.
 */
export default function DeeboPage() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null;

  return (
    <main className="py-16">
      <Container className="max-w-2xl">
        <h1 className="font-display text-3xl font-black text-content md:text-4xl">ديبو</h1>
        <p className="mt-2 text-content-muted">اسألني عن نادي أديب، وسأجيبك بما أعرف.</p>

        <div className="mt-10">
          <DeeboChat siteKey={siteKey} />
        </div>
      </Container>
    </main>
  );
}
