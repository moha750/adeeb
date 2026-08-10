import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, CardBody, CardHeader, Container, Footer, LandingHeading } from "@adeeb/design-system";
import { MicrophoneStage, Playlist } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "../../_components/SiteHeader";
import { PLATFORM_META, episodeLabel, formatDuration } from "../../dashboard/radio/vocab";
import { getPublicShowPage } from "../data";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ show: string }> }) {
  const { show } = await params;
  const page = await getPublicShowPage(show);
  if (!page) return { title: "إذاعة أدِيب" };
  return {
    title: `${page.show.title}، إذاعة أدِيب`,
    description: page.show.tagline ?? page.show.description ?? undefined,
  };
}

export default async function ShowPage({ params }: { params: Promise<{ show: string }> }) {
  const { show: slug } = await params;
  const page = await getPublicShowPage(slug);
  if (!page) notFound();
  const { show, episodes, platforms } = page;

  return (
    <>
      <SiteHeader activeHref="/radio" />
      <main>
        <section className="py-16 md:py-24">
          <Container>
            <LandingHeading
              eyebrow="برنامج"
              title={show.title}
              deck={show.tagline ?? undefined}
              align="center"
            />

            {show.description ? (
              <p className="mx-auto mt-6 max-w-2xl text-center leading-relaxed text-content-muted">
                {show.description}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm text-content-muted">
              {show.hostName ? (
                <span className="inline-flex items-center gap-1.5">
                  <MicrophoneStage aria-hidden />تقديم {show.hostName}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <Playlist aria-hidden /><span className="font-latin">{episodes.length}</span> حلقة
              </span>
            </div>

            {platforms.length ? (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {platforms.map((p) => (
                  <a key={p.platform} href={p.url} target="_blank" rel="noreferrer">
                    <Badge tone="neutral" variant="soft">{PLATFORM_META[p.platform].label}</Badge>
                  </a>
                ))}
              </div>
            ) : null}

            {episodes.length === 0 ? (
              <p className="mt-10 text-center text-content-muted">لا حلقات منشورة بعد.</p>
            ) : (
              <div className="card-grid card-grid-2col" style={{ marginTop: 32 }}>
                {episodes.map((e) => (
                  <Link key={e.id} href={`/radio/${show.slug}/${e.slug}`} className="block">
                    <Card interactive>
                      <CardHeader
                        className="acard-header-clip"
                        icon={<Playlist aria-hidden />}
                        title={e.title}
                        subtitle={`${episodeLabel(e.number)}، ${e.dateLabel}`}
                      />
                      <CardBody className="pt-3">
                        <div className="flex flex-col gap-2">
                          {e.summary ? (
                            <p className="line-clamp-3 text-sm leading-relaxed text-content-muted">{e.summary}</p>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-3 text-sm text-content-muted">
                            {e.musicSeconds ? (
                              <span className="font-latin"><bdi dir="ltr">{formatDuration(e.musicSeconds)}</bdi></span>
                            ) : null}
                            {e.plainUrl ? <Badge tone="neutral" variant="soft">نسختان</Badge> : null}
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
