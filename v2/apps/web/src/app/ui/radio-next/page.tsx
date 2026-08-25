"use client";

import { useState } from "react";
import { Button, Container, Segmented } from "@adeeb/design-system";
import { Play, Heart, ShareNetwork, MicrophoneStage, Waveform, ArrowsDownUp } from "@phosphor-icons/react";
import { CaretLeft, Plus, MagnifyingGlass } from "@/app/_components/glyphs";
import { DEMO_EPISODES, DEMO_SHOW, DEMO_STATION, PAGE_EPISODE_ID } from "./data";
import { EpisodeRow, ListenOn, MiniBar, Player } from "./parts";
import { usePlayerDemo } from "./usePlayer";

/**
 * **الإذاعة، الجيل الثاني** — الأسطحُ الثلاثةُ العامّةُ بالبديل المقترَح، بجوار الحيّ.
 *
 * سببُ الصفحة (٢٠٢٦-٠٨-٢٥): نقدٌ صفحةً صفحةً لقسم الإذاعة أخرج سبعَ فجواتٍ وظيفيّةٍ
 * وعطبًا حيًّا. والقانونُ عندنا أن يُعرَض البديلُ بجوار الحيّ حتّى يُقَرّ ثمّ يأخذ
 * اسمَه ويُعدِمه (سابقةُ `.chartn-*` و`.phn`) — لا أن يُوصَف بالكلام.
 *
 * **وما يُرى هنا هو ما ينزل:** الأصنافُ `.radn-*` في المكتبة لا في هذه الشاشة،
 * والمقاسان استعلامُ **حاوية** لا شاشة، فإطارُ ١١٨٠ داخل المعرض يطابق متصفّحًا
 * عريضًا ولا يُكتب المكوّنُ مرّتين.
 *
 * والحالُ محاكاةٌ بمؤقّت (`usePlayer.ts`) لا صوتٌ حقيقيّ، وذُرى الموجة مولَّدةٌ
 * لا مقروءةٌ من `audio_music_peaks`. وما عدا ذلك هو التخطيطُ بعينه.
 */

const SIZES = [
  { value: "375", label: "جوّال 375" },
  { value: "1180", label: "سطح مكتب 1180" },
];
const VISITOR = [
  { value: "back", label: "زائرٌ عائد" },
  { value: "first", label: "زائرٌ أوّل" },
];

export default function RadioNextPage() {
  const p = usePlayerDemo();
  const [size, setSize] = useState("375");
  const [visitor, setVisitor] = useState("back");
  const wide = size === "1180";
  const heard = DEMO_EPISODES.filter((e) => p.posOf(e.id) > 0);
  const pageEp = DEMO_EPISODES.find((e) => e.id === PAGE_EPISODE_ID)!;
  const pageLive = p.ep === PAGE_EPISODE_ID;

  return (
    <main className="py-10 md:py-14">
      <Container>
        <p className="font-latin text-xs tracking-widest text-content-muted">DESIGN SYSTEM, RADIO NEXT</p>
        <h1 className="mt-3 font-display text-3xl font-black md:text-4xl">الإذاعة، جيلٌ ثانٍ</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-content-muted">
          الأسطحُ الثلاثةُ العامّةُ بالبديل المقترَح. شغّل، واسحب الموجةَ بإصبعك، واضغط محورًا:
          الحالُ واحدةٌ عبر الشاشات الثلاث كما هي في المنتج. والأصنافُ في المكتبة، والمقاسان تخطيطٌ واحد.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Segmented items={SIZES} value={size} onValueChange={setSize} aria-label="مقاس الشاشة" />
          <Segmented items={VISITOR} value={visitor} onValueChange={(v) => { setVisitor(v); p.reset(v === "first"); }}
            aria-label="حال الزائر" />
        </div>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-content-muted">
          {visitor === "first"
            ? "لم يسمع شيئًا بعد، فلا شريطَ ولا رفَّ متابعة، والصفحةُ تقول من أين يبدأ."
            : "عاد وقد سمع نصفَ الحلقة الأولى، فالشاشةُ تعرف أين وقف."}
        </p>

        <div className={"radnlab-stage mt-8" + (wide ? " is-wide" : "")}>

          {/* ── واجهةُ المحطّة ── */}
          <section className="radnlab-dev" aria-label="نموذج واجهة المحطّة">
            <div className="radnlab-cap"><b>واجهةُ المحطّة</b><span>/radio</span></div>
            <div className="radnlab-frame radn-frame">
              <div className="radnlab-top"><b>نادي أَدِيب</b></div>
              <div className={"radnlab-scroll radn-scroll" + (p.barVisible ? " has-bar" : "")}>
                <div className="radnlab-pad">
                  <div className="flex items-start gap-4">
                    <span className="radn-wide-c" aria-hidden><MicrophoneStage size={30} /></span>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-xl font-black">{DEMO_STATION.name}</h2>
                      <p className="mt-1 text-sm text-content-muted">{DEMO_STATION.tagline}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-content-muted">{DEMO_STATION.description}</p>

                  <h3 className="mb-2 mt-6 font-display text-base font-black">
                    {heard.length ? "تابع الاستماع" : "ابدأ من هنا"}
                  </h3>
                  {heard.length ? (
                    <div className="radn-rows">
                      {heard.map((e) => <EpisodeRow key={e.id} ep={e} mode="index" p={p} />)}
                    </div>
                  ) : (
                    <p className="radn-empty">لم تسمع شيئًا بعد. ابدأ بأحدث حلقة، وسنحفظ لك أين وقفت.</p>
                  )}

                  <h3 className="mb-2 mt-6 font-display text-base font-black">البودكاست</h3>
                  <div className="radn-wide">
                    <span className="radn-wide-c" aria-hidden><Waveform size={30} /></span>
                    <span className="radn-txt">
                      <a className="radn-t" href="#demo">{DEMO_SHOW.title}</a>
                      <span className="radn-m"><span className="radn-date">{DEMO_SHOW.tagline}</span></span>
                      <span className="radn-m">
                        <span className="radn-chip"><span className="radn-n">3</span> حلقات</span>
                        <span className="radn-chip">أسبوعيّ</span>
                      </span>
                    </span>
                    <span className="radn-chev" aria-hidden><CaretLeft size={18} /></span>
                  </div>

                  <div className="mb-2 mt-6 flex items-center justify-between gap-3">
                    <h3 className="font-display text-base font-black">أحدث الحلقات</h3>
                    <button type="button" className="radn-dir"><MagnifyingGlass size={14} aria-hidden />بحث</button>
                  </div>
                  <div className="radn-rows">
                    {DEMO_EPISODES.map((e) => <EpisodeRow key={e.id} ep={e} mode="index" p={p} />)}
                  </div>
                  <div className="radn-tail" />
                </div>
              </div>
              <MiniBar p={p} hidden={false} />
            </div>
          </section>

          {/* ── صفحةُ البرنامج ── */}
          <section className="radnlab-dev" aria-label="نموذج صفحة البرنامج">
            <div className="radnlab-cap"><b>صفحةُ البرنامج</b><span>/radio/munataf</span></div>
            <div className="radnlab-frame radn-frame">
              <div className="radnlab-top"><b>نادي أَدِيب</b></div>
              <div className={"radnlab-scroll radn-scroll" + (p.barVisible ? " has-bar" : "")}>
                <div className="radnlab-pad">
                  <nav className="radn-crumb mb-2" aria-label="مسار صفحة البرنامج">
                    <a href="#demo">الإذاعة</a>
                    <span className="radn-crumb-sep" aria-hidden><CaretLeft size={13} /></span>
                    <span className="radn-crumb-here">{DEMO_SHOW.title}</span>
                  </nav>
                  <div className="radn-cols">
                    <div className="radn-aside">
                      <div className="flex items-start gap-4">
                        <span className="radn-wide-c" aria-hidden><Waveform size={30} /></span>
                        <div className="min-w-0 flex-1">
                          <h2 className="font-display text-lg font-black">{DEMO_SHOW.title}</h2>
                          <p className="mt-1 text-sm text-content-muted">{DEMO_SHOW.tagline}</p>
                          <p className="mt-1 text-xs font-bold">تقديم {DEMO_SHOW.hostName}</p>
                        </div>
                      </div>
                      <div className="btn-row mt-3">
                        <Button variant="primary" onClick={() => p.toggleEpisode(DEMO_EPISODES[0].id)}>
                          <Play size={18} weight="fill" aria-hidden />استمع لآخر حلقة
                        </Button>
                        <Button variant="ghost"><Plus size={18} aria-hidden />تابِع</Button>
                      </div>
                      <div className="mt-3"><ListenOn /></div>
                    </div>
                    <div>
                      <p className="text-sm leading-relaxed text-content-muted">{DEMO_SHOW.description}</p>
                      <div className="mb-2 mt-6 flex items-center justify-between gap-3">
                        <h3 className="font-display text-base font-black">
                          <span className="font-latin">3</span> حلقات
                        </h3>
                        <div className="flex gap-2">
                          <button type="button" className="radn-dir"><ArrowsDownUp size={14} aria-hidden />الأحدث أوّلًا</button>
                          <button type="button" className="radn-dir" aria-label="بحث في الحلقات"><MagnifyingGlass size={14} aria-hidden /></button>
                        </div>
                      </div>
                      <div className="radn-rows">
                        {DEMO_EPISODES.map((e) => <EpisodeRow key={e.id} ep={e} mode="show" p={p} />)}
                      </div>
                    </div>
                  </div>
                  <div className="radn-tail" />
                </div>
              </div>
              <MiniBar p={p} hidden={false} />
            </div>
          </section>

          {/* ── صفحةُ الحلقة ── */}
          <section className="radnlab-dev" aria-label="نموذج صفحة الحلقة">
            <div className="radnlab-cap"><b>صفحةُ الحلقة</b><span>/radio/munataf/ep-1</span></div>
            <div className="radnlab-frame radn-frame">
              <div className="radnlab-top"><b>نادي أَدِيب</b></div>
              <div className={"radnlab-scroll radn-scroll" + (p.barVisible && !pageLive ? " has-bar" : "")}>
                <div className="radnlab-pad">
                  <nav className="radn-crumb mb-2" aria-label="مسار صفحة الحلقة">
                    <a href="#demo">الإذاعة</a>
                    <span className="radn-crumb-sep" aria-hidden><CaretLeft size={13} /></span>
                    <a href="#demo">{DEMO_SHOW.title}</a>
                  </nav>
                  <div className="radn-cols">
                    <div className="radn-aside">
                      <div className="flex items-start gap-4">
                        <span className="radn-wide-c" aria-hidden><Waveform size={30} /></span>
                        <div className="min-w-0 flex-1">
                          <h2 className="font-display text-lg font-black">{pageEp.title}</h2>
                          <div className="radn-m mt-1">
                            <span className="radn-show">الحلقة <span className="font-latin">1</span></span>
                            <span className="radn-date">{pageEp.dateLabel} <span className="font-latin">2026</span></span>
                            <span className="radn-chip"><bdi className="radn-n" dir="ltr">{pageEp.lengthLabel}</bdi></span>
                          </div>
                          <div className="btn-row mt-3">
                            <Button variant="ghost" size="sm" aria-pressed={false}>
                              <Heart size={16} aria-hidden /><span className="font-latin">4</span>
                            </Button>
                            <Button variant="ghost" size="sm">
                              <ShareNetwork size={16} aria-hidden />مشاركة
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Player p={p} episodeId={PAGE_EPISODE_ID} />
                      <p className="mt-4 text-sm leading-relaxed text-content-muted">{pageEp.summary}</p>
                      <h3 className="mb-2 mt-6 font-display text-base font-black">التالي في البرنامج</h3>
                      <div className="radn-rows">
                        {DEMO_EPISODES.filter((e) => e.id !== PAGE_EPISODE_ID)
                          .sort((a, b) => a.id - b.id)
                          .map((e) => <EpisodeRow key={e.id} ep={e} mode="next" p={p} />)}
                      </div>
                    </div>
                  </div>
                  <div className="radn-tail" />
                </div>
              </div>
              {/* الشريطُ لا يغيب إلّا إن كان مشغّلُ الصفحة يقول الحلقةَ بعينها */}
              <MiniBar p={p} hidden={pageLive} />
            </div>
          </section>

        </div>

        <p className="mt-10 max-w-3xl text-sm leading-relaxed text-content-muted">
          الأصنافُ <span className="font-latin">.radn-*</span> في <span className="font-latin">components.css</span>،
          وثلاثةُ رموزٍ جديدةٍ في <span className="font-latin">tokens.css</span> أُضيفت لهذا البديل:
          حدُّ عنصر التحكّم، ومسارُ الموجة، والمسموعُ منها. وحدُّ التحكّم يمسّ كلَّ زرٍّ مفرَّغٍ في الموقع لا الإذاعةَ وحدَها،
          فهو أوّلُ ما يُراجَع قبل التعميم. وحين يُقَرّ هذا البديلُ يأخذ اسمَ <span className="font-latin">.rad-*</span> ويُعدِمه،
          وتسقط معه أصنافُ <span className="font-latin">.radnlab-*</span> وهذه الصفحة.
        </p>
        <p className="mt-3 text-xs text-content-muted">
          محاكاةٌ بمؤقّت: لا صوتَ حقيقيًّا، وذُرى الموجة مولَّدةٌ لا مقروءةٌ من القاعدة. وما عدا ذلك هو التخطيطُ بعينه.
        </p>
      </Container>
    </main>
  );
}
