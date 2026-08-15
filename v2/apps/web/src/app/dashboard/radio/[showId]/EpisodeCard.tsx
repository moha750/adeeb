"use client";

import { Badge, Card, CardBody, CardFooter, CardHeader } from "@adeeb/design-system";
import { Headphones, Heart, MusicNotes, SpeakerSimpleNone, Waveform, YoutubeLogo } from "@phosphor-icons/react";
import { DropdownMenu, type MenuGroup } from "../../_components/DropdownMenu";
import type { EpisodeRow } from "../data";
import { EPISODE_STATUS_META, episodeLabel, formatDuration, takesAligned } from "../vocab";

type Props = {
  episode: EpisodeRow;
  actions: MenuGroup[];
};

/**
 * كرت حلقة — يحمل ما يحمله صفُّ الجدول: الاسمُ ورقمُه وحالتُه، ثمّ النسختان بمدّتيهما
 * (والغائبةُ شارةٌ تنادي)، وأرقامُ الاستماع، ويوتيوب والإعجاب في الذيل. ولا نقرَ على الكرت
 * لأنّ صفَّه لا يُنقَر: كلُّ فعلٍ من قائمة النقاط.
 */
export function EpisodeCard({ episode, actions }: Props) {
  const meta = EPISODE_STATUS_META[episode.status];
  return (
    <Card>
      <CardHeader
        icon={<Waveform aria-hidden />}
        title={episode.title}
        subtitle={<span className="font-latin">{episodeLabel(episode.number)}</span>}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={meta.tone} dot>{meta.label}</Badge>
            {actions.length > 0 ? <DropdownMenu groups={actions} /> : null}
          </div>
        }
      />
      <CardBody className="pt-3">
        <div className="flex flex-col items-start gap-2">
          <span className="inline-flex flex-wrap items-center gap-2 text-content-muted text-sm">
            {episode.plain ? (
              <span className="inline-flex items-center gap-1.5">
                <SpeakerSimpleNone aria-hidden />
                <bdi dir="ltr" className="font-latin text-content">{formatDuration(episode.plain.seconds)}</bdi>
              </span>
            ) : (
              <Badge tone="warning" variant="outline">بلا مسار صوت</Badge>
            )}
            {episode.stem ? (
              <span className="inline-flex items-center gap-1.5">
                <MusicNotes aria-hidden />
                <bdi dir="ltr" className="font-latin">{formatDuration(episode.stem.seconds)}</bdi>
              </span>
            ) : (
              <Badge tone="warning" variant="outline">بلا مسار موسيقى</Badge>
            )}
            {episode.music && !(episode.plain && episode.stem) ? (
              <Badge tone="neutral" variant="outline">مكسٌ قديم</Badge>
            ) : null}
            {takesAligned(episode.plain, episode.stem) ? null : (
              <Badge tone="danger" variant="outline">مدّتان مختلفتان</Badge>
            )}
          </span>
          <span className="inline-flex items-center gap-2 text-content-muted text-sm">
            <Headphones aria-hidden />
            <span>
              <b className="font-latin text-content">{episode.plays}</b> استماعة،{" "}
              <b className="font-latin text-content">{episode.listeners}</b> مستمعًا
              {episode.playsPlain > 0 ? (
                <>، <b className="font-latin text-content">{episode.playsPlain}</b> مجرّدة</>
              ) : null}
            </span>
          </span>
        </div>
      </CardBody>
      <CardFooter>
        {episode.youtubeUrl ? (
          <a
            href={episode.youtubeUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-secondary"
          >
            <YoutubeLogo aria-hidden />الفيديو على يوتيوب
          </a>
        ) : (
          <span className="text-sm text-content-muted">بلا فيديو</span>
        )}
        <span className="inline-flex items-center gap-1.5 text-sm text-content-muted">
          <Heart aria-hidden />الإعجاب <b className="font-latin text-content">{episode.likes}</b>
        </span>
      </CardFooter>
    </Card>
  );
}
