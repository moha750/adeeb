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
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>دعوة تفعيل حساب أديب</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f5f7fa;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #274060 0%, #3d8fd6 100%);padding:40px 30px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">🎉 مرحباً بك في نادي أديب!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding:40px 30px;">
              <p style="margin:0 0 20px;color:#0f172a;font-size:18px;line-height:1.6;">
                مرحباً <strong>${full_name}</strong>،
              </p>
              
              <p style="margin:0 0 20px;color:#475569;font-size:16px;line-height:1.6;">
                يسعدنا انضمامك لعائلة نادي أديب! تم إنشاء حساب خاص بك في منصة النادي.
              </p>
              
              ${committee ? `
              <div style="background:#f0f9ff;border-right:4px solid #0ea5e9;padding:16px;border-radius:8px;margin:20px 0;">
                <p style="margin:0;color:#0c4a6e;font-size:15px;">
                  <strong>📋 لجنتك:</strong> ${committee}
                </p>
              </div>
              ` : ''}
              
              <p style="margin:20px 0;color:#475569;font-size:16px;line-height:1.6;">
                لتفعيل حسابك وإنشاء كلمة مرور، يرجى الضغط على الزر أدناه:
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
                <tr>
                  <td align="center">
                    <a href="${activationUrl}" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:18px;font-weight:600;box-shadow:0 4px 6px rgba(16,185,129,0.3);">
                      🔓 تفعيل الحساب
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin:20px 0;color:#64748b;font-size:14px;line-height:1.6;">
                أو انسخ الرابط التالي والصقه في المتصفح:
              </p>
              
              <div style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:8px;padding:12px;margin:10px 0;word-break:break-all;">
                <a href="${activationUrl}" style="color:#3d8fd6;text-decoration:none;font-size:13px;font-family:monospace;">${activationUrl}</a>
              </div>
              
              <!-- Warning Box -->
              <div style="background:#fef3c7;border-right:4px solid #f59e0b;padding:16px;border-radius:8px;margin:30px 0;">
                <p style="margin:0 0 8px;color:#92400e;font-size:15px;font-weight:600;">
                  ⏰ مهم:
                </p>
                <p style="margin:0;color:#78350f;font-size:14px;line-height:1.6;">
                  • هذا الرابط صالح لمدة <strong>7 أيام</strong> فقط<br>
                  • يمكن استخدامه <strong>مرة واحدة</strong> فقط<br>
                  • لا تشارك هذا الرابط مع أحد
                </p>
              </div>
              
              <p style="margin:20px 0;color:#475569;font-size:15px;line-height:1.6;">
                بعد التفعيل، ستتمكن من:
              </p>
              
              <ul style="color:#475569;font-size:15px;line-height:1.8;margin:10px 0;padding-right:20px;">
                <li>الوصول إلى لوحة التحكم الخاصة بك</li>
                <li>تحديث بياناتك الشخصية</li>
                <li>متابعة أنشطة النادي</li>
                <li>التواصل مع أعضاء اللجنة</li>
              </ul>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:30px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 10px;color:#64748b;font-size:14px;">
                نادي أديب - جامعة الملك فيصل
              </p>
              <p style="margin:0 0 15px;color:#94a3b8;font-size:13px;">
                نادي ثقافي إبداعي يُثري المحتوى الثقافي والإبداعي
              </p>
              <div style="margin:15px 0;">
                <a href="https://www.adeeb.club" style="color:#3d8fd6;text-decoration:none;margin:0 10px;font-size:13px;">🌐 الموقع</a>
                <a href="https://twitter.com/AB_KFU" style="color:#3d8fd6;text-decoration:none;margin:0 10px;font-size:13px;">🐦 تويتر</a>
                <a href="https://instagram.com/adeeb_kfu" style="color:#3d8fd6;text-decoration:none;margin:0 10px;font-size:13px;">📷 انستقرام</a>
              </div>
              <p style="margin:15px 0 0;color:#94a3b8;font-size:12px;">
                إذا لم تطلب هذه الدعوة، يرجى تجاهل هذا البريد
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
