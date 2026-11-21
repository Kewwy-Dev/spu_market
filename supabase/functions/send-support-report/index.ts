import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface SupportReport {
  id: string;
  user_id: string;
  reporter_name: string;
  reporter_email: string;
  reporter_student_id: string;
  category: string;
  description: string;
  image_url: string | null;
  created_at: string;
}

function buildSupportFlexMessage(report: SupportReport, { isAdminCopy }: { isAdminCopy: boolean }) {
  const shortId = report.id.slice(0, 8).toUpperCase();
  const headerTitle = isAdminCopy
    ? `แจ้งปัญหาใหม่ #${shortId}`
    : `ส่งเรื่องแจ้งปัญหาแล้ว #${shortId}`;

  const contents: Record<string, unknown> = {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: isAdminCopy ? '#e6007e' : '#059669',
      paddingAll: '12px',
      contents: [
        {
          type: 'text',
          text: `SPU Market • ${headerTitle}`,
          color: '#ffffff',
          size: 'xs',
          weight: 'bold',
          wrap: true,
        },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      paddingAll: '16px',
      contents: [
        {
          type: 'text',
          text: `หัวข้อ: ${report.category}`,
          weight: 'bold',
          size: 'md',
          color: '#0f172a',
          wrap: true,
        },
        {
          type: 'text',
          text: report.description,
          size: 'sm',
          color: '#334155',
          wrap: true,
          maxLines: 6,
        },
        {
          type: 'separator',
          margin: 'md',
        },
        {
          type: 'text',
          text: `ผู้แจ้ง: ${report.reporter_name || 'สมาชิก SPU'}${report.reporter_student_id ? ` (${report.reporter_student_id})` : ''}`,
          size: 'xs',
          color: '#64748b',
          wrap: true,
          margin: 'sm',
        },
        ...(report.reporter_email
          ? [
              {
                type: 'text',
                text: `อีเมล: ${report.reporter_email}`,
                size: 'xs',
                color: '#64748b',
                wrap: true,
              },
            ]
          : []),
      ],
    },
  };

  if (report.image_url) {
    contents.hero = {
      type: 'image',
      url: report.image_url,
      size: 'full',
      aspectRatio: '16:9',
      aspectMode: 'cover',
      action: {
        type: 'uri',
        uri: report.image_url,
      },
    };
  }

  return {
    type: 'flex',
    altText: `[แจ้งปัญหา: ${report.category}] ${report.description.slice(0, 80)}`,
    contents,
  };
}

async function pushLineMessage(lineAccessToken: string, to: string, message: unknown) {
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${lineAccessToken}`,
    },
    body: JSON.stringify({
      to,
      messages: [message],
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error(`LINE push to ${to} failed:`, res.status, detail);
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const lineAccessToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') ?? '';
    const adminLineIdsEnv = Deno.env.get('LINE_ADMIN_USER_IDS') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Supabase environment variables are not configured' }, 500);
    }

    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    if (userError || !userData?.user) {
      return jsonResponse({ error: 'Invalid user session' }, 401);
    }

    const payload = await req.json().catch(() => ({}));
    const reportId = String(payload?.reportId || '').trim();
    if (!reportId) {
      return jsonResponse({ error: 'Missing reportId' }, 400);
    }

    const { data: report, error: reportError } = await supabaseAdmin
      .from('support_reports')
      .select('*')
      .eq('id', reportId)
      .eq('user_id', userData.user.id)
      .single();

    if (reportError || !report) {
      return jsonResponse({ error: 'Support report not found' }, 404);
    }

    if (!lineAccessToken) {
      return jsonResponse({ sent: false, reason: 'LINE_CHANNEL_ACCESS_TOKEN not configured' });
    }

    // Collect admin LINE user IDs from profiles (role = 'admin') + LINE_ADMIN_USER_IDS secret
    const adminLineIds = new Set<string>(
      adminLineIdsEnv
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    );

    const { data: adminProfiles } = await supabaseAdmin
      .from('profiles')
      .select('line_user_id')
      .eq('role', 'admin')
      .not('line_user_id', 'is', null);

    for (const admin of adminProfiles || []) {
      if (admin.line_user_id) {
        adminLineIds.add(admin.line_user_id);
      }
    }

    // Also get reporter's LINE user ID to send a confirmation receipt in LINE OA
    const { data: reporterProfile } = await supabaseAdmin
      .from('profiles')
      .select('line_user_id')
      .eq('id', report.user_id)
      .maybeSingle();

    const reporterLineId = reporterProfile?.line_user_id || null;

    let sentCount = 0;
    const adminFlex = buildSupportFlexMessage(report as SupportReport, { isAdminCopy: true });
    for (const adminLineId of adminLineIds) {
      const ok = await pushLineMessage(lineAccessToken, adminLineId, adminFlex);
      if (ok) sentCount += 1;
    }

    // Send confirmation receipt to the reporter if they linked LINE (and weren't already notified as admin)
    if (reporterLineId && !adminLineIds.has(reporterLineId)) {
      const receiptFlex = buildSupportFlexMessage(report as SupportReport, { isAdminCopy: false });
      const ok = await pushLineMessage(lineAccessToken, reporterLineId, receiptFlex);
      if (ok) sentCount += 1;
    }

    return jsonResponse({ sent: sentCount > 0, sentCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return jsonResponse({ error: message }, 500);
  }
});
