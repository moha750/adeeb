import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// إنشاء عميل Supabase بصلاحيات Service Role
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface WelcomeEmailRequest {
  userId: string;
  interviewId?: string;
  applicationId?: string;
}

/**
 * Edge Function لإرسال إيميل ترحيبي للعضو الجديد مع رابط تعبئة البيانات
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // الحصول على JWT من الهيدر
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // التحقق من هوية المسؤول
    const authToken = authHeader.replace('Bearer ', '');
    const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(authToken);
    
    if (authError || !adminUser) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // التحقق من صلاحيات المسؤول
    const { data: adminRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role:roles(role_level)')
      .eq('user_id', adminUser.id)
      .eq('is_active', true)
      .single();

    if (!adminRoles || adminRoles.role.role_level < 7) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // قراءة البيانات من الطلب
    const { userId, interviewId, applicationId }: WelcomeEmailRequest = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 1. جلب بيانات المستخدم
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    // 2. جلب بيانات الطلب والمقابلة
    let applicationData = null;
    if (applicationId) {
      const { data } = await supabaseAdmin
        .from('membership_applications')
        .select('phone, preferred_committee')
        .eq('id', applicationId)
        .single();
      applicationData = data;
    }

    // 3. إنشاء token فريد للرابط
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // صلاحية 7 أيام

    // 4. حفظ token في قاعدة البيانات
    const { error: tokenError } = await supabaseAdmin
      .from('member_onboarding_tokens')
      .insert({
        user_id: userId,
        token: token,
        interview_id: interviewId,
        application_id: applicationId,
        expires_at: expiresAt.toISOString(),
        sent_to_email: profile.email,
        is_used: false
      });

    if (tokenError) {
      throw new Error(`Failed to create token: ${tokenError.message}`);
    }

    // 5. إنشاء رابط التعبئة
    const onboardingUrl = `${SUPABASE_URL.replace('supabase.co', 'supabase.co')}/member-onboarding?token=${token}`;
    
    // ملاحظة: في الإنتاج، استبدل بالدومين الحقيقي
    const actualUrl = onboardingUrl.replace(SUPABASE_URL, 'https://adeeb-club.com');

    // 6. إرسال الإيميل
    // هنا يمكنك استخدام خدمة إرسال الإيميلات مثل:
    // - Resend
    // - SendGrid
    // - AWS SES
    // - أو أي خدمة أخرى
    
    // مثال باستخدام Resend (يتطلب API Key):
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    if (RESEND_API_KEY) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'نادي أدِيب <onboarding@resend.dev>',
          to: [profile.email],
          subject: '🎉 مبروك! تم قبولك في نادي أدِيب',
          html: `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
                .header h1 { margin: 0; font-size: 28px; }
                .content { padding: 40px 30px; }
                .content h2 { color: #333; margin-top: 0; }
                .content p { color: #555; line-height: 1.8; font-size: 16px; }
                .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; font-size: 18px; }
                .cta-button:hover { opacity: 0.9; }
                .info-box { background: #f8f9fa; border-right: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 8px; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #777; font-size: 14px; }
                .warning { background: #fff3cd; border-right: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 8px; color: #856404; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 مبروك العضوية!</h1>
                </div>
                <div class="content">
                  <h2>عزيزي/عزيزتي ${profile.full_name}،</h2>
                  <p>يسعدنا أن نبلغك بأنه تم قبولك رسمياً في <strong>نادي أدِيب الثقافي</strong>! 🎊</p>
                  
                  <div class="info-box">
                    <p style="margin: 0;"><strong>📋 الخطوة التالية:</strong></p>
                    <p style="margin: 10px 0 0 0;">لإكمال عملية التسجيل وتفعيل حسابك، يرجى تعبئة بياناتك الشخصية والأكاديمية من خلال الرابط أدناه:</p>
                  </div>
                  
                  <div style="text-align: center;">
                    <a href="${actualUrl}" class="cta-button">
                      📝 إكمال البيانات الآن
                    </a>
                  </div>
                  
                  <div class="warning">
                    <p style="margin: 0;"><strong>⚠️ مهم:</strong></p>
                    <ul style="margin: 10px 0 0 0; padding-right: 20px;">
                      <li>الرابط صالح لمدة <strong>7 أيام</strong> من تاريخ استلام هذا الإيميل</li>
                      <li>يجب تعبئة جميع البيانات المطلوبة لتفعيل حسابك</li>
                      <li>في حال انتهاء صلاحية الرابط، يرجى التواصل مع الإدارة</li>
                    </ul>
                  </div>
                  
                  <p><strong>البيانات المطلوبة:</strong></p>
                  <ul style="color: #555; line-height: 2;">
                    <li>الاسم الثلاثي الكامل</li>
                    <li>رقم الجوال</li>
                    <li>رقم الهوية الوطنية</li>
                    <li>رقم السجل الأكاديمي</li>
                    <li>البريد الإلكتروني</li>
                    <li>الدرجة العلمية</li>
                    <li>الكلية والتخصص (إن وجد)</li>
                    <li>تاريخ الميلاد</li>
                    <li>اللجنة</li>
                    <li>حسابات التواصل الاجتماعي (اختياري)</li>
                  </ul>
                  
                  <p>نحن متحمسون لانضمامك إلى عائلة أدِيب! 🌟</p>
                  
                  <p style="margin-top: 30px;">مع أطيب التحيات،<br><strong>فريق نادي أدِيب الثقافي</strong></p>
                </div>
                <div class="footer">
                  <p>© 2026 نادي أدِيب الثقافي. جميع الحقوق محفوظة.</p>
                  <p style="font-size: 12px; color: #999;">إذا لم تقم بالتقديم لنادي أدِيب، يرجى تجاهل هذا الإيميل.</p>
                </div>
              </div>
            </body>
            </html>
          `
        })
      });

      if (!emailResponse.ok) {
        console.error('Failed to send email:', await emailResponse.text());
        // لا نفشل العملية إذا فشل الإيميل
      }
    } else {
      console.log('RESEND_API_KEY not configured. Email not sent.');
      console.log('Onboarding URL:', actualUrl);
    }

    // 7. تسجيل النشاط
    await supabaseAdmin
      .from('activity_log')
      .insert({
        user_id: adminUser.id,
        action: 'send_welcome_email',
        entity_type: 'member_onboarding',
        entity_id: userId,
        details: {
          token_id: token,
          email: profile.email,
          expires_at: expiresAt.toISOString()
        }
      });

    return new Response(JSON.stringify({
      success: true,
      message: 'Welcome email sent successfully',
      data: {
        token: token,
        onboarding_url: actualUrl,
        expires_at: expiresAt.toISOString(),
        email_sent: !!RESEND_API_KEY
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error sending welcome email:', error);
    return new Response(JSON.stringify({
      error: 'Failed to send welcome email',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
