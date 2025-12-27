import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DEFAULT_IMAGE_URL = 'https://lh3.googleusercontent.com/d/195w-tUBF_VKwFOm3Sh06fmwnlYzIyw0e';
const SITE_ORIGIN = 'https://www.adeeb.club';

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
  if (raw.startsWith('/')) return SITE_ORIGIN + raw;
  return SITE_ORIGIN + '/' + raw;
}

serve(async (req) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405 });
    }

    const requestUrl = new URL(req.url);
    const id = requestUrl.searchParams.get('id');

    if (!id) {
      return new Response('Missing id', {
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

    const { data: news, error } = await supabase
      .from('news')
      .select('id,title,summary,content,image_url,published_at,status')
      .eq('id', id)
      .eq('status', 'published')
      .single();

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
    const imageUrl = normalizeImageUrl(news.image_url);

    const canonicalUrl = `${SITE_ORIGIN}/news/news-detail.html?id=${encodeURIComponent(String(news.id))}`;

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} - نادي أديب</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="robots" content="noindex, nofollow" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />

  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="نادي أديب" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:locale" content="ar_SA" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />

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
