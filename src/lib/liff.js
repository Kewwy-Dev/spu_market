import liff from '@line/liff';
import { supabase } from './supabase';

const LIFF_ID = (import.meta.env.VITE_LIFF_ID || '').trim();
const LINE_OA_URL = (import.meta.env.VITE_LINE_OA_URL || '').trim();

let liffInitPromise = null;
let liffInitialized = false;

export function isLiffConfigured() {
  return Boolean(LIFF_ID);
}

export function getLineOaUrl() {
  return LINE_OA_URL;
}

export async function initLiff() {
  if (!LIFF_ID) {
    return { initialized: false, inClient: false, loggedIn: false };
  }
  if (liffInitialized) {
    return {
      initialized: true,
      inClient: liff.isInClient(),
      loggedIn: liff.isLoggedIn(),
    };
  }
  if (!liffInitPromise) {
    liffInitPromise = liff
      .init({ liffId: LIFF_ID })
      .then(() => {
        liffInitialized = true;
        return {
          initialized: true,
          inClient: liff.isInClient(),
          loggedIn: liff.isLoggedIn(),
        };
      })
      .catch((error) => {
        console.warn('LIFF init failed (running in standard web mode):', error?.message || error);
        liffInitPromise = null;
        return { initialized: false, inClient: false, loggedIn: false, error };
      });
  }
  return liffInitPromise;
}

export function isInLiffClient() {
  return liffInitialized && liff.isInClient();
}

export function isLiffLoggedIn() {
  return liffInitialized && liff.isLoggedIn();
}

export function getLiffIdToken() {
  if (!liffInitialized || !liff.isLoggedIn()) return null;
  return liff.getIDToken() || null;
}

export function loginWithLiff(redirectUri) {
  if (!liffInitialized) return;
  if (!liff.isLoggedIn()) {
    liff.login(redirectUri ? { redirectUri } : undefined);
  }
}

export async function getLiffFriendshipStatus() {
  if (!liffInitialized || !liff.isLoggedIn()) return null;
  try {
    return await liff.getFriendship();
  } catch {
    return null;
  }
}

export function openExternalUrl(url) {
  if (!url) return;
  if (isInLiffClient()) {
    liff.openWindow({ url, external: true });
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

async function callLineAuthFunction(body) {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  const { data, error } = await supabase.functions.invoke('line-auth', { body });
  if (error) {
    throw new Error(error.message || 'LINE auth service error');
  }
  if (data?.error) {
    throw new Error(data.error);
  }
  return data;
}

export async function tryAutoLoginWithLiff() {
  const status = await initLiff();
  if (!status.initialized || !status.loggedIn) {
    return { linked: false };
  }
  const idToken = getLiffIdToken();
  if (!idToken) {
    return { linked: false };
  }

  const data = await callLineAuthFunction({ action: 'login', idToken });
  if (!data?.linked || !data?.token_hash) {
    return { linked: false, lineProfile: data?.lineProfile || null };
  }

  const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: data.token_hash,
    type: 'email',
  });
  if (verifyError) throw verifyError;

  return { linked: true, user: verifyData?.user || null };
}

export async function linkCurrentUserWithLiff() {
  const status = await initLiff();
  if (!status.initialized) {
    return { linked: false, reason: 'not_configured' };
  }
  if (!status.loggedIn) {
    loginWithLiff(window.location.href);
    return { linked: false, reason: 'redirecting_to_line_login' };
  }
  const idToken = getLiffIdToken();
  if (!idToken) {
    return { linked: false, reason: 'no_id_token' };
  }
  return callLineAuthFunction({ action: 'link', idToken });
}

export async function unlinkCurrentUserLine() {
  return callLineAuthFunction({ action: 'unlink' });
}
