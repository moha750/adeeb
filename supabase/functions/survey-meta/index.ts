import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const surveyId = url.searchParams.get('id');

    if (!surveyId) {
      return new Response('Survey ID is required', { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch survey data
    const { data: survey, error } = await supabase
      .from('surveys')
      .select('id, title, description, status')
      .eq('id', surveyId)
      .single();

    if (error || !survey) {
      return new Response('Survey not found', { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    // Generate dynamic meta tags
    const title = survey.title ? `${survey.title} — نادي أدِيب` : 'استبيان — نادي أدِيب';
    const description = survey.description || 'شارك في استبيان نادي أدِيب';
    const baseUrl = 'https://adeeb.club';
    const surveyUrl = `${baseUrl}/surveys/survey.html?id=${surveyId}`;
    const imageUrl = `${baseUrl}/Adeeb-Thumbnail.png`;

    // Generate complete HTML with dynamic meta tags
    const html = `<!doctype html>
<html dir="rtl" lang="ar">

<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(surveyUrl)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:site_name" content="نادي أدِيب" />
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
    
    <!-- Redirect to actual survey page -->
    <meta http-equiv="refresh" content="0; url=${escapeHtml(surveyUrl)}" />
    <script>window.location.href = '${escapeHtml(surveyUrl)}';</script>
    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" />
    <link rel="stylesheet" href="https://adeeb.club/surveys/survey.css" />
    <link rel="icon" type="image/png" href="https://adeeb.club/favicon/favicon-32x32.png" />
    <link rel="apple-touch-icon" href="https://adeeb.club/adeeb-logo.png" />
</head>

<body>
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: Arial, sans-serif; background: linear-gradient(135deg, #f8f9fa 0%, #e6f0f9 100%);">
        <div style="text-align: center;">
            <div style="font-size: 3rem; color: #3d8fd6; margin-bottom: 1rem;">
                <i class="fa-solid fa-spinner fa-spin"></i>
            </div>
            <h2 style="color: #274060; margin-bottom: 0.5rem;">جاري التحميل...</h2>
            <p style="color: #64748b;">سيتم توجيهك إلى الاستبيان</p>
        </div>
    </div>
</body>

</html>`;

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
