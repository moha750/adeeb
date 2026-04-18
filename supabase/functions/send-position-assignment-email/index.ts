import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const ADMIN_DASHBOARD_URL = 'https://adeeb-club.com/admin/dashboard.html';

type Action = 'assigned' | 'removed';

interface PositionEmailRequest {
  userId: string;
  action: Action;
  roleId: string;
  committeeId?: string | null;
  departmentId?: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.warn('[position-email] missing Authorization header');
      return json({ error: 'Missing authorization header' }, 401);
    }

    // Use anon client with user's auth header so getUser() hits /auth/v1/user
    // (required for ES256-signed JWTs, which can't be decoded locally in Deno)
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: authError } = await supabaseAuth.auth.getUser();
    const adminUser = userData?.user;
    if (authError || !adminUser) {
      console.warn('[position-email] auth failed:', authError?.message, 'hasUser:', !!adminUser);
      return json({ error: 'Unauthorized - Invalid or expired token', details: authError?.message }, 401);
    }

    const { data: adminRoleRows } = await supabaseAdmin
      .from('user_roles')
      .select('role:roles(role_level)')
      .eq('user_id', adminUser.id)
      .eq('is_active', true);

    const adminLevel = Math.max(
      0,
      ...((adminRoleRows || []).map((r: any) => r?.role?.role_level ?? 0))
    );
    if (adminLevel < 7) {
      console.warn('[position-email] insufficient level:', adminLevel, 'user:', adminUser.id);
      return json({ error: 'Insufficient permissions', level: adminLevel }, 403);
    }

    const body: PositionEmailRequest = await req.json();
    const { userId, action, roleId, committeeId, departmentId } = body;

    if (!userId || !action || !roleId) {
      return json({ error: 'userId, action, roleId are required' }, 400);
    }
    if (!['assigned', 'removed'].includes(action)) {
      return json({ error: 'Invalid action' }, 400);
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single();

    if (!profile) return json({ error: 'Profile not found' }, 404);
    if (!profile.email) return json({ ok: true, skipped: true, reason: 'no email' }, 200);

    const { data: role } = await supabaseAdmin
      .from('roles')
      .select('role_name_ar')
      .eq('id', roleId)
      .single();

    let committeeName: string | null = null;
    if (committeeId) {
      const { data: committee } = await supabaseAdmin
        .from('committees')
        .select('committee_name_ar')
        .eq('id', committeeId)
        .single();
      committeeName = committee?.committee_name_ar ?? null;
    }

    let departmentName: string | null = null;
    if (departmentId) {
      const { data: dept } = await supabaseAdmin
        .from('departments')
        .select('name_ar')
        .eq('id', departmentId)
        .single();
      departmentName = dept?.name_ar ?? null;
    }

    if (!RESEND_API_KEY) {
      console.warn('[send-position-assignment-email] RESEND_API_KEY not set; skipping send');
      return json({ ok: true, skipped: true, reason: 'no api key' }, 200);
    }

    const { subject, html } = buildEmail({
      action,
      fullName: profile.full_name || 'عضو النادي',
      roleNameAr: role?.role_name_ar || 'المنصب',
      committeeName,
      departmentName,
    });

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'نادي أدِيب <noreply@adeeb.club>',
        to: [profile.email],
        subject,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errText = await emailResponse.text();
      console.error('[send-position-assignment-email] Resend failed:', errText);
      return json({ ok: false, error: 'Resend failed', details: errText }, 502);
    }

    return json({ ok: true, sent: true }, 200);
  } catch (err) {
    console.error('[send-position-assignment-email] error:', err);
    return json({ ok: false, error: (err as Error).message || 'Internal error' }, 500);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface EmailBuildArgs {
  action: Action;
  fullName: string;
  roleNameAr: string;
  committeeName: string | null;
  departmentName: string | null;
}

function buildEmail(args: EmailBuildArgs): { subject: string; html: string } {
  const { action, fullName, roleNameAr, committeeName, departmentName } = args;

  const today = new Date().toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    calendar: 'gregory',
  });

  const entityLine = committeeName
    ? `<div class="info-row"><span class="info-label">اللجنة:</span> <strong>${escapeHtml(committeeName)}</strong></div>`
    : departmentName
      ? `<div class="info-row"><span class="info-label">القسم:</span> <strong>${escapeHtml(departmentName)}</strong></div>`
      : '';

  let subject = '';
  let headerTitle = '';
  let headerSubtitle = '';
  let headerIcon = '🎉';
  let greetingLine = '';
  let bodyParagraphs = '';
  let ctaLabel = '✨ فتح لوحة التحكم';

  if (action === 'assigned') {
    subject = '🎉 مبروك! تم تعيينك في منصب جديد بنادي أدِيب';
    headerIcon = '🎉';
    headerTitle = 'مبروك المنصب الجديد!';
    headerSubtitle = 'تعيين جديد في نادي أدِيب';
    greetingLine = `أدِيبنا/أدِيبتنا ${escapeHtml(fullName)}،`;
    bodyParagraphs = `
      <p>يسعدنا أن نبلغك بأنه تم تعيينك رسمياً في منصب <strong>${escapeHtml(roleNameAr)}</strong> بنادي أدِيب! 🎊</p>
      <p>نثق بقدراتك ونتطلع إلى ما ستضيفه من قيمة وإنجاز في هذا الدور.</p>
    `;
  } else {
    subject = 'ℹ️ تحديث منصبك في نادي أدِيب';
    headerIcon = '🙏';
    headerTitle = 'شكراً على عطائك';
    headerSubtitle = 'تحديث بشأن منصبك في النادي';
    greetingLine = `أدِيبنا/أدِيبتنا ${escapeHtml(fullName)}،`;
    bodyParagraphs = `
      <p>نودّ إعلامك بأنه تم إنهاء تعيينك في منصب <strong>${escapeHtml(roleNameAr)}</strong>، وإرجاعك إلى منصب عضو لجنة.</p>
      <p>نشكرك على كل ما قدمته خلال فترة شغلك هذا المنصب، ونثق أن عطاءك سيستمر في النادي.</p>
    `;
  }

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif; background: linear-gradient(135deg, #f8f9fa 0%, #e6f0f9 100%); padding: 20px; line-height: 1.6; }
    .email-wrapper { max-width: 650px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.1), 0 5px 15px rgba(39,64,96,0.2); }
    .email-header { background: linear-gradient(135deg, #f8f9fa 0%, #e6f0f9 100%); padding: 40px 30px; text-align: center; border-bottom: 1px solid rgba(61,143,214,0.15); position: relative; }
    .email-header::before { content:""; position:absolute; top:0; right:0; width:100%; height:5px; background: linear-gradient(90deg, #3d8fd6, #274060); }
    .logo-container { width: 100px; height: 100px; margin: 0 auto 20px; background: linear-gradient(135deg, #3d8fd6, #274060); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 30px rgba(61,143,214,0.3); }
    .logo-icon { font-size: 50px; }
    .email-header h1 { color: #274060; font-size: 30px; margin-bottom: 10px; font-weight: bold; }
    .email-header p { color: #64748b; font-size: 16px; }
    .email-content { padding: 40px 35px; background: white; }
    .greeting { color: #274060; font-size: 20px; font-weight: 600; margin-bottom: 20px; }
    .email-content p { color: #475569; line-height: 1.8; font-size: 16px; margin-bottom: 20px; }
    .info-card { background: linear-gradient(135deg, rgba(61,143,214,0.05), rgba(61,143,214,0.02)); border: 1px solid rgba(61,143,214,0.15); border-right: 4px solid #3d8fd6; padding: 22px 25px; margin: 25px 0; border-radius: 12px; }
    .info-card-title { color: #274060; font-size: 18px; font-weight: bold; margin-bottom: 14px; display: flex; align-items: center; gap: 10px; }
    .info-row { color: #475569; font-size: 15px; margin-bottom: 8px; }
    .info-row:last-child { margin-bottom: 0; }
    .info-label { color: #64748b; }
    .cta-container { text-align: center; margin: 35px 0; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #3d8fd6, #274060); color: white !important; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 17px; box-shadow: 0 8px 20px rgba(61,143,214,0.25); }
    .closing-message { margin-top: 35px; padding-top: 25px; border-top: 2px solid #e2e8f0; color: #475569; font-size: 16px; }
    .signature { margin-top: 20px; color: #274060; font-weight: 600; }
    .email-footer { background: linear-gradient(135deg, #f8f9fa 0%, #e6f0f9 100%); padding: 30px; text-align: center; border-top: 1px solid rgba(61,143,214,0.15); }
    .email-footer p { color: #64748b; font-size: 14px; margin: 8px 0; }
    .email-footer .copyright { color: #274060; font-weight: 600; margin-bottom: 10px; }
    @media only screen and (max-width: 600px) {
      .email-wrapper { margin: 10px; border-radius: 16px; }
      .email-header, .email-content, .email-footer { padding: 25px 20px; }
      .email-header h1 { font-size: 24px; }
      .cta-button { padding: 14px 32px; font-size: 15px; }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header">
      <div class="logo-container"><div class="logo-icon">${headerIcon}</div></div>
      <h1>${headerTitle}</h1>
      <p>${headerSubtitle}</p>
    </div>

    <div class="email-content">
      <div class="greeting">${greetingLine}</div>

      ${bodyParagraphs}

      <div class="info-card">
        <div class="info-card-title">
          <span>📋</span>
          <span>تفاصيل المنصب</span>
        </div>
        <div class="info-row"><span class="info-label">المنصب:</span> <strong>${escapeHtml(roleNameAr)}</strong></div>
        ${entityLine}
        <div class="info-row"><span class="info-label">التاريخ:</span> <strong>${escapeHtml(today)}</strong></div>
      </div>

      <div class="cta-container">
        <a href="${ADMIN_DASHBOARD_URL}" class="cta-button">${ctaLabel}</a>
      </div>

      <div class="closing-message">
        <p>نحن في نادي أدِيب نؤمن بقوة الإبداع والثقافة في بناء مجتمع واعٍ ومبدع، ونقدّر كل يدٍ تساهم في هذه الرسالة.</p>
        <div class="signature">
          مع أطيب التحيات،<br>
          <strong>إدارة نادي أدِيب</strong>
        </div>
      </div>
    </div>

    <div class="email-footer">
      <p class="copyright">جميع الحقوق محفوظة لنادي أدِيب</p>
      <p>نادي إبداعي ثقافي يهدف إلى نشر الثقافة والإبداع</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
