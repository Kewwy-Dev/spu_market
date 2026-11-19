import { supabase } from './supabase';

export const READ_NOTIFICATION_TTL_MS = 10 * 60 * 1000;

export function isNotificationExpired(item, now = Date.now()) {
  if (!item?.is_read || !item?.read_at) return false;
  const readTime = new Date(item.read_at).getTime();
  if (Number.isNaN(readTime)) return false;
  return now - readTime >= READ_NOTIFICATION_TTL_MS;
}

export async function deleteExpiredReadNotifications(userId) {
  if (!supabase || !userId) return;
  const cutoffIso = new Date(Date.now() - READ_NOTIFICATION_TTL_MS).toISOString();
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .eq('is_read', true)
    .lte('read_at', cutoffIso);
  if (error && error.code !== '42P01' && error.code !== 'PGRST205') {
    console.error('Could not delete expired read notifications:', error.message);
  }
}

export async function listNotifications(userId, { limit = 40 } = {}) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('id,user_id,category,event_type,title,body,target_type,target_id,group_key,is_read,read_at,created_at,updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    // Gracefully return empty list if migration has not been applied yet
    if (error.code === '42P01' || error.code === 'PGRST205') return [];
    throw error;
  }

  const rows = data || [];
  const now = Date.now();
  const hasExpired = rows.some((item) => isNotificationExpired(item, now));
  if (hasExpired) {
    void deleteExpiredReadNotifications(userId);
  }
  return rows.filter((item) => !isNotificationExpired(item, now));
}

export async function markNotificationRead(notificationId, userId) {
  if (!supabase || !notificationId || !userId) return;
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId);
  if (error && error.code !== '42P01' && error.code !== 'PGRST205') {
    console.error('Could not mark notification as read:', error.message);
  }
}

export async function markAllNotificationsRead(userId) {
  if (!supabase || !userId) return;
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error && error.code !== '42P01' && error.code !== 'PGRST205') {
    console.error('Could not mark all notifications as read:', error.message);
  }
}

export function formatRelativeNotificationTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs)) return '';
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'เมื่อสักครู่';
  if (diffMinutes < 60) return `${diffMinutes} นาที`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} ชม.`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'เมื่อวาน';
  if (diffDays < 7) return `${diffDays} วัน`;
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}
