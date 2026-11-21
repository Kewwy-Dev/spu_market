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

interface LineVerifyResponse {
  sub: string;
  name?: string;
  picture?: string;
  email?: string;
  error?: string;
  error_description?: string;
}

async function verifyLineIdToken(idToken: string, channelId: string): Promise<LineVerifyResponse> {
  const params = new URLSearchParams({
    id_token: idToken,
    client_id: channelId,
  });

  const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = (await res.json()) as LineVerifyResponse;
  if (!res.ok || !data.sub) {
    throw new Error(data.error_description || data.error || 'LINE ID Token verification failed');
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const lineChannelId = Deno.env.get('LINE_LOGIN_CHANNEL_ID') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Supabase environment variables are not configured' }, 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const payload = await req.json().catch(() => ({}));
    const action = String(payload?.action || '').trim();

    if (action === 'unlink') {
      const authHeader = req.headers.get('Authorization') || '';
      const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (!jwt) return jsonResponse({ error: 'Missing Authorization header' }, 401);

      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);
      if (userError || !userData?.user) {
        return jsonResponse({ error: 'Invalid or expired user session' }, 401);
      }

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          line_user_id: null,
          line_display_name: null,
          line_linked_at: null,
        })
        .eq('id', userData.user.id);

      if (updateError) throw updateError;
      return jsonResponse({ unlinked: true });
    }

    if (!lineChannelId) {
      return jsonResponse({ error: 'LINE_LOGIN_CHANNEL_ID secret is not configured' }, 500);
    }

    const idToken = String(payload?.idToken || '').trim();
    if (!idToken) {
      return jsonResponse({ error: 'Missing LINE idToken' }, 400);
    }

    const lineClaims = await verifyLineIdToken(idToken, lineChannelId);
    const lineUserId = lineClaims.sub;
    const lineDisplayName = lineClaims.name || 'LINE User';

    if (action === 'link') {
      const authHeader = req.headers.get('Authorization') || '';
      const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (!jwt) return jsonResponse({ error: 'Missing Authorization header' }, 401);

      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);
      if (userError || !userData?.user) {
        return jsonResponse({ error: 'Invalid or expired user session' }, 401);
      }

      const userId = userData.user.id;

      // Ensure this LINE userId is not already linked to a different SPU account
      const { data: existingProfile, error: lookupError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('line_user_id', lineUserId)
        .maybeSingle();

      if (lookupError) throw lookupError;
      if (existingProfile && existingProfile.id !== userId) {
        return jsonResponse(
          { error: 'บัญชี LINE นี้ถูกผูกกับบัญชี SPU อื่นอยู่แล้ว กรุณายกเลิกการผูกจากบัญชีเดิมก่อน' },
          409
        );
      }

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          line_user_id: lineUserId,
          line_display_name: lineDisplayName,
          line_linked_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      return jsonResponse({
        linked: true,
        lineUserId,
        lineDisplayName,
      });
    }

    if (action === 'login') {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('line_user_id', lineUserId)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile?.id) {
        return jsonResponse({
          linked: false,
          lineProfile: {
            userId: lineUserId,
            displayName: lineDisplayName,
          },
        });
      }

      const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(
        profile.id
      );

      if (authUserError || !authUserData?.user?.email) {
        return jsonResponse({ error: 'ไม่พบอีเมลของบัญชีที่ผูกไว้' }, 404);
      }

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: authUserData.user.email,
      });

      if (linkError || !linkData?.properties?.hashed_token) {
        throw linkError || new Error('Could not generate login token');
      }

      return jsonResponse({
        linked: true,
        email: authUserData.user.email,
        token_hash: linkData.properties.hashed_token,
      });
    }

    return jsonResponse({ error: `Unsupported action: ${action}` }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return jsonResponse({ error: message }, 400);
  }
});
