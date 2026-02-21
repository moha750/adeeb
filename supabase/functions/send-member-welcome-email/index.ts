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
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                  background: linear-gradient(135deg, #f8f9fa 0%, #e6f0f9 100%);
                  margin: 0; 
                  padding: 20px; 
                  line-height: 1.6;
                }
                .email-wrapper { 
                  max-width: 650px; 
                  margin: 0 auto; 
                  background: white; 
                  border-radius: 20px; 
                  overflow: hidden; 
                  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1), 0 5px 15px rgba(39, 64, 96, 0.2);
                  border: 1px solid rgba(255, 255, 255, 0.3);
                }
                .email-header { 
                  background: linear-gradient(135deg, #f8f9fa 0%, #e6f0f9 100%);
                  padding: 40px 30px; 
                  text-align: center; 
                  border-bottom: 1px solid rgba(61, 143, 214, 0.15);
                  position: relative;
                }
                .email-header::before {
                  content: "";
                  position: absolute;
                  top: 0;
                  right: 0;
                  width: 100%;
                  height: 5px;
                  background: linear-gradient(90deg, #3d8fd6, #274060);
                }
                .logo-container {
                  width: 100px;
                  height: 100px;
                  margin: 0 auto 20px;
                  background: linear-gradient(135deg, #3d8fd6, #274060);
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  box-shadow: 0 10px 30px rgba(61, 143, 214, 0.3);
                }
                .logo-icon {
                  font-size: 50px;
                  color: white;
                }
                .email-header h1 { 
                  color: #274060; 
                  font-size: 32px; 
                  margin-bottom: 10px;
                  font-weight: bold;
                }
                .email-header p { 
                  color: #64748b; 
                  font-size: 16px; 
                }
                .email-content { 
                  padding: 40px 35px; 
                  background: white;
                }
                .greeting { 
                  color: #274060; 
                  font-size: 20px; 
                  font-weight: 600;
                  margin-bottom: 20px;
                }
                .email-content p { 
                  color: #475569; 
                  line-height: 1.8; 
                  font-size: 16px; 
                  margin-bottom: 20px;
                }
                .info-card { 
                  background: linear-gradient(135deg, rgba(61, 143, 214, 0.05), rgba(61, 143, 214, 0.02));
                  border: 1px solid rgba(61, 143, 214, 0.15);
                  border-right: 4px solid #3d8fd6; 
                  padding: 25px; 
                  margin: 25px 0; 
                  border-radius: 12px;
                }
                .info-card-title {
                  color: #274060;
                  font-size: 18px;
                  font-weight: bold;
                  margin-bottom: 12px;
                  display: flex;
                  align-items: center;
                  gap: 10px;
                }
                .info-card p {
                  margin: 0;
                  color: #64748b;
                  font-size: 15px;
                }
                .cta-container { 
                  text-align: center; 
                  margin: 35px 0;
                }
                .cta-button { 
                  display: inline-block; 
                  background: linear-gradient(135deg, #3d8fd6, #274060);
                  color: white !important; 
                  padding: 18px 45px; 
                  text-decoration: none; 
                  border-radius: 12px; 
                  font-weight: bold; 
                  font-size: 18px;
                  box-shadow: 0 8px 20px rgba(61, 143, 214, 0.25);
                  transition: all 0.3s ease;
                }
                .warning-card { 
                  background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.05));
                  border: 1px solid rgba(245, 158, 11, 0.25);
                  border-right: 4px solid #f59e0b; 
                  padding: 20px; 
                  margin: 25px 0; 
                  border-radius: 12px;
                }
                .warning-card-title {
                  color: #92400e;
                  font-size: 17px;
                  font-weight: bold;
                  margin-bottom: 12px;
                  display: flex;
                  align-items: center;
                  gap: 8px;
                }
                .warning-card ul { 
                  margin: 12px 0 0 0; 
                  padding-right: 25px;
                  color: #92400e;
                }
                .warning-card li {
                  margin-bottom: 8px;
                  line-height: 1.6;
                }
                .data-list-title {
                  color: #274060;
                  font-size: 18px;
                  font-weight: bold;
                  margin: 30px 0 15px 0;
                }
                .data-grid {
                  display: grid;
                  grid-template-columns: repeat(2, 1fr);
                  gap: 12px;
                  margin: 20px 0;
                }
                .data-item {
                  background: #f8fafc;
                  padding: 12px 15px;
                  border-radius: 8px;
                  border: 1px solid #e2e8f0;
                  color: #475569;
                  font-size: 14px;
                  display: flex;
                  align-items: center;
                  gap: 8px;
                }
                .data-item-icon {
                  color: #3d8fd6;
                  font-size: 16px;
                }
                .closing-message {
                  margin-top: 40px;
                  padding-top: 30px;
                  border-top: 2px solid #e2e8f0;
                  color: #475569;
                  font-size: 16px;
                }
                .signature {
                  margin-top: 25px;
                  color: #274060;
                  font-weight: 600;
                }
                .email-footer { 
                  background: linear-gradient(135deg, #f8f9fa 0%, #e6f0f9 100%);
                  padding: 30px; 
                  text-align: center; 
                  border-top: 1px solid rgba(61, 143, 214, 0.15);
                }
                .email-footer p { 
                  color: #64748b; 
                  font-size: 14px; 
                  margin: 8px 0;
                }
                .email-footer .copyright {
                  color: #274060;
                  font-weight: 600;
                  margin-bottom: 10px;
                }
                .email-footer .disclaimer {
                  font-size: 12px; 
                  color: #94a3b8;
                  margin-top: 15px;
                }
                @media only screen and (max-width: 600px) {
                  .email-wrapper { margin: 10px; border-radius: 16px; }
                  .email-header, .email-content, .email-footer { padding: 25px 20px; }
                  .email-header h1 { font-size: 26px; }
                  .data-grid { grid-template-columns: 1fr; }
                  .cta-button { padding: 15px 35px; font-size: 16px; }
                }
              </style>
            </head>
            <body>
              <div class="email-wrapper">
                <div class="email-header">
                  <div class="logo-container">
                    <div class="logo-icon">🎓</div>
                  </div>
                  <h1>مبروك العضوية!</h1>
                  <p>مرحباً بك في عائلة نادي أدِيب</p>
                </div>
                
                <div class="email-content">
                  <div class="greeting">عزيزي/عزيزتي ${profile.full_name}،</div>
                  
                  <p>يسعدنا ويشرفنا أن نبلغك بأنه تم قبولك رسمياً في <strong>نادي أدِيب </strong>! 🎊</p>
                  
                  <p>نحن متحمسون لانضمامك إلى عائلتنا ، ونتطلع إلى مساهماتك القيّمة في مسيرة النادي.</p>
                  
                  <div class="info-card">
                    <div class="info-card-title">
                      <span>📋</span>
                      <span>الخطوة التالية</span>
                    </div>
                    <p>لإكمال عملية التسجيل وتفعيل حسابك بشكل كامل، يرجى تعبئة بياناتك الشخصية والأكاديمية من خلال الرابط أدناه. هذه الخطوة ضرورية للاستفادة من جميع خدمات النادي.</p>
                  </div>
                  
                  <div class="cta-container">
                    <a href="${actualUrl}" class="cta-button">
                      ✨ إكمال البيانات الآن
                    </a>
                  </div>
                  
                  <div class="warning-card">
                    <div class="warning-card-title">
                      <span>⚠️</span>
                      <span>معلومات مهمة</span>
                    </div>
                    <ul>
                      <li>الرابط صالح لمدة <strong>7 أيام</strong> من تاريخ استلام هذا الإيميل</li>
                      <li>يجب تعبئة جميع البيانات المطلوبة لتفعيل حسابك بالكامل</li>
                      <li>في حال انتهاء صلاحية الرابط، يرجى التواصل مع إدارة النادي</li>
                      <li>تأكد من صحة جميع البيانات المدخلة قبل الإرسال</li>
                    </ul>
                  </div>
                  
                  <div class="data-list-title">📝 البيانات المطلوبة:</div>
                  
                  <div class="data-grid">
                    <div class="data-item">
                      <span class="data-item-icon">👤</span>
                      <span>الاسم الثلاثي الكامل</span>
                    </div>
                    <div class="data-item">
                      <span class="data-item-icon">📱</span>
                      <span>رقم الجوال</span>
                    </div>
                    <div class="data-item">
                      <span class="data-item-icon">🆔</span>
                      <span>رقم الهوية الوطنية</span>
                    </div>
                    <div class="data-item">
                      <span class="data-item-icon">🎓</span>
                      <span>رقم السجل الأكاديمي</span>
                    </div>
                    <div class="data-item">
                      <span class="data-item-icon">📧</span>
                      <span>البريد الإلكتروني</span>
                    </div>
                    <div class="data-item">
                      <span class="data-item-icon">📚</span>
                      <span>الدرجة العلمية</span>
                    </div>
                    <div class="data-item">
                      <span class="data-item-icon">🏛️</span>
                      <span>الكلية والتخصص</span>
                    </div>
                    <div class="data-item">
                      <span class="data-item-icon">📅</span>
                      <span>تاريخ الميلاد</span>
                    </div>
                    <div class="data-item">
                      <span class="data-item-icon">👥</span>
                      <span>اللجنة المفضلة</span>
                    </div>
                    <div class="data-item">
                      <span class="data-item-icon">🌐</span>
                      <span>حسابات التواصل (اختياري)</span>
                    </div>
                  </div>
                  
                  <div class="closing-message">
                    <p>نحن في نادي أدِيب نؤمن بقوة الثقافة والمعرفة في بناء مجتمع واعٍ ومبدع. انضمامك إلينا يعزز هذه الرسالة ويثري مسيرتنا .</p>
                    
                    <p>نتطلع إلى رؤيتك في فعالياتنا وأنشطتنا القادمة! 🌟</p>
                    
                    <div class="signature">
                      مع أطيب التحيات،<br>
                      <strong>لجنة الموارد البشرية</strong>
                    </div>
                  </div>
                </div>
                
                <div class="email-footer">
                  <p class="copyright">© 2026 نادي أدِيب . جميع الحقوق محفوظة.</p>
                  <p>نادي طلابي ثقافي يهدف إلى نشر الثقافة والمعرفة</p>
                  <p class="disclaimer">إذا لم تقم بالتقديم لنادي أدِيب، يرجى تجاهل هذا الإيميل.</p>
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
