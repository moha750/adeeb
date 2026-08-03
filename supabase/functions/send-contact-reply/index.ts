/**
 * **ردُّ بوّابة أديب على رسالة تواصل** — يُرسِل البريد ثمّ يُثبت الردّ في السجلّ.
 *
 * لا يُنادى إلّا بمفتاح الخدمة (من إجراء خادميّ في اللوحة)، وسلطةُ الإنسان تُفحص هناك
 * (`manage_contact`) قبل النداء. فلا مسارَ من المتصفّح إلى هذه الدالّة أصلًا.
 *
 * ولا يقبل عنوانًا من المُنادي: المعرّفُ وحده يُمرَّر، والوجهةُ تُقرأ من الصفّ في القاعدة —
 * فلا يُستعمل بريدُ النادي لإرسالٍ إلى عنوانٍ يختاره النداء.
 *
 * وترتيبُ الفعلين مقصود: **يُرسَل أوّلًا ثمّ يُسجَّل**. فإن سقط الإرسال بقيت الرسالة «جديدة»
 * ولم يُكذَب على من يقرأ السجلّ؛ وإن سقط التسجيل بعد إرسالٍ ناجح قيل ذلك صراحةً في الجواب.
 *
 * جربة: `{ probe: true }` تقول أمُهيّأ المفتاح أم لا، بلا إرسال شيء.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const FROM = 'نادي أدِيب <noreply@adeeb.club>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

interface ReplyRequest {
  /** صفّ `contact_messages` المقصود — منه يُقرأ اسمُ المُرسِل وبريدُه وموضوعُه. */
  message_id?: string;
  /** نصّ الردّ كما كتبه صاحب اللوحة. */
  reply?: string;
  /** الرادّ — يُثبَّت في `replied_by` ويُنسب إليه الردّ في نصّ البريد. */
  responder_id?: string;
  responder_name?: string;
  /** بريد الرادّ — يصير `reply_to` فيصل جوابُ الزائر إليه هو لا إلى صندوقٍ مهجور. */
  responder_email?: string;
  probe?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  // الحارس: بطاقةُ الخدمة وحدها تفتح — لا جلسةَ مستخدمٍ ولا مفتاحٌ عامّ.
  //
  // والتوقيعُ فُحص قبلنا: البوّابة لا تُمرّر إلّا رمزًا صحيحًا (`verify_jwt`)، فيكفينا هنا
  // **دعوى الدور**. ولا نقارن بالنصّ وحده لأنّ مفتاح الخدمة المحقون في الدالّة قد يختلف
  // شكلًا عن الذي بيد المُنادي (المفاتيح الجديدة `sb_secret_…` مقابل رمز JWT القديم).
  const bearer = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim();
  if (!isServiceCaller(bearer)) return json({ ok: false, error: 'forbidden' }, 403);

  let body: ReplyRequest;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'bad json' }, 400);
  }

  if (body.probe) return json({ ok: true, configured: !!RESEND_API_KEY });

  const reply = (body.reply ?? '').trim();
  if (!body.message_id || reply.length < 2) return json({ ok: false, error: 'missing fields' }, 400);

  const { data: row, error: rowErr } = await admin
    .from('contact_messages')
    .select('id, name, email, subject, message, created_at')
    .eq('id', body.message_id)
    .maybeSingle();

  if (rowErr) return json({ ok: false, error: `db: ${rowErr.message}` }, 500);
  if (!row) return json({ ok: false, error: 'not found' }, 404);

  if (!RESEND_API_KEY) {
    // لا نصمت ولا نُعلّم الرسالة مُجابًا عنها: مفتاحٌ ناقص يُقال لصاحب اللوحة كما هو.
    return json({ ok: false, error: 'RESEND_API_KEY not configured' }, 503);
  }

  const subject = row.subject?.trim()
    ? `ردُّ نادي أدِيب: ${row.subject.trim()}`
    : 'ردُّ نادي أدِيب على رسالتك';

  const html = buildEmail({
    name: row.name,
    reply,
    original: row.message,
    originalSubject: row.subject,
    sentAt: row.created_at,
    responder: body.responder_name ?? null,
  });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [row.email],
      subject,
      html,
      // جوابُ الزائر يعود إلى الرادّ نفسه إن كان له بريد، لا إلى صندوق «لا-ردّ».
      ...(body.responder_email ? { reply_to: body.responder_email } : {}),
    }),
  });

  if (!res.ok) {
    const details = await res.text();
    console.error('[send-contact-reply] Resend failed:', details);
    return json({ ok: false, error: 'Resend failed', details }, 502);
  }

  const { error: updErr } = await admin
    .from('contact_messages')
    .update({
      status: 'replied',
      reply_message: reply,
      replied_by: body.responder_id ?? null,
      replied_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id);

  if (updErr) {
    console.error('[send-contact-reply] sent but not recorded:', updErr.message);
    return json({ ok: true, sent: true, recorded: false, error: updErr.message });
  }

  return json({ ok: true, sent: true, recorded: true });
});

/** أصاحبُ الخدمة هو المُنادي؟ — مطابقةُ المفتاح المحقون، أو دعوى `role` في رمزٍ فُحص توقيعُه. */
function isServiceCaller(bearer: string): boolean {
  if (!bearer) return false;
  if (SERVICE_KEY && bearer === SERVICE_KEY) return true;
  const parts = bearer.split('.');
  if (parts.length !== 3) return false;
  try {
    const pad = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(pad + '='.repeat((4 - (pad.length % 4)) % 4))) as { role?: string };
    return claims.role === 'service_role';
  } catch {
    return false;
  }
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** فقراتُ نصٍّ حرّ — أسطرُ الكاتب تبقى أسطرًا في البريد. */
const paragraphs = (s: string) =>
  esc(s)
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');

interface EmailArgs {
  name: string;
  reply: string;
  original: string;
  originalSubject: string | null;
  sentAt: string | null;
  responder: string | null;
}

/** قالبُ البريد — بهويّة أديب نفسها التي في `v2/emails/recovery.html` (لا مكتبةَ ولا حزمة). */
function buildEmail({ name, reply, original, originalSubject, sentAt, responder }: EmailArgs): string {
  const when = sentAt
    ? new Date(sentAt).toLocaleDateString('ar-SA', {
        year: 'numeric', month: 'long', day: 'numeric', calendar: 'gregory',
      })
    : null;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ردُّ نادي أدِيب</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #f8f9fa 0%, #e6f0f9 100%);
      margin: 0; padding: 20px; line-height: 1.6;
    }
    .email-wrapper {
      max-width: 650px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden;
      box-shadow: 0 15px 35px rgba(0,0,0,.1), 0 5px 15px rgba(39,64,96,.2);
      border: 1px solid rgba(255,255,255,.3);
    }
    .email-header {
      background: linear-gradient(135deg, #f8f9fa 0%, #e6f0f9 100%);
      padding: 40px 30px; text-align: center;
      border-bottom: 1px solid rgba(61,143,214,.15); position: relative;
    }
    .email-header::before {
      content: ""; position: absolute; top: 0; right: 0; width: 100%; height: 5px;
      background: linear-gradient(90deg, #3d8fd6, #274060);
    }
    .logo-container {
      width: 100px; height: 100px; margin: 0 auto 20px;
      background: linear-gradient(135deg, #3d8fd6, #274060); border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 10px 30px rgba(61,143,214,.3);
    }
    .logo-icon { font-size: 50px; color: white; }
    .email-header h1 { color: #274060; font-size: 30px; margin-bottom: 10px; font-weight: bold; }
    .email-header p { color: #64748b; font-size: 16px; }
    .email-content { padding: 40px 35px; background: white; }
    .greeting { color: #274060; font-size: 20px; font-weight: 600; margin-bottom: 20px; }
    .email-content p { color: #475569; line-height: 1.8; font-size: 16px; margin-bottom: 16px; }
    .reply-card {
      background: linear-gradient(135deg, rgba(61,143,214,.05), rgba(61,143,214,.02));
      border: 1px solid rgba(61,143,214,.15); border-right: 4px solid #3d8fd6;
      padding: 25px; margin: 25px 0; border-radius: 12px;
    }
    .reply-card p:last-child { margin-bottom: 0; }
    .quote-card {
      background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px;
      padding: 18px 20px; margin: 25px 0;
    }
    .quote-label { display: block; color: #64748b; font-size: 13px; margin-bottom: 8px; }
    .quote-card p { color: #64748b; font-size: 15px; margin-bottom: 0; white-space: pre-wrap; }
    .closing-message { margin-top: 35px; padding-top: 28px; border-top: 2px solid #e2e8f0; color: #475569; font-size: 16px; }
    .signature { margin-top: 22px; color: #274060; font-weight: 600; }
    .email-footer {
      background: linear-gradient(135deg, #f8f9fa 0%, #e6f0f9 100%);
      padding: 30px; text-align: center; border-top: 1px solid rgba(61,143,214,.15);
    }
    .email-footer p { color: #64748b; font-size: 14px; margin: 8px 0; }
    .email-footer .copyright { color: #274060; font-weight: 600; margin-bottom: 10px; }
    .email-footer .disclaimer { font-size: 12px; color: #94a3b8; margin-top: 15px; }
    @media only screen and (max-width: 600px) {
      .email-wrapper { margin: 10px; border-radius: 16px; }
      .email-header, .email-content, .email-footer { padding: 25px 20px; }
      .email-header h1 { font-size: 24px; }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header">
      <div class="logo-container"><div class="logo-icon">✉️</div></div>
      <h1>ردُّ نادي أدِيب</h1>
      <p>على رسالتك التي وصلتنا عبر الموقع</p>
    </div>

    <div class="email-content">
      <div class="greeting">أهلًا ${esc(name)}،</div>
      <p>شكرًا لتواصلك مع <strong>نادي أدِيب</strong>. وهذا ردُّنا على رسالتك:</p>

      <div class="reply-card">${paragraphs(reply)}</div>

      <div class="quote-card">
        <span class="quote-label">رسالتك${originalSubject ? ` — «${esc(originalSubject)}»` : ''}${when ? ` · ${when}` : ''}</span>
        <p>${esc(original)}</p>
      </div>

      <div class="closing-message">
        <p>إن بقي لديك سؤال، ردَّ على هذا البريد مباشرةً وسيصلنا.</p>
        <div class="signature">
          مع التحيّة،<br>
          <strong>${responder ? esc(responder) + ' — نادي أدِيب' : 'نادي أدِيب'}</strong>
        </div>
      </div>
    </div>

    <div class="email-footer">
      <p class="copyright">جميع الحقوق محفوظة لنادي أدِيب</p>
      <p>نادي إبداعي ثقافي يهدف إلى نشر الثقافة والإبداع</p>
      <p class="disclaimer">وصلك هذا البريد لأنّك راسلتَ النادي من موقعه.</p>
    </div>
  </div>
</body>
</html>`;
}
