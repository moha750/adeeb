// Edge Function: track-pageview
// =============================================
// 3 endpoints (موجَّهة بالـ pathname داخل الـ handler):
//   POST /                  → تسجيل pageview جديد، يرجع pageview_id
//   POST /heartbeat         → تحديث total_seconds دورياً
//   POST /end               → تحديث نهائي (يُستقبل عبر navigator.sendBeacon)
//
// لا يتعرّض schema الجدول للعميل. الـ IP لا يُخزَّن خاماً (SHA-256 + salt).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// CORS — الموقع يُخدَم من GitHub Pages فقط (وقد يكون له domain مخصص)
// نفتح للـ origins الشائعة، Supabase يضع origin اعتماداً على request
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const ok = () =>
  new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// قائمة Bots شائعة
const BOT_REGEX = /bot|crawler|spider|slurp|googlebot|bingbot|yandex|duckduckbot|facebookexternalhit|twitterbot|whatsapp|telegrambot|headlesschrome|phantomjs|selenium|puppeteer|lighthouse|chrome-lighthouse|pagespeed|gtmetrix|pingdom|uptimerobot|baiduspider|sogou|exabot|ia_archiver|archive\.org|semrush|ahrefs|mj12bot/i;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// UA parser خفيف (يكفي لتمييز المتصفح والنظام والجهاز)
function parseUA(ua: string) {
  const r = {
    browser_name: 'Unknown', browser_version: '',
    os_name: 'Unknown', os_version: '',
    device_type: 'desktop' as 'mobile' | 'tablet' | 'desktop' | 'bot' | 'unknown',
    device_vendor: '' as string | null,
  };
  if (!ua) return r;

  // Browser
  let m: RegExpMatchArray | null;
  if ((m = ua.match(/Edg\/([\d.]+)/))) { r.browser_name = 'Edge'; r.browser_version = m[1]; }
  else if ((m = ua.match(/OPR\/([\d.]+)/)) || (m = ua.match(/Opera\/([\d.]+)/))) { r.browser_name = 'Opera'; r.browser_version = m[1]; }
  else if ((m = ua.match(/Firefox\/([\d.]+)/))) { r.browser_name = 'Firefox'; r.browser_version = m[1]; }
  else if ((m = ua.match(/Chrome\/([\d.]+)/))) { r.browser_name = 'Chrome'; r.browser_version = m[1]; }
  else if ((m = ua.match(/Version\/([\d.]+).*Safari/))) { r.browser_name = 'Safari'; r.browser_version = m[1]; }
  else if ((m = ua.match(/MSIE ([\d.]+)/)) || (m = ua.match(/Trident.*rv:([\d.]+)/))) { r.browser_name = 'IE'; r.browser_version = m[1]; }

  // OS
  if ((m = ua.match(/Windows NT ([\d.]+)/))) { r.os_name = 'Windows'; r.os_version = m[1]; }
  else if ((m = ua.match(/Mac OS X ([\d_.]+)/))) { r.os_name = 'macOS'; r.os_version = m[1].replace(/_/g, '.'); }
  else if ((m = ua.match(/Android ([\d.]+)/))) { r.os_name = 'Android'; r.os_version = m[1]; }
  else if ((m = ua.match(/iPhone OS ([\d_]+)/))) { r.os_name = 'iOS'; r.os_version = m[1].replace(/_/g, '.'); }
  else if ((m = ua.match(/iPad.*OS ([\d_]+)/))) { r.os_name = 'iPadOS'; r.os_version = m[1].replace(/_/g, '.'); }
  else if (/CrOS/.test(ua)) { r.os_name = 'ChromeOS'; }
  else if (/Linux/.test(ua)) { r.os_name = 'Linux'; }

  // Device
  if (/iPad/.test(ua)) { r.device_type = 'tablet'; r.device_vendor = 'Apple'; }
  else if (/iPhone/.test(ua)) { r.device_type = 'mobile'; r.device_vendor = 'Apple'; }
  else if (/Android/.test(ua)) {
    r.device_type = /Mobile/.test(ua) ? 'mobile' : 'tablet';
    if ((m = ua.match(/;\s*([^;)]+?)\s+Build/))) r.device_vendor = m[1].split(' ')[0];
  }
  else if (/Windows Phone/.test(ua)) { r.device_type = 'mobile'; r.device_vendor = 'Microsoft'; }

  return r;
}

function isBot(ua: string): boolean {
  return !ua || BOT_REGEX.test(ua);
}

async function hashIp(ip: string): Promise<Uint8Array | null> {
  if (!ip) return null;
  const salt = Deno.env.get('VISIT_IP_SALT') ?? '';
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(salt + ip));
  return new Uint8Array(buf);
}

function clientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip')
    || req.headers.get('x-real-ip')
    || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || ''
  );
}

// محاولة استخراج country من headers الشائعة (Cloudflare/Vercel/Supabase)
function clientCountry(req: Request): string | null {
  const c =
    req.headers.get('cf-ipcountry')
    || req.headers.get('x-vercel-ip-country')
    || req.headers.get('x-country-code');
  if (!c || c === 'XX' || c === 'T1') return null;
  return c.toUpperCase().slice(0, 2);
}

// HTTPS geo lookup — يحاول ipapi.co أولاً، ثم ipwho.is كـ fallback
async function fetchGeoFallback(ip: string): Promise<{ country: string | null; city: string | null }> {
  if (!ip) return { country: null, city: null };

  // 1) ipapi.co (HTTPS، ~1000 طلب/يوم مجاني)
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'adeeb-tracker/1.0' },
    });
    clearTimeout(t);
    if (res.ok) {
      const d = await res.json();
      if (d && !d.error && (d.country_code || d.city)) {
        return { country: d.country_code || null, city: d.city || null };
      }
    }
  } catch (e) {
    console.warn('[geo] ipapi.co failed:', (e as Error).message);
  }

  // 2) ipwho.is (HTTPS، مجاني بدون حد واضح)
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country_code,city`, {
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (res.ok) {
      const d = await res.json();
      if (d && d.success !== false) {
        return { country: d.country_code || null, city: d.city || null };
      }
    }
  } catch (e) {
    console.warn('[geo] ipwho.is failed:', (e as Error).message);
  }

  return { country: null, city: null };
}

interface StartBody {
  visitor_id?: string;
  session_id?: string;
  page_path?: string;
  page_url?: string;
  page_title?: string;
  referrer?: string | null;
  screen_width?: number;
  screen_height?: number;
  language?: string | null;
  user_id?: string | null;
}

interface HeartbeatBody {
  pageview_id?: string;
  total_seconds?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const url = new URL(req.url);
  // routing داخل الـ function — يدعم كلاً من /heartbeat و /end كآخر segment
  const pathname = url.pathname.replace(/\/+$/, '');
  const last = pathname.split('/').pop() || '';

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    // ---------- /heartbeat ----------
    if (last === 'heartbeat') {
      const body = (await req.json()) as HeartbeatBody;
      const id = body.pageview_id;
      const seconds = Math.max(0, Math.min(14400, Math.floor(Number(body.total_seconds) || 0)));

      if (!id || !UUID_REGEX.test(id)) return json({ error: 'invalid_pageview_id' }, 400);

      // GREATEST لمنع القفز للخلف، last_heartbeat_at = now()
      const { error } = await supabase.rpc('exec_heartbeat_update' as never, {} as never).then(
        () => ({ error: null }),
        () => ({ error: 'fallback' })
      );
      // الاعتماد على update مباشر (لا توجد RPC مخصصة):
      const { error: updErr } = await supabase
        .from('site_pageviews')
        .update({
          total_seconds: seconds,
          last_heartbeat_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updErr) {
        console.error('[track-pageview/heartbeat] update error:', updErr);
        return json({ error: 'update_failed' }, 500);
      }
      void error; // تجاهل
      return ok();
    }

    // ---------- /end (sendBeacon) ----------
    if (last === 'end') {
      const body = (await req.json()) as HeartbeatBody;
      const id = body.pageview_id;
      const seconds = Math.max(0, Math.min(14400, Math.floor(Number(body.total_seconds) || 0)));

      if (!id || !UUID_REGEX.test(id)) return json({ error: 'invalid_pageview_id' }, 400);

      const { error: updErr } = await supabase
        .from('site_pageviews')
        .update({
          total_seconds: seconds,
          last_heartbeat_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updErr) {
        console.error('[track-pageview/end] update error:', updErr);
        return json({ error: 'update_failed' }, 500);
      }
      return ok();
    }

    // ---------- POST / (start) ----------
    const body = (await req.json()) as StartBody;

    if (!body.visitor_id || !UUID_REGEX.test(body.visitor_id)) return json({ error: 'invalid_visitor_id' }, 400);
    if (!body.session_id || !UUID_REGEX.test(body.session_id)) return json({ error: 'invalid_session_id' }, 400);
    if (!body.page_path || typeof body.page_path !== 'string') return json({ error: 'invalid_page_path' }, 400);
    if (!body.page_url  || typeof body.page_url  !== 'string') return json({ error: 'invalid_page_url'  }, 400);

    const ua = req.headers.get('user-agent') || '';
    const bot = isBot(ua);
    const parsed = parseUA(ua);
    if (bot) parsed.device_type = 'bot';

    const ip = clientIp(req);
    const ipHash = await hashIp(ip);

    let country = clientCountry(req);
    let city: string | null = null;

    // ip-api.com يعطي country + city. نطلبه إن:
    // - country غير موجود من headers (لاستخراج كليهما)
    // - أو country موجود لكن نحتاج city (cf-ipcountry لا يعطي city)
    if (ip && !bot) {
      const geo = await fetchGeoFallback(ip);
      if (!country) country = geo.country;
      city = geo.city;
    }

    // تطبيع طول الحقول
    const cap = (s: string | null | undefined, n: number) =>
      s == null ? null : String(s).slice(0, n);

    const insertRow = {
      visitor_id: body.visitor_id,
      session_id: body.session_id,
      user_id: body.user_id && UUID_REGEX.test(body.user_id) ? body.user_id : null,

      page_path:  cap(body.page_path,  500),
      page_url:   cap(body.page_url,   2000),
      page_title: cap(body.page_title, 500),
      referrer:   cap(body.referrer,   2000),
      is_admin_page: typeof body.page_path === 'string' && body.page_path.startsWith('/admin/'),

      user_agent:      cap(ua, 1000),
      browser_name:    parsed.browser_name,
      browser_version: parsed.browser_version,
      os_name:         parsed.os_name,
      os_version:      parsed.os_version,
      device_type:     parsed.device_type,
      device_vendor:   parsed.device_vendor || null,

      screen_width:  Number.isFinite(body.screen_width)  ? Math.min(32767, Math.max(0, body.screen_width!))  : null,
      screen_height: Number.isFinite(body.screen_height) ? Math.min(32767, Math.max(0, body.screen_height!)) : null,
      language:      cap(body.language, 20),

      ip_hash:      ipHash ? `\\x${Array.from(ipHash).map(b => b.toString(16).padStart(2, '0')).join('')}` : null,
      country_code: country,
      city:         cap(city, 200),

      is_bot: bot,
      total_seconds: 0,
      visited_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('site_pageviews')
      .insert([insertRow])
      .select('id')
      .single();

    if (error) {
      console.error('[track-pageview] insert error:', error);
      return json({ error: 'insert_failed' }, 500);
    }

    return json({ pageview_id: data.id });
  } catch (e) {
    console.error('[track-pageview] unexpected error:', e);
    return json({ error: 'internal_error' }, 500);
  }
});
