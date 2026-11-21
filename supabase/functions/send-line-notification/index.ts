import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface NotificationRecord {
  id: string;
  user_id: string;
  category: 'chat' | 'pickup' | 'review';
  event_type: string;
  title: string;
  body: string;
  target_type: 'chat' | 'pickup' | 'seller_reviews';
  target_id: string | null;
  is_read: boolean;
}

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  chat: { label: 'ข้อความแชทใหม่', color: '#e6007e' },
  pickup: { label: 'อัปเดตนัดรับสินค้า', color: '#059669' },
  review: { label: 'รีวิวผู้ขาย', color: '#d97706' },
};

function buildTargetUrl(liffId: string, webBaseUrl: string, record: NotificationRecord): string {
  let path = '/home';
  if ((record.target_type === 'chat' || record.target_type === 'pickup') && record.target_id) {
    path = `/chat/${encodeURIComponent(record.target_id)}`;
  } else if (record.target_type === 'seller_reviews' && record.target_id) {
    path = `/seller/${encodeURIComponent(record.target_id)}`;
  }

  if (liffId) {
    return `https://liff.line.me/${liffId}${path}`;
  }
  const cleanBase = webBaseUrl.replace(/\/+$/, '');
  return `${cleanBase}${path}`;
}

function buildFlexMessage(record: NotificationRecord, actionUrl: string) {
  const meta = CATEGORY_META[record.category] || { label: 'แจ้งเตือน SPU Market', color: '#e6007e' };
  const bodyText = record.body?.trim() || 'มีรายการอัปเดตใหม่ใน SPU Market';

  return {
    type: 'flex',
    altText: `${record.title}${record.body ? `: ${record.body}` : ''}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'horizontal',
        backgroundColor: meta.color,
        paddingAll: '12px',
        contents: [
          {
            type: 'text',
            text: `SPU Market • ${meta.label}`,
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
            text: record.title || 'การแจ้งเตือนใหม่',
            weight: 'bold',
            size: 'md',
            color: '#0f172a',
            wrap: true,
          },
          {
            type: 'text',
            text: bodyText,
            size: 'sm',
            color: '#475569',
            wrap: true,
            maxLines: 4,
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '12px',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#e6007e',
            height: 'sm',
            action: {
              type: 'uri',
              label: 'เปิดดูใน SPU Market',
              uri: actionUrl,
            },
          },
        ],
      },
    },
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const webhookSecret = Deno.env.get('LINE_WEBHOOK_SECRET');
    if (webhookSecret) {
      const providedSecret = req.headers.get('x-webhook-secret') || '';
      if (providedSecret !== webhookSecret) {
        return new Response(JSON.stringify({ error: 'Unauthorized webhook' }), { status: 401 });
      }
    }

    const lineAccessToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') ?? '';
    const liffId = Deno.env.get('LIFF_ID') ?? '';
    const webBaseUrl = Deno.env.get('WEB_APP_URL') ?? 'https://spu-market.vercel.app';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!lineAccessToken || !supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Missing required environment secrets' }), { status: 500 });
    }

    const payload = await req.json();
    const record = payload?.record as NotificationRecord | undefined;

    if (!record || !record.user_id) {
      return new Response(JSON.stringify({ skipped: 'No notification record' }), { status: 200 });
    }

    // Do not push when a notification is updated only to mark it as read
    if (record.is_read) {
      return new Response(JSON.stringify({ skipped: 'Already read' }), { status: 200 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('line_user_id, line_notify_enabled, line_notify_categories')
      .eq('id', record.user_id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile?.line_user_id || !profile.line_notify_enabled) {
      return new Response(JSON.stringify({ skipped: 'LINE notifications not enabled or not linked' }), {
        status: 200,
      });
    }

    const categories = (profile.line_notify_categories as Record<string, boolean> | null) || {};
    if (categories[record.category] === false) {
      return new Response(JSON.stringify({ skipped: `Category ${record.category} disabled` }), { status: 200 });
    }

    const actionUrl = buildTargetUrl(liffId, webBaseUrl, record);
    const flexMessage = buildFlexMessage(record, actionUrl);

    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${lineAccessToken}`,
      },
      body: JSON.stringify({
        to: profile.line_user_id,
        messages: [flexMessage],
      }),
    });

    if (!lineRes.ok) {
      const errText = await lineRes.text();
      console.error('LINE push failed:', lineRes.status, errText);
      return new Response(JSON.stringify({ error: 'LINE push failed', detail: errText }), { status: 502 });
    }

    return new Response(JSON.stringify({ sent: true, to: profile.line_user_id }), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('send-line-notification error:', message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
