// Edge Function: send-member-invitation
// Purpose: Send activation invitation email to members

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

interface InvitationRequest {
  member_id: string
  email: string
  full_name: string
  committee?: string
}

interface InvitationResponse {
  success: boolean
  message: string
  invitation_id?: string
  email_id?: string
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ success: false, message: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract JWT token from Authorization header
    const jwt = authHeader.replace('Bearer ', '')
    
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey
    )

    // Verify user is authenticated using JWT
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(jwt)

    if (userError) {
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({ success: false, message: `Authentication failed: ${userError.message}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, message: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create authenticated client for subsequent requests
    const authenticatedClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify user is admin
    const { data: adminData, error: adminError } = await authenticatedClient
      .from('admins')
      .select('user_id, is_admin')
      .eq('user_id', user.id)
      .eq('is_admin', true)
      .maybeSingle()

    if (adminError) {
      console.error('Admin check error:', adminError)
      return new Response(
        JSON.stringify({ success: false, message: `Admin verification failed: ${adminError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!adminData) {
      return new Response(
        JSON.stringify({ success: false, message: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body: InvitationRequest = await req.json()
    const { member_id, email, full_name, committee } = body

    if (!member_id || !email || !full_name) {
      throw new Error('Missing required fields: member_id, email, full_name')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format')
    }

    // Check if member already has an account
    const { data: memberData, error: memberError } = await authenticatedClient
      .from('members')
      .select('user_id, account_status')
      .eq('id', member_id)
      .maybeSingle()

    if (memberError) {
      throw new Error(`Failed to fetch member: ${memberError.message}`)
    }

    if (memberData?.user_id) {
      throw new Error('Member account is already activated')
    }

    // Generate invitation token
    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Valid for 7 days

    // Insert invitation record
    const { data: invitationData, error: invitationError } = await authenticatedClient
      .from('member_invitations')
      .insert({
        member_id,
        email,
        invitation_token: token,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
      })
      .select('id')
      .single()

    if (invitationError) {
      throw new Error(`Failed to create invitation: ${invitationError.message}`)
    }

    // Generate activation URL
    const activationUrl = `https://www.adeeb.club/members/activate.html?token=${token}`

    // Prepare email content
    const emailHtml = `
<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>دعوة تفعيل حساب أديب</title>
  </head>
  <body style="margin:0;background:#f6f9fc;color:#274060;font-family:-apple-system,Segoe UI,Tahoma,Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f9fc;direction:rtl;">
      <tr>
        <td align="center" style="padding:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6eef7;">
            
            <!-- Header Gradient Bar -->
            <tr>
              <td style="height:4px;background:linear-gradient(135deg,#3d8fd6,#274060);"></td>
            </tr>
            
            <!-- Logo Section -->
            <tr>
              <td style="padding:24px 24px 8px 24px;text-align:center;">
                <img src="https://www.adeeb.club/adeeb-logo.png" alt="شعار نادي أدِيب" width="80" style="display:block;margin:0 auto 8px auto;" />
              </td>
            </tr>
            
            <!-- Main Content -->
            <tr>
              <td style="padding:8px 24px 0 24px;">
                <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.5;color:#274060;text-align:center;">مرحباً بك في نادي أديب!</h1>
                
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.9;color:#335c81;">
                  أهلاً أهلاً <strong>${full_name}</strong>،
                </p>
                
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.9;color:#335c81;">
                  منوّر منصة أديب.
                </p>
                
                ${committee ? `
                <div style="background:#f0f9ff;border-right:3px solid #3d8fd6;padding:12px 16px;border-radius:8px;margin:16px 0;">
                  <p style="margin:0;color:#274060;font-size:14px;font-weight:600;">
                    📋 لجنتك: <span style="font-weight:400;">${committee}</span>
                  </p>
                </div>
                ` : ''}
                
                <p style="margin:16px 0;font-size:15px;line-height:1.9;color:#335c81;">
                  لتفعيل حسابك وإنشاء كلمة مرور، يرجى الضغط على الزر أدناه:
                </p>
              </td>
            </tr>
            
            <!-- CTA Button -->
            <tr>
              <td align="center" style="padding:16px 24px;">
                <a href="${activationUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#3d8fd6,#274060);color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:16px;box-shadow:0 2px 8px rgba(61,143,214,0.25);">
                  🔓 تفعيل الحساب
                </a>
              </td>
            </tr>
            
            <!-- Alternative Link -->
            <tr>
              <td style="padding:0 24px 16px 24px;">
                <p style="margin:0 0 8px 0;font-size:13px;line-height:1.8;color:#5b708d;">
                  إذا لم يعمل الزر، انسخ الرابط التالي والصقه في المتصفح:
                </p>
                <div style="background:#f8fafc;border:1px solid #e6eef7;border-radius:8px;padding:10px;word-break:break-all;">
                  <a href="${activationUrl}" style="color:#3d8fd6;text-decoration:none;font-size:12px;">${activationUrl}</a>
                </div>
              </td>
            </tr>
            
            <!-- Warning Box -->
            <tr>
              <td style="padding:0 24px 16px 24px;">
                <div style="background:#fff7ed;border-right:3px solid #f59e0b;padding:12px 16px;border-radius:8px;">
                  <p style="margin:0 0 6px 0;color:#92400e;font-size:13px;font-weight:600;">
                    ⏰ مهم:
                  </p>
                  <p style="margin:0;color:#78350f;font-size:13px;line-height:1.7;">
                    • هذا الرابط صالح لمدة <strong>7 أيام</strong> فقط<br>
                    • يمكن استخدامه <strong>مرة واحدة</strong> فقط<br>
                    • لا تشارك هذا الرابط مع أحد
                  </p>
                </div>
              </td>
            </tr>
            
            <!-- Features List -->
            <tr>
              <td style="padding:0 24px 16px 24px;">
                <p style="margin:0 0 10px 0;font-size:14px;line-height:1.8;color:#335c81;font-weight:600;">
                  بعد التفعيل، ستتمكن من:
                </p>
                <ul style="margin:0;padding:0 0 0 20px;color:#5b708d;font-size:14px;line-height:1.9;">
                  <li>الوصول إلى لوحة التحكم الخاصة بك</li>
                  <li>تحديث بياناتك الشخصية</li>
                  <li>متابعة أنشطة النادي</li>
                </ul>
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="padding:16px 24px 24px 24px;">
                <hr style="border:none;border-top:1px solid #e6eef7;margin:0 0 16px 0;" />
                
                <p style="margin:0 0 8px 0;font-size:13px;color:#274060;font-weight:600;text-align:center;">
                  نادي أديب - جامعة الملك فيصل
                </p>
                <p style="margin:0 0 12px 0;font-size:12px;color:#6b7d93;text-align:center;">
                  نادي ثقافي إبداعي يُثري المحتوى الثقافي والإبداعي
                </p>
                
                <div style="text-align:center;margin:12px 0;">
                  <a href="https://www.adeeb.club" style="color:#3d8fd6;text-decoration:none;margin:0 8px;font-size:12px;">🌐 الموقع</a>
                  <span style="color:#cbd5e1;">•</span>
                  <a href="https://twitter.com/AB_KFU" style="color:#3d8fd6;text-decoration:none;margin:0 8px;font-size:12px;">🐦 تويتر</a>
                  <span style="color:#cbd5e1;">•</span>
                  <a href="https://instagram.com/adeeb_kfu" style="color:#3d8fd6;text-decoration:none;margin:0 8px;font-size:12px;">📷 انستقرام</a>
                </div>
                
                <p style="margin:6px 0 0 0;font-size:11px;color:#94a3b8;text-align:center;">
                  للاستفسار: <a href="mailto:adeab.kfu@gmail.com" style="color:#3d8fd6;text-decoration:none;">adeab.kfu@gmail.com</a>
                </p>
              </td>
            </tr>
            
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
    `

    const emailText = `
مرحباً ${full_name}،

يسعدنا انضمامك لعائلة نادي أديب! تم إنشاء حساب خاص بك في منصة النادي.

${committee ? `لجنتك: ${committee}\n` : ''}

لتفعيل حسابك وإنشاء كلمة مرور، يرجى زيارة الرابط التالي:
${activationUrl}

⏰ مهم:
• هذا الرابط صالح لمدة 7 أيام فقط
• يمكن استخدامه مرة واحدة فقط
• لا تشارك هذا الرابط مع أحد

بعد التفعيل، ستتمكن من:
• الوصول إلى لوحة التحكم الخاصة بك
• تحديث بياناتك الشخصية
• متابعة أنشطة النادي
• التواصل مع أعضاء اللجنة

نادي أديب - جامعة الملك فيصل
https://www.adeeb.club

إذا لم تطلب هذه الدعوة، يرجى تجاهل هذا البريد.
    `

    // Send email using Resend
    let emailId = null
    
    if (RESEND_API_KEY) {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'نادي أديب <noreply@adeeb.club>',
          to: [email],
          subject: '🎉 دعوة تفعيل حساب نادي أديب',
          html: emailHtml,
          text: emailText,
        }),
      })

      if (!resendResponse.ok) {
        const errorData = await resendResponse.json()
        console.error('Resend API error:', errorData)
        throw new Error(`Failed to send email: ${errorData.message || 'Unknown error'}`)
      }

      const resendData = await resendResponse.json()
      emailId = resendData.id
    } else {
      console.warn('RESEND_API_KEY not configured, email not sent')
    }

    // Return success response
    const response: InvitationResponse = {
      success: true,
      message: 'Invitation sent successfully',
      invitation_id: invitationData.id,
      email_id: emailId || undefined,
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message.includes('Unauthorized') ? 401 : 400,
      }
    )
  }
})
