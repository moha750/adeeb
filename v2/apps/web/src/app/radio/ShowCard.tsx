import Link from "next/link";
import { Badge, Card, CardBody, CardHeader, CardMedia } from "@adeeb/design-system";
import { MicrophoneStage, Playlist } from "@phosphor-icons/react/dist/ssr";
import type { PublicShow } from "./data";

/** كرت برنامجٍ عامّ — بطاقة الهوية ملفوفةً برابطٍ إلى صفحته. */
export function ShowCard({ s }: { s: PublicShow }) {
  return (
    <Link href={`/radio/${s.slug}`} className="block">
      <Card interactive>
        {s.logoUrl ? <CardMedia image={s.logoUrl} alt={`شعار ${s.title}`} /> : null}
        <CardHeader
          className="acard-header-clip"
          icon={<MicrophoneStage aria-hidden />}
          title={s.title}
          subtitle={s.hostName ? `تقديم ${s.hostName}` : undefined}
        />
        <CardBody className="pt-3">
          <div className="flex flex-col gap-2">
            {s.isFeatured ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="warning" variant="soft" dot>مميّز</Badge>
              </div>
            ) : null}
            {s.tagline ? (
              <p className="line-clamp-3 text-sm leading-relaxed text-content-muted">{s.tagline}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3 text-sm text-content-muted">
              <span className="inline-flex items-center gap-1.5">
                <Playlist aria-hidden />
                <span className="font-latin">{s.episodeCount}</span> حلقة
              </span>
            </div>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
