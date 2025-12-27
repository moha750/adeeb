import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DEFAULT_IMAGE_URL = 'https://lh3.googleusercontent.com/d/195w-tUBF_VKwFOm3Sh06fmwnlYzIyw0e';
const SITE_ORIGIN = 'https://www.adeeb.club';
const NEWS_IMAGES_BUCKET = 'news-images';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildDescription(summary: unknown, content: unknown): string {
  const s = typeof summary === 'string' ? summary.trim() : '';
  if (s) return s.length > 200 ? s.slice(0, 197) + '...' : s;

  const c = typeof content === 'string' ? content : '';
  const text = stripHtml(c);
  if (!text) return 'اكتشف آخر أخبار وفعاليات نادي أديب الطلابي في جامعة الملك فيصل';
  return text.length > 200 ? text.slice(0, 197) + '...' : text;
}

function normalizeImageUrl(url: unknown): string {
  const raw = typeof url === 'string' ? url.trim() : '';
  if (!raw) return DEFAULT_IMAGE_URL;
  if (/^https?:\/\//i.test(raw)) return raw;
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  if (supabaseUrl && !raw.includes('/') && !raw.includes('\\')) {
    return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${NEWS_IMAGES_BUCKET}/${encodeURIComponent(raw)}`;
  }
  if (raw.startsWith('/')) return SITE_ORIGIN + raw;
  return SITE_ORIGIN + '/' + raw;
}

serve(async (req: Request) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405 });
    }

    const requestUrl = new URL(req.url);
    const id = requestUrl.searchParams.get('id');
    const slug = requestUrl.searchParams.get('slug');

    if (!id && !slug) {
      return new Response('Missing id or slug', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response('Server misconfigured', {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let news: any = null;
    let error: any = null;
    try {
      let query = supabase
        .from('news')
        .select('id,title,summary,content,image_url,images,published_at,updated_at,status,slug');

      if (slug) query = query.eq('slug', slug);
      else query = query.eq('id', id);

      const res = await query
        .eq('status', 'published')
        .single();

      news = res.data;
      error = res.error;
    } catch (e: any) {
      error = e;
    }

    // Fallback for projects that haven't added the slug column yet.
    const errMsg = String(error?.message || error || '').toLowerCase();
    const slugNotAvailable = errMsg.includes('slug') && (errMsg.includes('does not exist') || errMsg.includes('column'));
    if ((error || !news) && slugNotAvailable) {
      let query = supabase
        .from('news')
        .select('id,title,summary,content,image_url,images,published_at,updated_at,status');

      query = query.eq('id', id);

      const res = await query
        .eq('status', 'published')
        .single();

      news = res.data;
      error = res.error;
    }

    if (error || !news) {
      return new Response('Not found', {
        status: 404,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=30',
        },
      });
    }

    const title = typeof news.title === 'string' && news.title.trim() ? news.title.trim() : 'خبر - نادي أديب';
    const description = buildDescription(news.summary, news.content);

    const imagesArr = Array.isArray((news as { images?: unknown }).images) ? (news as { images: unknown[] }).images : [];
    const firstGalleryImageUrl = (imagesArr.length > 0 && imagesArr[0] && typeof (imagesArr[0] as { url?: unknown }).url === 'string')
      ? String((imagesArr[0] as { url: string }).url)
      : '';
    const imageUrl = normalizeImageUrl(news.image_url || firstGalleryImageUrl);

    const slugValue = (typeof (news as { slug?: unknown }).slug === 'string' && (news as { slug: string }).slug.trim())
      ? (news as { slug: string }).slug.trim()
      : '';
    const canonicalUrl = slugValue
      ? `${SITE_ORIGIN}/news/news-detail.html?slug=${encodeURIComponent(slugValue)}`
      : `${SITE_ORIGIN}/news/news-detail.html?id=${encodeURIComponent(String(news.id))}`;
    const ogUrl = requestUrl.toString();

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} - نادي أديب</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />

  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="نادي أديب" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />
  <meta property="og:image:alt" content="${escapeHtml(title)}" />
  <meta property="og:url" content="${escapeHtml(ogUrl)}" />
  <meta property="og:locale" content="ar_SA" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(title)}" />

  <script>
    setTimeout(function () {
      window.location.replace(${JSON.stringify(canonicalUrl)});
    }, 200);
  </script>
</head>
<body>
  <a href="${escapeHtml(canonicalUrl)}">الانتقال إلى الخبر</a>
</body>
</html>`;

    return new Response(req.method === 'HEAD' ? null : html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (e) {
    return new Response('Internal server error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
});
