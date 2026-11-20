import React, { useEffect, useRef, useState } from 'react';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import SellerDashboardPage from './pages/SellerDashboardPage';
import ProductDetailPage from './pages/ProductDetailPage';
import AddProductPage from './pages/AddProductPage';
import ChatListPage from './pages/ChatListPage';
import ChatRoomPage from './pages/ChatRoomPage';
import CartPage from './pages/CartPage';
import ProductsPage from './pages/ProductsPage';
import BottomNav from './components/common/BottomNav';
import { getCurrentProfile, completeSellerRegistration, getSellerPickupLocation, listProducts, listSellerProducts, listPickupLocations, listSellerReviewSummary, createProduct, updateProduct, trashProduct, restoreProduct, updateSellerPickupLocation, updateProductStatus, markProductAsSold, listSellerTransactions, updateUserProfile, uploadProfileAvatar, getProductById, isProductFavorited, toggleFavoriteProduct } from './lib/marketplace';
import {
  READ_NOTIFICATION_TTL_MS,
  deleteExpiredReadNotifications,
  isNotificationExpired,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './lib/notifications';
import { getSupabaseConfigError, supabase } from './lib/supabase';
import { isAllowedSpuEmail } from './utils/validation';

const PENDING_AUTH_ACTION_KEY = 'spu-market-pending-auth-action';
const PENDING_AUTH_ACTION_TTL_MS = 30 * 60 * 1000;
const LAST_ACTIVE_AT_KEY = 'spu-market-last-active-at';
const SESSION_INACTIVITY_LIMIT_MS = 7 * 24 * 60 * 60 * 1000;

function readLastActiveAt() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LAST_ACTIVE_AT_KEY);
    if (!raw) return null;
    const timestamp = Number(raw);
    return Number.isFinite(timestamp) ? timestamp : null;
  } catch {
    return null;
  }
}

function touchLastActiveAt() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAST_ACTIVE_AT_KEY, String(Date.now()));
  } catch {
    // Ignore storage errors
  }
}

function clearLastActiveAt() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LAST_ACTIVE_AT_KEY);
  } catch {
    // Ignore storage errors
  }
}

function isValidPendingAuthAction(action) {
  return Boolean(action && typeof action === 'object' && typeof action.type === 'string');
}

function savePendingAuthAction(action) {
  if (typeof window === 'undefined') return;
  try {
    if (!isValidPendingAuthAction(action)) {
      window.localStorage.removeItem(PENDING_AUTH_ACTION_KEY);
      return;
    }
    window.localStorage.setItem(
      PENDING_AUTH_ACTION_KEY,
      JSON.stringify({ ...action, savedAt: Date.now() })
    );
  } catch (error) {
    console.warn('Could not save pending auth action:', error);
  }
}

function consumePendingAuthAction() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PENDING_AUTH_ACTION_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(PENDING_AUTH_ACTION_KEY);
    const parsed = JSON.parse(raw);
    if (!isValidPendingAuthAction(parsed)) return null;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > PENDING_AUTH_ACTION_TTL_MS) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('Could not read pending auth action:', error);
    return null;
  }
}

function mapAuthUser(authUser, profile = {}) {
  const username = authUser.email?.split('@')[0] || 'SPU member';
  return {
    id: authUser.id,
    email: authUser.email || '',
    username,
    displayName: profile.display_name || authUser.user_metadata?.display_name || username,
    studentId: profile.student_id || authUser.user_metadata?.student_id || '',
    faculty: profile.faculty || authUser.user_metadata?.faculty || '',
    major: profile.major || authUser.user_metadata?.major || '',
    contact: profile.contact || authUser.user_metadata?.contact || '',
    lineId: profile.contact || authUser.user_metadata?.contact || '',
    role: profile.role || authUser.user_metadata?.role || 'member',
    memberType: profile.member_type || authUser.user_metadata?.member_type || 'student',
    verified: Boolean(profile.is_verified),
    avatar: profile.avatar_url || authUser.user_metadata?.avatar_url || '',
    defaultPickupLocationId: profile.default_pickup_location_id || null,
  };
}

export default function App() {
  const getRoute = () => {
    if (/^\/(?:home)\/?$/.test(window.location.pathname)) return { tab: 'home', productId: null, sellerId: null, profileId: null, chatId: null };
    const match = window.location.pathname.match(/^\/products(?:\/([^/]+))?\/?$/);
    const sellerMatch = window.location.pathname.match(/^\/seller\/([^/]+)\/?$/);
    const profileMatch = window.location.pathname.match(/^\/profile\/([^/]+)\/?$/);
    const chatMatch = window.location.pathname.match(/^\/chat(?:\/([^/]+))?\/?$/);
    if (/^\/login\/?$/.test(window.location.pathname)) return { tab: 'login', productId: null, sellerId: null, profileId: null, chatId: null };
    if (/^\/register\/?$/.test(window.location.pathname)) return { tab: 'register', productId: null, sellerId: null, profileId: null, chatId: null };
    if (/^\/cart\/?$/.test(window.location.pathname)) return { tab: 'cart', productId: null, sellerId: null, profileId: null, chatId: null };
    if (sellerMatch) return { tab: 'seller', productId: null, sellerId: decodeURIComponent(sellerMatch[1]), profileId: null, chatId: null };
    if (profileMatch) return { tab: 'profile', productId: null, sellerId: null, profileId: decodeURIComponent(profileMatch[1]), chatId: null };
    if (chatMatch) return { tab: chatMatch[1] ? 'chat_room' : 'chat', productId: null, sellerId: null, profileId: null, chatId: chatMatch[1] ? decodeURIComponent(chatMatch[1]) : null };
    return match ? { tab: match[1] ? 'product_detail' : 'products', productId: match[1] || null, sellerId: null, profileId: null } : { tab: 'home', productId: null, sellerId: null, profileId: null };
  };
  const [activeTab, setActiveTab] = useState(() => (
    new URLSearchParams(window.location.hash.slice(1)).has('error') ? 'register' : getRoute().tab
  ));
  const refreshProductsRef = useRef(() => {});
  const loadedSellerData = useRef(new Set());
  const [selectedProductId, setSelectedProductId] = useState(() => getRoute().productId);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProfileId, setSelectedProfileId] = useState(() => getRoute().profileId);
  const [selectedSellerId, setSelectedSellerId] = useState(() => getRoute().sellerId || null);
  const [loginPendingTab, setLoginPendingTab] = useState(null);
  const [loginError, setLoginError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const pendingSellerRegistrations = useRef(new Map());
  const [products, setProducts] = useState([]);
  const [productsUpdatedAt, setProductsUpdatedAt] = useState(null);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [sellerTransactions, setSellerTransactions] = useState([]);
  const [sellerPickupLocation, setSellerPickupLocation] = useState('b11');
  const [sellerInitialPickupLocation, setSellerInitialPickupLocation] = useState(null);
  const [sellerPickupLocations, setSellerPickupLocations] = useState([]);
  const [sellerReviewSummary, setSellerReviewSummary] = useState({ average: null, count: 0 });
  const [sellerProductsLoading, setSellerProductsLoading] = useState(false);
  const [sellerProductsError, setSellerProductsError] = useState('');
  const [publicSeller, setPublicSeller] = useState(null);
  const [publicSellerProducts, setPublicSellerProducts] = useState([]);
  const [publicReviewSummary, setPublicReviewSummary] = useState({ average: null, count: 0 });
  const [publicSellerLoading, setPublicSellerLoading] = useState(false);
  const [publicSellerError, setPublicSellerError] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [productError, setProductError] = useState(() => (supabase ? '' : getSupabaseConfigError()));
  const [isLoadingProducts, setIsLoadingProducts] = useState(Boolean(supabase));
  const [selectedChatId, setSelectedChatId] = useState(() => getRoute().chatId || null);
  const [selectedChatPartner, setSelectedChatPartner] = useState(null);
  const [productDetailFromChat, setProductDetailFromChat] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState(() => new Set());

  useEffect(() => {
    const syncRoute = () => {
      const nextRoute = getRoute();
      setActiveTab(nextRoute.tab);
      setSelectedProductId(nextRoute.productId);
      if (nextRoute.productId !== selectedProductId) setSelectedProduct(null);
      setSelectedProfileId(nextRoute.profileId || null);
      setSelectedSellerId(nextRoute.sellerId || null);
      setSelectedChatId(nextRoute.chatId || null);
      setSelectedChatPartner(null);
      if (nextRoute.tab !== 'product_detail') setProductDetailFromChat(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  useEffect(() => {
    if (!currentUser?.id || !supabase) { setUnreadMessageCount(0); return undefined; }
    let active = true;
    let requestNumber = 0;
    const refreshUnreadCount = async () => {
      const currentRequest = ++requestNumber;
      const { data: rooms, error: roomsError } = await supabase.from('conversations')
        .select('id')
        .or(`buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`);
      if (roomsError) { console.error('Could not load unread chat count:', roomsError.message); return; }
      const roomIds = (rooms || []).map((room) => room.id);
      if (!roomIds.length) {
        if (active && currentRequest === requestNumber) setUnreadMessageCount(0);
        return;
      }
      const { count, error: countError } = await supabase.from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', roomIds)
        .neq('sender_id', currentUser.id)
        .eq('is_read', false);
      if (countError) { console.error('Could not count unread chat messages:', countError.message); return; }
      if (active && currentRequest === requestNumber) setUnreadMessageCount(count || 0);
    };
    void refreshUnreadCount();
    const channel = supabase.channel(`bottom-nav-unread:${currentUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => { void refreshUnreadCount(); })
      .subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id || !supabase) {
      setOnlineUserIds(new Set());
      return undefined;
    }
    const presenceChannel = supabase.channel('spu-market-online-users', {
      config: { presence: { key: currentUser.id } },
    });
    const syncPresence = () => {
      const state = presenceChannel.presenceState();
      setOnlineUserIds(new Set(Object.keys(state || {})));
    };
    presenceChannel
      .on('presence', { event: 'sync' }, syncPresence)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void presenceChannel.track({ user_id: currentUser.id, online_at: new Date().toISOString() });
        }
      });
    return () => {
      void presenceChannel.untrack();
      void supabase.removeChannel(presenceChannel);
    };
  }, [currentUser?.id]);

  const fetchCartItemCount = async (userId) => {
    if (!userId || !supabase) return 0;
    const { count, error } = await supabase.from('cart_items')
      .select('id, products!inner(id)', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (error) {
      console.error('Could not load cart count:', error.message);
      return null;
    }
    return count || 0;
  };

  useEffect(() => {
    if (!currentUser?.id || !supabase) { setCartItemCount(0); return undefined; }
    let active = true;
    let requestNumber = 0;
    const refreshCartCount = async () => {
      const currentRequest = ++requestNumber;
      const count = await fetchCartItemCount(currentUser.id);
      if (count !== null && active && currentRequest === requestNumber) setCartItemCount(count);
    };
    void refreshCartCount();
    const channel = supabase.channel(`bottom-nav-cart:${currentUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cart_items' }, () => { void refreshCartCount(); })
      .subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id || !supabase) {
      setNotifications([]);
      setNotificationsLoading(false);
      return undefined;
    }
    let active = true;
    const refreshNotifications = async ({ silent = false } = {}) => {
      if (!silent) setNotificationsLoading(true);
      try {
        const rows = await listNotifications(currentUser.id);
        if (active) setNotifications(rows);
      } catch (error) {
        console.error('Could not load notifications:', error.message);
      } finally {
        if (active && !silent) setNotificationsLoading(false);
      }
    };
    void refreshNotifications();
    const channel = supabase.channel(`user-notifications:${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` },
        () => { void refreshNotifications({ silent: true }); },
      )
      .subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id || notifications.length === 0) return undefined;
    const now = Date.now();
    let earliestExpiry = null;

    for (const item of notifications) {
      if (!item.is_read || !item.read_at) continue;
      const readTime = new Date(item.read_at).getTime();
      if (Number.isNaN(readTime)) continue;
      const expiresAt = readTime + READ_NOTIFICATION_TTL_MS;
      if (earliestExpiry === null || expiresAt < earliestExpiry) {
        earliestExpiry = expiresAt;
      }
    }

    if (earliestExpiry === null) return undefined;

    const delay = Math.max(0, earliestExpiry - now);
    const timer = window.setTimeout(() => {
      const checkNow = Date.now();
      setNotifications((previous) => previous.filter((item) => !isNotificationExpired(item, checkNow)));
      void deleteExpiredReadNotifications(currentUser.id);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [currentUser?.id, notifications]);

  useEffect(() => {
    if (activeTab !== 'seller') return;
    const targetId = selectedSellerId || currentUser?.id;
    if (!targetId) return;
    const sellerPath = `/seller/${encodeURIComponent(targetId)}`;
    if (window.location.pathname === sellerPath) return;
    if (window.location.pathname.startsWith('/seller/')) {
      window.history.replaceState({}, '', sellerPath);
    } else {
      window.history.pushState({}, '', sellerPath);
    }
  }, [activeTab, selectedSellerId, currentUser?.id]);

  const navigateToSeller = (sellerId) => {
    if (!sellerId) return;
    setPublicSeller(null);
    setPublicSellerProducts([]);
    window.history.pushState({}, '', `/seller/${encodeURIComponent(sellerId)}`);
    setSelectedSellerId(sellerId);
    setActiveTab('seller');
    window.scrollTo(0, 0);
  };

  const navigateToProducts = () => {
    setProductDetailFromChat(false);
    window.history.pushState({}, '', '/products');
    setActiveTab('products');
    setSelectedProductId(null);
    window.scrollTo(0, 0);
  };
  const navigateToChatList = () => {
    window.history.pushState({}, '', '/chat');
    setSelectedChatId(null);
    setSelectedChatPartner(null);
    setActiveTab(currentUser ? 'chat' : 'login');
    window.scrollTo(0, 0);
  };
  const navigateToProduct = (product) => {
    if (!product?.id) return;
    setProductDetailFromChat(false);
    setSelectedProduct(product);
    setSelectedProductId(String(product.id));
    window.history.pushState({}, '', `/products/${encodeURIComponent(product.id)}`);
    setActiveTab('product_detail');
    window.scrollTo(0, 0);
  };
  const navigateHome = () => {
    window.history.pushState({}, '', '/home');
    setActiveTab('home');
    setSelectedProductId(null);
    setSelectedProfileId(null);
    window.scrollTo(0, 0);
  };
  const navigateToLogin = (pendingAction = null) => {
    savePendingAuthAction(pendingAction);
    const nextNavTab = pendingAction?.type === 'tab' && ['chat', 'cart', 'profile'].includes(pendingAction.tab)
      ? pendingAction.tab
      : null;
    setLoginPendingTab(nextNavTab);
    if (window.location.pathname !== '/login') window.history.pushState({}, '', '/login');
    setActiveTab('login');
    window.scrollTo(0, 0);
  };
  const navigateToProfile = (profileId = currentUser?.id) => {
    if (!profileId) {
      navigateToLogin();
      return;
    }
    window.history.pushState({}, '', `/profile/${encodeURIComponent(profileId)}`);
    setSelectedProfileId(profileId);
    setActiveTab('profile');
    window.scrollTo(0, 0);
  };

  const refreshCartItemCount = async () => {
    const count = await fetchCartItemCount(currentUser?.id);
    if (count !== null) setCartItemCount(count);
  };

  useEffect(() => {
    let isMounted = true;
    let userSyncId = 0;
    let productRequestId = 0;
    const refreshProducts = async () => {
      const requestId = ++productRequestId;
      try {
        const rows = await listProducts();
        if (!isMounted || requestId !== productRequestId) return;
        setProducts(rows);
        setProductsUpdatedAt(new Date());
        setProductError('');
      } catch (error) {
        if (isMounted && requestId === productRequestId) setProductError(error.message || 'Could not load products.');
      } finally {
        if (isMounted && requestId === productRequestId) setIsLoadingProducts(false);
      }
    };
    refreshProductsRef.current = refreshProducts;
    const authHash = new URLSearchParams(window.location.hash.slice(1));
    if (authHash.has('error')) {
      window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
    }
    const executePendingAuthAction = async (pendingAction, mappedUser) => {
      if (!isMounted || !pendingAction || !mappedUser?.id) return;
      const isSellerUser = mappedUser.role?.toLowerCase() === 'seller';

      try {
        if (pendingAction.type === 'tab') {
          const targetTab = pendingAction.tab;
          if (targetTab === 'register') {
            if (!isSellerUser && window.location.pathname !== '/register') window.history.pushState({}, '', '/register');
            setActiveTab(isSellerUser ? 'seller' : 'register');
          } else if (targetTab === 'seller') {
            if (!isSellerUser && window.location.pathname !== '/register') window.history.pushState({}, '', '/register');
            setActiveTab(isSellerUser ? 'seller' : 'register');
          } else if (targetTab === 'add_product') {
            setEditingProduct(null);
            if (!isSellerUser && window.location.pathname !== '/register') window.history.pushState({}, '', '/register');
            setActiveTab(isSellerUser ? 'add_product' : 'register');
          } else if (targetTab === 'chat') {
            window.history.pushState({}, '', '/chat');
            setSelectedChatId(null);
            setSelectedChatPartner(null);
            setActiveTab('chat');
          } else if (targetTab === 'cart') {
            window.history.pushState({}, '', '/cart');
            setActiveTab('cart');
          } else if (targetTab === 'profile') {
            window.history.pushState({}, '', `/profile/${encodeURIComponent(mappedUser.id)}`);
            setSelectedProfileId(mappedUser.id);
            setActiveTab('profile');
          } else if (targetTab) {
            setActiveTab(targetTab);
          }
          window.scrollTo(0, 0);
          return;
        }

        if (pendingAction.type === 'product_detail' && pendingAction.productId) {
          const pid = String(pendingAction.productId);
          window.history.pushState({}, '', `/products/${encodeURIComponent(pid)}`);
          setSelectedProductId(pid);
          setActiveTab('product_detail');
          window.scrollTo(0, 0);
          return;
        }

        if (pendingAction.type === 'favorite_product' && pendingAction.productId) {
          const pid = String(pendingAction.productId);
          try {
            const alreadySaved = await isProductFavorited(pid, mappedUser.id);
            if (!alreadySaved) {
              await toggleFavoriteProduct(pid, mappedUser.id);
            }
          } catch (favError) {
            console.warn('Could not complete pending favorite:', favError);
          }
          if (!isMounted) return;
          window.history.pushState({}, '', `/products/${encodeURIComponent(pid)}`);
          setSelectedProductId(pid);
          setActiveTab('product_detail');
          window.scrollTo(0, 0);
          return;
        }

        if (pendingAction.type === 'add_to_cart' && pendingAction.productId) {
          const pid = String(pendingAction.productId);
          const product = await getProductById(pid);
          if (!isMounted) return;
          if (!product) {
            setActiveTab('products');
            window.scrollTo(0, 0);
            return;
          }
          if (product.sellerId === mappedUser.id) {
            window.history.pushState({}, '', `/products/${encodeURIComponent(pid)}`);
            setSelectedProduct(product);
            setSelectedProductId(pid);
            setActiveTab('product_detail');
            window.scrollTo(0, 0);
            return;
          }
          const { error } = await supabase
            .from('cart_items')
            .upsert(
              { user_id: mappedUser.id, product_id: product.id },
              { onConflict: 'user_id,product_id', ignoreDuplicates: true }
            );
          if (error) {
            window.alert(error.message);
            return;
          }
          const count = await fetchCartItemCount(mappedUser.id);
          if (!isMounted) return;
          if (count !== null) setCartItemCount(count);
          window.history.pushState({}, '', `/cart?selected=${encodeURIComponent(product.id)}`);
          setActiveTab('cart');
          window.scrollTo(0, 0);
          return;
        }

        if (pendingAction.type === 'open_product_chat' && pendingAction.productId) {
          const pid = String(pendingAction.productId);
          const product = await getProductById(pid);
          if (!isMounted || !product) return;
          if (product.sellerId === mappedUser.id) {
            window.history.pushState({}, '', `/products/${encodeURIComponent(pid)}`);
            setSelectedProduct(product);
            setSelectedProductId(pid);
            setActiveTab('product_detail');
            window.scrollTo(0, 0);
            return;
          }
          const { data: conversationId, error } = await supabase.rpc('open_marketplace_conversation', {
            p_product_id: product.id,
          });
          if (!isMounted) return;
          if (error) {
            window.alert(error.message);
            return;
          }
          window.history.pushState({}, '', `/chat/${encodeURIComponent(conversationId)}`);
          setSelectedChatId(conversationId);
          setSelectedChatPartner({
            name: product.seller,
            productTitle: product.title,
            image: product.image,
            price: product.price,
            location: product.location,
            draftMessage: '',
          });
          setActiveTab('chat_room');
          window.scrollTo(0, 0);
        }
      } catch (actionError) {
        console.error('Could not execute pending auth action:', actionError);
      }
    };

    const syncUser = async (authUser, authEvent = null) => {
      const syncId = ++userSyncId;
      if (!authUser) {
        clearLastActiveAt();
        if (isMounted) setCurrentUser(null);
        return;
      }
      if (authEvent === 'SIGNED_IN') {
        touchLastActiveAt();
      } else {
        const lastActiveAt = readLastActiveAt();
        if (lastActiveAt && Date.now() - lastActiveAt > SESSION_INACTIVITY_LIMIT_MS) {
          clearLastActiveAt();
          savePendingAuthAction(null);
          if (isMounted) setCurrentUser(null);
          try {
            await supabase.auth.signOut();
          } catch (signOutError) {
            console.error('Could not sign out inactive session:', signOutError.message);
          }
          return;
        }
        touchLastActiveAt();
      }
      if (!isAllowedSpuEmail(authUser.email)) {
        savePendingAuthAction(null);
        if (isMounted) {
          setCurrentUser(null);
          setLoginError('กรุณาเข้าสู่ระบบด้วยอีเมล @spumail.net หรือ @spu.ac.th เท่านั้น');
          if (window.location.pathname !== '/login') window.history.pushState({}, '', '/login');
          setActiveTab('login');
        }
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.error('Could not sign out unauthorized email domain:', signOutError.message);
        }
        return;
      }
      if (isMounted) setLoginError('');
      const basicUser = mapAuthUser(authUser);
      if (isMounted) setCurrentUser(basicUser);
      try {
        let profile = await getCurrentProfile(authUser);
        let registration = authUser.user_metadata || {};
        const pendingRegistrationKey = 'spu-market-pending-seller-registration';
        let registrationCameFromStorage = false;
        if (authEvent === 'SIGNED_IN') {
          try {
            const savedRegistration = window.localStorage.getItem(pendingRegistrationKey);
            const parsedRegistration = savedRegistration ? JSON.parse(savedRegistration) : null;
            if (parsedRegistration
              && parsedRegistration.email?.toLowerCase() === authUser.email?.toLowerCase()
              && Date.now() - parsedRegistration.saved_at <= 24 * 60 * 60 * 1000) {
              registration = { ...parsedRegistration, seller_registration_pending: true };
              registrationCameFromStorage = true;
            }
          } catch (storageError) {
            console.error('Could not restore pending seller registration:', storageError.message);
          }
        }
        let registrationCompletedRedirect = false;
        if (registration.seller_registration_pending === true) {
          if (profile.role === 'seller') {
            if (registrationCameFromStorage) window.localStorage.removeItem(pendingRegistrationKey);
            await supabase.auth.updateUser({ data: { seller_registration_pending: false } });
          } else {
            let registrationPromise = pendingSellerRegistrations.current.get(authUser.id);
            if (!registrationPromise) {
              registrationPromise = completeSellerRegistration({
                studentId: registration.student_id || '',
                displayName: registration.display_name || '',
                faculty: registration.faculty || '',
                major: registration.major || '',
                contact: registration.contact || '',
                memberType: registration.member_type || 'student',
                identityCheckConsent: registration.identity_check_consent === true,
                termsAccepted: registration.terms_accepted === true,
              });
              pendingSellerRegistrations.current.set(authUser.id, registrationPromise);
            }
            try {
              profile = await registrationPromise;
              if (registrationCameFromStorage) window.localStorage.removeItem(pendingRegistrationKey);
              else void supabase.auth.updateUser({ data: { seller_registration_pending: false } });
              if (isMounted && syncId === userSyncId) {
                setActiveTab('seller');
                registrationCompletedRedirect = true;
              }
            } catch (registrationError) {
              console.error('Could not complete seller registration:', registrationError.message);
              if (isMounted && syncId === userSyncId) {
                if (window.location.pathname !== '/register') window.history.pushState({}, '', '/register');
                setActiveTab('register');
                registrationCompletedRedirect = true;
              }
            } finally {
              if (pendingSellerRegistrations.current.get(authUser.id) === registrationPromise) {
                pendingSellerRegistrations.current.delete(authUser.id);
              }
            }
          }
        }
        if (isMounted && syncId === userSyncId) {
          const mappedUser = mapAuthUser(authUser, profile);
          setCurrentUser(mappedUser);
          if (registrationCompletedRedirect) {
            savePendingAuthAction(null);
          } else {
            const pendingAction = consumePendingAuthAction();
            if (pendingAction) {
              void executePendingAuthAction(pendingAction, mappedUser);
            }
          }
        }
      } catch (error) {
        console.error('Could not load user profile:', error.message);
      }
    };

    if (!supabase) {
      return () => { isMounted = false; };
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error('Could not restore session:', error.message);
      if (isMounted) void syncUser(data.session?.user || null);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      window.setTimeout(() => {
        if (isMounted) void syncUser(session?.user || null, event);
      }, 0);
    });

    void refreshProducts();
    const productsChannel = supabase.channel('marketplace-products-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => { void refreshProducts(); })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Could not subscribe to live product updates:', status);
        }
      });

    return () => {
      isMounted = false;
      refreshProductsRef.current = () => {};
      authListener.subscription.unsubscribe();
      void supabase.removeChannel(productsChannel);
    };
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return undefined;
    let lastTouchedAt = Date.now();
    touchLastActiveAt();

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastTouchedAt >= 60_000) {
        lastTouchedAt = now;
        touchLastActiveAt();
      }
    };

    window.addEventListener('pointerdown', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('focus', handleActivity);
    return () => {
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('focus', handleActivity);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (activeTab !== 'home') return undefined;
    const refreshVisibleFeed = () => {
      if (document.visibilityState === 'visible') void refreshProductsRef.current();
    };
    const timer = window.setInterval(refreshVisibleFeed, 10_000);
    window.addEventListener('focus', refreshVisibleFeed);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshVisibleFeed);
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'seller' || currentUser?.role?.toLowerCase() !== 'seller') return undefined;
    let isCurrent = true;
    setSellerProductsLoading(!loadedSellerData.current.has(currentUser.id));
    setSellerProductsError('');
    Promise.all([
      listSellerProducts(currentUser.id),
      getSellerPickupLocation(currentUser),
      listPickupLocations(),
      listSellerReviewSummary(currentUser.id),
      listSellerTransactions(currentUser.id),
    ])
      .then(([rows, pickupLocation, pickupLocations, reviewSummary, transactions]) => {
        if (!isCurrent) return;
        setSellerProducts(rows);
        setSellerPickupLocation(pickupLocation);
        setSellerInitialPickupLocation((initialLocation) => initialLocation || pickupLocation);
        setSellerPickupLocations(pickupLocations);
        setSellerReviewSummary(reviewSummary);
        setSellerTransactions(transactions || []);
        loadedSellerData.current.add(currentUser.id);
      })
      .catch((error) => { if (isCurrent) setSellerProductsError(error.message || 'Could not load seller profile.'); })
      .finally(() => { if (isCurrent) setSellerProductsLoading(false); });
    return () => { isCurrent = false; };
  }, [activeTab, currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (activeTab !== 'seller') return undefined;
    const targetId = selectedSellerId || currentUser?.id;
    if (!targetId) return undefined;
    const isOwner = Boolean(currentUser?.id && targetId === currentUser.id);
    if (isOwner) return undefined;

    let isCurrent = true;
    setPublicSellerLoading(true);
    setPublicSellerError('');

    Promise.all([
      supabase
        .from('profiles')
        .select('id, student_id, display_name, faculty, is_verified, member_type, avatar_url')
        .eq('id', targetId)
        .maybeSingle()
        .then(async (res) => {
          if (!res.error) return res;
          return supabase
            .from('profiles')
            .select('id, student_id, display_name, faculty, is_verified, member_type')
            .eq('id', targetId)
            .maybeSingle();
        }),
      listProducts({ sellerId: targetId }),
      listSellerReviewSummary(targetId),
    ])
      .then(([{ data: profile, error: profileErr }, prods, reviews]) => {
        if (!isCurrent) return;
        if (profileErr) throw profileErr;
        setPublicSeller(profile || { id: targetId, display_name: 'ผู้ขาย SPU' });
        setPublicSellerProducts(prods || []);
        setPublicReviewSummary(reviews || { average: null, count: 0 });
      })
      .catch((err) => {
        if (!isCurrent) return;
        console.error('Could not load public seller profile:', err);
        setPublicSellerError('ไม่สามารถโหลดข้อมูลร้านค้าของผู้ขายได้');
      })
      .finally(() => {
        if (isCurrent) setPublicSellerLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [activeTab, selectedSellerId, currentUser?.id]);

  const handleSelectTab = (tab) => {
    if (tab === 'home') {
      navigateHome();
      return;
    }
    if (tab === 'chat' || tab === 'cart' || tab === 'profile') {
      if (tab === 'chat' && currentUser) {
        window.history.pushState({}, '', '/chat');
        setSelectedChatId(null);
        setSelectedChatPartner(null);
      }
      if (tab === 'cart' && currentUser) window.history.pushState({}, '', '/cart');
      if (!currentUser) navigateToLogin({ type: 'tab', tab });
      else {
        if (tab === 'profile') {
          navigateToProfile();
          return;
        }
        setActiveTab(tab);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (authUser) => {
    setCurrentUser(mapAuthUser(authUser));
    navigateToProfile(authUser.id);
  };

  const handleLogout = async ({ skipConfirm = false } = {}) => {
    if (!skipConfirm && !window.confirm('Sign out of SPU Market?')) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      if (skipConfirm) throw error;
      window.alert(error.message);
      return;
    }
    clearLastActiveAt();
    savePendingAuthAction(null);
    setCurrentUser(null);
    setActiveTab('home');
  };

  const handleSwitchToSeller = () => {
    if (!currentUser) {
      navigateToLogin({ type: 'tab', tab: 'seller' });
    } else if (currentUser.role?.toLowerCase() === 'seller') {
      setActiveTab('seller');
    } else {
      if (window.location.pathname !== '/register') window.history.pushState({}, '', '/register');
      setActiveTab('register');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenChat = (conversation) => {
    const chatId = conversation?.id || conversation;
    window.history.pushState({}, '', `/chat/${encodeURIComponent(chatId)}`);
    setSelectedChatId(chatId);
    setSelectedChatPartner(conversation && typeof conversation === 'object' ? { name: conversation.name, productTitle: conversation.productTitle, image: conversation.image, price: conversation.price, location: conversation.location, draftMessage: conversation.draftMessage || '' } : null);
    setActiveTab('chat_room');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const unreadNotificationCount = notifications.filter((item) => !item.is_read).length;

  const handleMarkAllNotificationsRead = () => {
    if (!currentUser?.id) return;
    const nowIso = new Date().toISOString();
    setNotifications((previous) => previous.map((item) => (
      item.is_read ? item : { ...item, is_read: true, read_at: nowIso }
    )));
    void markAllNotificationsRead(currentUser.id);
  };

  const handleSelectNotification = (item) => {
    if (!item) return;
    if (!item.is_read && currentUser?.id) {
      const nowIso = new Date().toISOString();
      setNotifications((previous) => previous.map((row) => (
        row.id === item.id ? { ...row, is_read: true, read_at: nowIso } : row
      )));
      void markNotificationRead(item.id, currentUser.id);
    }

    if ((item.target_type === 'chat' || item.target_type === 'pickup') && item.target_id) {
      handleOpenChat(item.target_id);
      return;
    }
    if (item.target_type === 'seller_reviews') {
      if (item.target_id && item.target_id !== currentUser?.id) {
        navigateToSeller(item.target_id);
      } else {
        handleSwitchToSeller();
      }
      return;
    }
    if (item.target_type === 'pickup') {
      navigateToProfile();
    }
  };

  const handleOpenProductChat = async (product) => {
    if (!currentUser) {
      navigateToLogin(product?.id ? { type: 'open_product_chat', productId: String(product.id) } : null);
      return;
    }
    if (!product?.id || product.sellerId === currentUser.id) return;

    const { data: conversationId, error } = await supabase.rpc('open_marketplace_conversation', { p_product_id: product.id });
    if (error) {
      window.alert(error.message);
      return;
    }
    handleOpenChat({
      id: conversationId,
      name: product.seller,
      productTitle: product.title,
      image: product.image,
      price: product.price,
      location: product.location,
    });
  };

  const handleCreateProduct = async (productInput) => {
    if (!currentUser) throw new Error('Please sign in before listing a product.');
    if (currentUser.role?.toLowerCase() !== 'seller') throw new Error('Verify as a seller before listing a product.');
    if (editingProduct) {
      const product = await updateProduct(editingProduct.id, productInput, currentUser);
      setProducts((previous) => product.status === 'active'
        ? [product, ...previous.filter((item) => item.id !== product.id)]
        : previous.filter((item) => item.id !== product.id));
      setSellerProducts((previous) => previous.map((item) => item.id === product.id ? product : item));
      setEditingProduct(null);
    } else {
      const product = await createProduct(productInput, currentUser);
      if (product.status === 'active') setProducts((previous) => [product, ...previous]);
      setSellerProducts((previous) => [product, ...previous]);
    }
    setProductsUpdatedAt(new Date());
    setActiveTab('seller');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteSellerProduct = async (product) => {
    if (!window.confirm(`ย้าย “${product.title}” ไปถังขยะ? กู้คืนได้ภายใน 3 วัน`)) return;
    try {
      await trashProduct(product, currentUser);
      setSellerProducts((previous) => previous.map((item) => item.id === product.id
        ? { ...item, status: 'trash', statusBeforeTrash: product.status, trashedAt: new Date().toISOString() }
        : item));
      setProducts((previous) => previous.filter((item) => item.id !== product.id));
      setProductsUpdatedAt(new Date());
    } catch (error) {
      setSellerProductsError(error.message || 'ลบสินค้าไม่สำเร็จ');
    }
  };

  const handleRestoreSellerProduct = async (product) => {
    try {
      await restoreProduct(product, currentUser);
      const restoredProduct = {
        ...product,
        status: product.statusBeforeTrash || 'draft',
        statusBeforeTrash: null,
        trashedAt: null,
      };
      setSellerProducts((previous) => previous.map((item) => item.id === product.id ? restoredProduct : item));
      if (restoredProduct.status === 'active') {
        setProducts((previous) => [restoredProduct, ...previous.filter((item) => item.id !== product.id)]);
      }
      setProductsUpdatedAt(new Date());
    } catch (error) {
      setSellerProductsError(error.message || 'กู้คืนสินค้าไม่สำเร็จ');
    }
  };

  const handleChangeSellerPickupLocation = async (locationSlug) => {
    setSellerProductsError('');
    try {
      await updateSellerPickupLocation(locationSlug);
      setSellerPickupLocation(locationSlug);
      const rows = await listSellerProducts(currentUser.id);
      setSellerProducts(rows);
      setProducts((previous) => previous.map((item) => rows.find((row) => row.id === item.id) || item));
    } catch (error) {
      setSellerProductsError(error.message || 'บันทึกจุดนัดรับไม่สำเร็จ');
    }
  };

  const handleMarkSellerProductSold = async (product) => {
    try {
      setSellerProductsError('');
      await markProductAsSold(product.id, currentUser);
      setSellerProducts((previous) =>
        previous.map((item) => (item.id === product.id ? { ...item, status: 'sold' } : item))
      );
      setProducts((previous) => previous.filter((item) => item.id !== product.id));
      setProductsUpdatedAt(new Date());

      if (currentUser?.id) {
        const trans = await listSellerTransactions(currentUser.id);
        setSellerTransactions(trans || []);
      }
    } catch (error) {
      setSellerProductsError(error.message || 'เปลี่ยนสถานะเป็นขายแล้วไม่สำเร็จ');
      throw error;
    }
  };

  const handleUpdateSellerProductStatus = async (product, newStatus) => {
    try {
      setSellerProductsError('');
      await updateProductStatus(product.id, newStatus, currentUser);
      const updated = { ...product, status: newStatus };
      setSellerProducts((previous) =>
        previous.map((item) => (item.id === product.id ? updated : item))
      );
      if (newStatus === 'active') {
        setProducts((previous) => [updated, ...previous.filter((item) => item.id !== product.id)]);
      } else {
        setProducts((previous) => previous.filter((item) => item.id !== product.id));
      }
      setProductsUpdatedAt(new Date());

      if (currentUser?.id) {
        const trans = await listSellerTransactions(currentUser.id);
        setSellerTransactions(trans || []);
      }
    } catch (error) {
      setSellerProductsError(error.message || 'อัปเดตสถานะสินค้าไม่สำเร็จ');
      throw error;
    }
  };

  return (
    <div className="min-h-dvh w-full bg-slate-100 overflow-x-clip">
      <main className="market-app-shell mx-auto flex min-h-dvh w-full flex-col bg-white relative overflow-x-clip" role="main">
        {activeTab === 'home' && (
          <HomePage
            onNavigateToRegister={() => {
              if (!currentUser) {
                navigateToLogin({ type: 'tab', tab: 'register' });
                return;
              }
              if (window.location.pathname !== '/register') window.history.pushState({}, '', '/register');
              setActiveTab('register');
            }}
            onNavigateToLogin={navigateToLogin}
            onNavigateToSeller={handleSwitchToSeller}
            onNavigateToAddProduct={() => {
              setEditingProduct(null);
              if (!currentUser) {
                navigateToLogin({ type: 'tab', tab: 'add_product' });
                return;
              }
              setActiveTab('add_product');
            }}
            onNavigateToProducts={navigateToProducts}
            onSelectProduct={navigateToProduct}
            currentUser={currentUser}
            onLogout={handleLogout}
            products={products}
            productsUpdatedAt={productsUpdatedAt}
            productError={productError}
            isLoadingProducts={isLoadingProducts}
            notificationCount={unreadNotificationCount}
            notifications={notifications}
            notificationsLoading={notificationsLoading}
            onSelectNotification={handleSelectNotification}
            onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
          />
        )}

        {activeTab === 'products' && <ProductsPage products={products} isLoading={isLoadingProducts} onBack={navigateHome} onSelectProduct={navigateToProduct} />}

        {activeTab === 'register' && (
          <RegisterPage
            currentUser={currentUser}
            onBack={() => setActiveTab('home')}
          />
        )}

        {activeTab === 'login' && (
          <LoginPage
            authError={loginError}
            onClearAuthError={() => setLoginError('')}
            onBack={() => {
              setLoginError('');
              savePendingAuthAction(null);
              navigateHome();
            }}
            onLoginSuccess={handleLoginSuccess}
          />
        )}

        {activeTab === 'profile' && (
          <ProfilePage
            currentUser={currentUser}
            onLogout={handleLogout}
            onBackToHome={navigateHome}
            onSwitchToSeller={handleSwitchToSeller}
            onNavigateToLogin={() => navigateToLogin({ type: 'tab', tab: 'profile' })}
            onOpenChat={handleOpenChat}
            onSelectProduct={navigateToProduct}
            onNavigateToProducts={navigateToProducts}
            onNavigateToSeller={navigateToSeller}
            onUpdateProfile={async ({ displayName, faculty, major, contact, avatarFile }) => {
              if (!currentUser?.id) throw new Error('กรุณาเข้าสู่ระบบก่อนแก้ไขโปรไฟล์');
              let nextAvatarUrl;
              if (avatarFile) {
                nextAvatarUrl = await uploadProfileAvatar(avatarFile, currentUser);
              }
              const updatedProfile = await updateUserProfile(currentUser, {
                displayName,
                faculty,
                major,
                contact,
                ...(nextAvatarUrl !== undefined ? { avatarUrl: nextAvatarUrl } : {}),
              });
              setCurrentUser((previous) => (
                previous
                  ? {
                      ...previous,
                      displayName: updatedProfile.display_name || displayName,
                      faculty: updatedProfile.faculty ?? faculty,
                      major: updatedProfile.major ?? major,
                      contact: updatedProfile.contact ?? contact,
                      lineId: updatedProfile.contact ?? contact,
                      avatar: updatedProfile.avatar_url || nextAvatarUrl || previous.avatar || '',
                    }
                  : previous
              ));
              void refreshProductsRef.current();
            }}
          />
        )}

        {activeTab === 'seller' && (() => {
          const targetId = selectedSellerId || currentUser?.id;
          const isOwner = Boolean(currentUser?.id && targetId === currentUser.id);
          return (
            <SellerDashboardPage
              currentUser={isOwner ? currentUser : publicSeller}
              isOwner={isOwner}
              userProducts={isOwner ? sellerProducts : publicSellerProducts}
              transactions={isOwner ? sellerTransactions : []}
              defaultPickupLocation={sellerPickupLocation}
              initialPickupLocation={sellerInitialPickupLocation || sellerPickupLocation}
              pickupLocations={sellerPickupLocations}
              reviewSummary={isOwner ? sellerReviewSummary : publicReviewSummary}
              isLoading={isOwner ? sellerProductsLoading : publicSellerLoading}
              error={isOwner ? sellerProductsError : publicSellerError}
              onBack={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  navigateToProfile();
                }
              }}
              onSelectProduct={navigateToProduct}
              onAddNewProduct={() => {
                setEditingProduct(null);
                if (!currentUser) {
                  navigateToLogin({ type: 'tab', tab: 'add_product' });
                  return;
                }
                setActiveTab('add_product');
              }}
              onEditProduct={(product) => { setEditingProduct(product); setActiveTab('add_product'); }}
              onDeleteProduct={handleDeleteSellerProduct}
              onRestoreProduct={handleRestoreSellerProduct}
              onChangePickupLocation={handleChangeSellerPickupLocation}
              onMarkAsSold={handleMarkSellerProductSold}
              onUpdateProductStatus={handleUpdateSellerProductStatus}
              onOpenChat={handleOpenChat}
            />
          );
        })()}

        {activeTab === 'add_product' && (
          <AddProductPage
            product={editingProduct}
            currentUser={currentUser}
            defaultLocation={sellerPickupLocation}
            defaultLocationName={sellerPickupLocations.find((location) => location.id === sellerPickupLocation)?.name}
            onBack={() => { setEditingProduct(null); setActiveTab('seller'); }}
            onSubmit={handleCreateProduct}
          />
        )}

        {activeTab === 'product_detail' && (() => {
          const detailProduct = selectedProduct || products.find((product) => String(product.id) === selectedProductId);
          return (
            <ProductDetailPage
              product={detailProduct}
              productId={selectedProductId}
              isOwner={detailProduct?.sellerId === currentUser?.id}
              currentUser={currentUser}
              onlineUserIds={onlineUserIds}
              onNavigateToLogin={(action) => navigateToLogin(
                isValidPendingAuthAction(action)
                  ? action
                  : (selectedProductId ? { type: 'product_detail', productId: String(selectedProductId) } : null)
              )}
              onNavigateToSeller={navigateToSeller}
              onBack={() => {
                if (productDetailFromChat && selectedChatId) {
                  setProductDetailFromChat(false);
                }
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  navigateToProducts();
                }
              }}
              onAddToCart={async (product) => {
                if (!currentUser) {
                  navigateToLogin(product?.id ? { type: 'add_to_cart', productId: String(product.id) } : null);
                  return;
                }
                if (product.sellerId === currentUser.id) return;
                const { error } = await supabase.from('cart_items').upsert({ user_id: currentUser.id, product_id: product.id }, { onConflict: 'user_id,product_id', ignoreDuplicates: true });
                if (error) { window.alert(error.message); return; }
                await refreshCartItemCount();
                window.history.pushState({}, '', `/cart?selected=${encodeURIComponent(product.id)}`);
                setActiveTab('cart');
              }}
              onNavigateToChat={() => {
                const product = detailProduct || products.find((item) => String(item.id) === selectedProductId);
                if (!product) return;
                setProductDetailFromChat(false);
                void handleOpenProductChat(product);
              }}
            />
          );
        })()}

        {activeTab === 'chat' && (
          <ChatListPage currentUser={currentUser} onSelectChat={handleOpenChat} onNavigateHome={navigateHome} />
        )}

        {activeTab === 'chat_room' && (
          <ChatRoomPage
            conversationId={selectedChatId}
            currentUser={currentUser}
            chatPartner={selectedChatPartner}
            onlineUserIds={onlineUserIds}
            draftMessage={selectedChatPartner?.draftMessage || ''}
            onBack={navigateToChatList}
            onViewProduct={(productId) => {
              if (!productId) return;
              window.history.pushState({}, '', `/products/${encodeURIComponent(productId)}`);
              setSelectedProductId(String(productId));
              setProductDetailFromChat(true);
              setActiveTab('product_detail');
              window.scrollTo(0, 0);
            }}
          />
        )}

        {activeTab === 'cart' && (
          <CartPage
            currentUser={currentUser}
            products={products}
            onCartChange={refreshCartItemCount}
            onNavigateHome={navigateHome}
            onNavigateProducts={navigateToProducts}
            onBack={() => window.history.length > 1 ? window.history.back() : navigateHome()}
            onOpenChat={handleOpenChat}
            onOpenProductChat={handleOpenProductChat}
            onSelectProduct={navigateToProduct}
            onSelectSeller={navigateToSeller}
          />
        )}

        {activeTab !== 'product_detail' && activeTab !== 'products' && activeTab !== 'chat_room' && activeTab !== 'add_product' && activeTab !== 'seller' && (
          <BottomNav
            activeTab={
              activeTab === 'seller'
                ? 'profile'
                : activeTab === 'login'
                  ? (loginPendingTab || 'login')
                  : activeTab
            }
            onSelectTab={handleSelectTab}
            cartCount={cartItemCount}
            unreadMessageCount={unreadMessageCount}
          />
        )}
      </main>
    </div>
  );
}
