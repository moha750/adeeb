-- ═══════════════════════════════════════════════════════════════════════════
-- «ألعاب أدِيبيّة»: إحكامان بعد المراجعة المستقلّة (٢٠٢٦-١٠-١٧، بإذن المالك).
--
-- (١) الرابطُ الداخليُّ لا يحمل شرطةً عكسيّة ولا مسافةً ولا محرفَ تحكّم: المتصفّحُ يقرأ `/\evil.com`
--     رابطًا إلى `//evil.com` فيُخرج زائرَ الصالة من الموقع. كان القيدُ `^/[^/]` يُجيزها، والخادمُ
--     يمنعها منذ المراجعة (`PATH_RE` في `dashboard/games/actions.ts`)، والقاعدةُ تمنعها الآن أيضًا.
-- (٢) معرّفُ من أنشأ أو عدّل (`created_by` و`updated_by`) لا يقرؤه الزائر: رقمُ حسابٍ داخليٌّ لا
--     حاجةَ للصالة به. فالقراءةُ للعموم صارت بالأعمدة لا بالجدول. واللوحةُ والصالةُ تقرآن بمفتاح الخدمة.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ✅ مطبَّقٌ على الإنتاج ٢٠٢٦-١٠-١٧ بإذن المالك (بأداة Supabase باسم `games_02_hardening`، الإصدار 20261017100044).

alter table public.games drop constraint games_play_path_check;
alter table public.games drop constraint games_board_path_check;
alter table public.games add constraint games_play_path_check
  check (play_path ~ '^/[^/\\][^\\[:space:][:cntrl:]]*$' and char_length(play_path) <= 120);
alter table public.games add constraint games_board_path_check
  check (board_path ~ '^/[^/\\][^\\[:space:][:cntrl:]]*$' and char_length(board_path) <= 120);

revoke select on public.games, public.game_events from anon, authenticated;
grant select (slug, name, line, tone, play_path, board_path, attract_video, attract_poster,
              in_hall, sort_order, created_at, updated_at)
  on public.games to anon, authenticated;
grant select (id, game_slug, title, note, starts_at, ends_at, created_at, updated_at)
  on public.game_events to anon, authenticated;

commit;
