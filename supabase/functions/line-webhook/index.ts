import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

async function verifyLineSignature(rawBody: string, signatureHeader: string, channelSecret: string): Promise<boolean> {
  if (!signatureHeader || !channelSecret) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(channelSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const bytes = new Uint8Array(sigBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  const expectedSignature = btoa(binary);
  return expectedSignature === signatureHeader;
}

async function replyLineMessage(lineAccessToken: string, replyToken: string, text: string) {
  if (!replyToken) return;
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${lineAccessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }],
    }),
  });
}

async function pushLineText(lineAccessToken: string, to: string, text: string) {
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${lineAccessToken}`,
    },
    body: JSON.stringify({
      to,
      messages: [{ type: 'text', text }],
    }),
  });
  return res.ok;
}

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    return new Response('ok', { status: 200 });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const rawBody = await req.text();
    const channelSecret = Deno.env.get('LINE_MESSAGING_CHANNEL_SECRET') ?? '';
    if (channelSecret) {
      const signature = req.headers.get('x-line-signature') ?? '';
      const valid = await verifyLineSignature(rawBody, signature, channelSecret);
      if (!valid) {
        return new Response(JSON.stringify({ error: 'Invalid LINE signature' }), { status: 401 });
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const lineAccessToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') ?? '';
    const adminLineIdsEnv = Deno.env.get('LINE_ADMIN_USER_IDS') ?? '';

    if (!supabaseUrl || !serviceRoleKey || !lineAccessToken) {
      return new Response(JSON.stringify({ error: 'Missing required secrets' }), { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = JSON.parse(rawBody || '{}');
    const events = Array.isArray(body?.events) ? body.events : [];

    const envAdminIds = new Set(
      adminLineIdsEnv
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    );

    for (const event of events) {
      if (event?.type !== 'postback') continue;
      const params = new URLSearchParams(String(event?.postback?.data || ''));
      const action = params.get('action');
      const reportId = params.get('reportId');
      const actorLineId = String(event?.source?.userId || '').trim();
      const replyToken = String(event?.replyToken || '').trim();

      if (action !== 'ack_support' || !reportId || !actorLineId) continue;

      // Verify actor has admin role (in profiles or LINE_ADMIN_USER_IDS)
      let isAdmin = envAdminIds.has(actorLineId);
      if (!isAdmin) {
        const { data: adminProfile } = await supabaseAdmin
          .from('profiles')
          .select('id, role')
          .eq('line_user_id', actorLineId)
          .eq('role', 'admin')
          .maybeSingle();
        isAdmin = Boolean(adminProfile?.id);
      }

      if (!isAdmin) {
        await replyLineMessage(lineAccessToken, replyToken, 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถรับเรื่องได้');
        continue;
      }

      const { data: report, error: reportError } = await supabaseAdmin
        .from('support_reports')
        .select('id, user_id, category, status')
        .eq('id', reportId)
        .maybeSingle();

      if (reportError || !report) {
        await replyLineMessage(lineAccessToken, replyToken, 'ไม่พบรายการแจ้งปัญหานี้ในระบบ');
        continue;
      }

      const shortId = report.id.slice(0, 8).toUpperCase();
      if (report.status === 'in_progress' || report.status === 'resolved') {
        await replyLineMessage(lineAccessToken, replyToken, `รายการ #${shortId} ถูกรับเรื่องไปแล้วครับ`);
        continue;
      }

      const { error: updateError } = await supabaseAdmin
        .from('support_reports')
        .update({ status: 'in_progress' })
        .eq('id', report.id);

      if (updateError) {
        await replyLineMessage(lineAccessToken, replyToken, `อัปเดตสถานะไม่สำเร็จ: ${updateError.message}`);
        continue;
      }

      const { data: reporterProfile } = await supabaseAdmin
        .from('profiles')
        .select('line_user_id')
        .eq('id', report.user_id)
        .maybeSingle();

      if (reporterProfile?.line_user_id) {
        const ackMessage =
          `แอดมินได้รับเรื่องเรียบร้อยแล้ว กำลังตรวจสอบเพื่อแก้ไขปัญหาที่เกิดขึ้น ขอบคุณที่แจ้งปัญหาเข้ามา\n\n(รหัสเรื่อง #${shortId} • หัวข้อ: ${report.category})`;
        const pushed = await pushLineText(lineAccessToken, reporterProfile.line_user_id, ackMessage);
        if (pushed) {
          await replyLineMessage(
            lineAccessToken,
            replyToken,
            `รับเรื่อง #${shortId} และส่งข้อความแจ้งผู้แจ้งเรียบร้อยแล้ว ✅`
          );
        } else {
          await replyLineMessage(
            lineAccessToken,
            replyToken,
            `รับเรื่อง #${shortId} แล้ว แต่ไม่สามารถส่งข้อความหาผู้แจ้งได้ (อาจยังไม่ได้แอดเพื่อน LINE OA)`
          );
        }
      } else {
        await replyLineMessage(
          lineAccessToken,
          replyToken,
          `รับเรื่อง #${shortId} แล้ว (ผู้แจ้งยังไม่ได้ผูกบัญชี LINE)`
        );
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('line-webhook error:', err);
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), { status: 500 });
  }
});
