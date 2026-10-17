-- «بنك أدِيب» في الصالة بمقطعه وصورته (طلبُ المالك ٢٠٢٦-١٠-١٧).
-- المقطعُ صُوِّر من اللعبة نفسِها (`public/games/bank-adeeb/game.html`) في متصفّحٍ بلا اتّصالٍ بالخادم،
-- فلم تُسجَّل جولتُه في `bank_plays`: لاعبٌ اسمُه «ريم» يختار العربيّة والمستوى السهل ويُصيب.
-- ٥٤٠×٧٢٠ وعشرُ ثوانٍ، بمقاس مقطع «دربك خضر»، والصورةُ الثابتةُ شاشةُ السؤال.
--
-- ✅ مطبَّقٌ على الإنتاج ٢٠٢٦-١٠-١٧ (بأداة Supabase باسم `games_03_bank_in_hall`، الإصدار 20261017100611).

update public.games
set attract_video = '/games/cabinets/bank-adeeb.mp4',
    attract_poster = '/games/cabinets/bank-adeeb.jpg',
    in_hall = true
where slug = 'bank-adeeb';
