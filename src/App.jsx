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
import { getCurrentProfile, completeSellerRegistration, getSellerPickupLocation, listProducts, listSellerProducts, listPickupLocations, listSellerReviewSummary, createProduct, updateProduct, trashProduct, restoreProduct, updateSellerPickupLocation } from './lib/marketplace';
import { getSupabaseConfigError, supabase } from './lib/supabase';
import './App.css';

function mapAuthUser(authUser, profile = {}) {
  const username = authUser.email?.split('@')[0] || 'SPU member';
  return {
    id: authUser.id,
    email: authUser.email || '',
    username,
    displayName: profile.display_name || authUser.user_metadata?.display_name || username,
    studentId: profile.student_id || authUser.user_metadata?.student_id || '',
    faculty: profile.faculty || authUser.user_metadata?.faculty || '',
    contact: profile.contact || authUser.user_metadata?.contact || '',
    lineId: profile.contact || authUser.user_metadata?.contact || '',
    role: profile.role || authUser.user_metadata?.role || 'member',
    memberType: profile.member_type || authUser.user_metadata?.member_type || 'student',
    verified: Boolean(profile.is_verified),
    defaultPickupLocationId: profile.default_pickup_location_id || null,
  };
}

export default function App() {
  const getRoute = () => {
    if (/^\/(?:home)\/?$/.test(window.location.pathname)) return { tab: 'home', productId: null, sellerId: null, chatId: null };
    const match = window.location.pathname.match(/^\/products(?:\/([^/]+))?\/?$/);
    const sellerMatch = window.location.pathname.match(/^\/seller\/([^/]+)\/?$/);
    const chatMatch = window.location.pathname.match(/^\/chat(?:\/([^/]+))?\/?$/);
    if (/^\/login\/?$/.test(window.location.pathname)) return { tab: 'login', productId: null, sellerId: null, chatId: null };
    if (/^\/cart\/?$/.test(window.location.pathname)) return { tab: 'cart', productId: null, sellerId: null, chatId: null };
    if (sellerMatch) return { tab: 'seller', productId: null, sellerId: decodeURIComponent(sellerMatch[1]) };
    if (chatMatch) return { tab: chatMatch[1] ? 'chat_room' : 'chat', productId: null, sellerId: null, chatId: chatMatch[1] ? decodeURIComponent(chatMatch[1]) : null };
    return match ? { tab: match[1] ? 'product_detail' : 'products', productId: match[1] || null, sellerId: null } : { tab: 'home', productId: null, sellerId: null };
  };
  const [activeTab, setActiveTab] = useState(() => (
    new URLSearchParams(window.location.hash.slice(1)).has('error') ? 'register' : getRoute().tab
  ));
  const refreshProductsRef = useRef(() => {});
  const loadedSellerData = useRef(new Set());
  const [selectedProductId, setSelectedProductId] = useState(() => getRoute().productId);
  const [currentUser, setCurrentUser] = useState(null);
  const pendingSellerRegistrations = useRef(new Map());
  const [products, setProducts] = useState([]);
  const [productsUpdatedAt, setProductsUpdatedAt] = useState(null);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [sellerPickupLocation, setSellerPickupLocation] = useState('b11');
  const [sellerInitialPickupLocation, setSellerInitialPickupLocation] = useState(null);
  const [sellerPickupLocations, setSellerPickupLocations] = useState([]);
  const [sellerReviewSummary, setSellerReviewSummary] = useState({ average: null, count: 0 });
  const [sellerProductsLoading, setSellerProductsLoading] = useState(false);
  const [sellerProductsError, setSellerProductsError] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [productError, setProductError] = useState(() => (supabase ? '' : getSupabaseConfigError()));
  const [isLoadingProducts, setIsLoadingProducts] = useState(Boolean(supabase));
  const [selectedChatId, setSelectedChatId] = useState(() => getRoute().chatId || null);
  const [selectedChatPartner, setSelectedChatPartner] = useState(null);
  const [productDetailFromChat, setProductDetailFromChat] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [cartItemCount, setCartItemCount] = useState(0);

  useEffect(() => {
    const syncRoute = () => {
      const nextRoute = getRoute();
      setActiveTab(nextRoute.tab);
      setSelectedProductId(nextRoute.productId);
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
    if (!currentUser?.id || !supabase) { setCartItemCount(0); return undefined; }
    let active = true;
    let requestNumber = 0;
    const refreshCartCount = async () => {
      const currentRequest = ++requestNumber;
      const { count, error } = await supabase.from('cart_items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', currentUser.id);
      if (error) { console.error('Could not load cart count:', error.message); return; }
      if (active && currentRequest === requestNumber) setCartItemCount(count || 0);
    };
    void refreshCartCount();
    const channel = supabase.channel(`bottom-nav-cart:${currentUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cart_items' }, () => { void refreshCartCount(); })
      .subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [currentUser?.id]);

  useEffect(() => {
    if (activeTab !== 'seller' || !currentUser?.id) return;
    const sellerPath = `/seller/${encodeURIComponent(currentUser.id)}`;
    if (window.location.pathname === sellerPath) return;
    if (window.location.pathname.startsWith('/seller/')) {
      window.history.replaceState({}, '', sellerPath);
    } else {
      window.history.pushState({}, '', sellerPath);
    }
  }, [activeTab, currentUser?.id]);

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
    window.history.pushState({}, '', `/products/${encodeURIComponent(product.id)}`);
    setActiveTab('product_detail');
    setSelectedProductId(String(product.id));
    window.scrollTo(0, 0);
  };
  const navigateHome = () => {
    window.history.pushState({}, '', '/home');
    setActiveTab('home');
    setSelectedProductId(null);
    window.scrollTo(0, 0);
  };
  const navigateToLogin = () => {
    if (window.location.pathname !== '/login') window.history.pushState({}, '', '/login');
    setActiveTab('login');
    window.scrollTo(0, 0);
  };

  const refreshCartItemCount = async () => {
    if (!currentUser?.id || !supabase) { setCartItemCount(0); return; }
    const { count, error } = await supabase.from('cart_items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', currentUser.id);
    if (error) { console.error('Could not refresh cart count:', error.message); return; }
    setCartItemCount(count || 0);
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
    const syncUser = async (authUser, authEvent = null) => {
      const syncId = ++userSyncId;
      if (!authUser) {
        if (isMounted) setCurrentUser(null);
        return;
      }
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
              if (isMounted && syncId === userSyncId) setActiveTab('seller');
            } catch (registrationError) {
              console.error('Could not complete seller registration:', registrationError.message);
              if (isMounted && syncId === userSyncId) setActiveTab('register');
            } finally {
              if (pendingSellerRegistrations.current.get(authUser.id) === registrationPromise) {
                pendingSellerRegistrations.current.delete(authUser.id);
              }
            }
          }
        }
        if (isMounted && syncId === userSyncId) setCurrentUser(mapAuthUser(authUser, profile));
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
    Promise.all([listSellerProducts(currentUser.id), getSellerPickupLocation(currentUser), listPickupLocations(), listSellerReviewSummary(currentUser.id)])
      .then(([rows, pickupLocation, pickupLocations, reviewSummary]) => {
        if (!isCurrent) return;
        setSellerProducts(rows);
        setSellerPickupLocation(pickupLocation);
        setSellerInitialPickupLocation((initialLocation) => initialLocation || pickupLocation);
        setSellerPickupLocations(pickupLocations);
        setSellerReviewSummary(reviewSummary);
        loadedSellerData.current.add(currentUser.id);
      })
      .catch((error) => { if (isCurrent) setSellerProductsError(error.message || 'Could not load seller profile.'); })
      .finally(() => { if (isCurrent) setSellerProductsLoading(false); });
    return () => { isCurrent = false; };
  }, [activeTab, currentUser?.id, currentUser?.role]);

  const handleSelectTab = (tab) => {
    if (tab === 'home') {
      setActiveTab('home');
      setSelectedProductId(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (tab === 'chat' || tab === 'cart' || tab === 'profile') {
      if (tab === 'chat' && currentUser) {
        window.history.pushState({}, '', '/chat');
        setSelectedChatId(null);
        setSelectedChatPartner(null);
      }
      if (tab === 'cart' && currentUser) window.history.pushState({}, '', '/cart');
      if (!currentUser) navigateToLogin();
      else setActiveTab(tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (authUser) => {
    setCurrentUser(mapAuthUser(authUser));
    setActiveTab('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    if (!window.confirm('Sign out of SPU Market?')) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      window.alert(error.message);
      return;
    }
    setCurrentUser(null);
    setActiveTab('home');
  };

  const handleSwitchToSeller = () => {
    if (!currentUser) {
      navigateToLogin();
    } else if (currentUser.role?.toLowerCase() === 'seller') {
      setActiveTab('seller');
    } else {
      setActiveTab('register');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenChat = (conversation) => {
    const chatId = conversation?.id || conversation;
    window.history.pushState({}, '', `/chat/${encodeURIComponent(chatId)}`);
    setSelectedChatId(chatId);
    setSelectedChatPartner(conversation ? { name: conversation.name, productTitle: conversation.productTitle, image: conversation.image, price: conversation.price, location: conversation.location, draftMessage: conversation.draftMessage || '' } : null);
    setActiveTab('chat_room');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  return (
    <div className="app-viewport">
      <main className="market-app-shell" role="main">
        {activeTab === 'home' && (
          <HomePage
            onNavigateToRegister={() => setActiveTab('register')}
            onNavigateToLogin={navigateToLogin}
            onNavigateToSeller={handleSwitchToSeller}
            onNavigateToProducts={navigateToProducts}
            onSelectProduct={navigateToProduct}
            currentUser={currentUser}
            onLogout={handleLogout}
            products={products}
            productsUpdatedAt={productsUpdatedAt}
            productError={productError}
            isLoadingProducts={isLoadingProducts}
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
            onBack={navigateHome}
            onLoginSuccess={handleLoginSuccess}
          />
        )}

        {activeTab === 'profile' && (
          <ProfilePage
            currentUser={currentUser}
            onLogout={handleLogout}
            onBackToHome={() => setActiveTab('home')}
            onSwitchToSeller={handleSwitchToSeller}
          />
        )}

        {activeTab === 'seller' && (
          <SellerDashboardPage
            currentUser={currentUser}
            userProducts={sellerProducts}
            defaultPickupLocation={sellerPickupLocation}
            initialPickupLocation={sellerInitialPickupLocation || sellerPickupLocation}
            pickupLocations={sellerPickupLocations}
            reviewSummary={sellerReviewSummary}
            isLoading={sellerProductsLoading}
            error={sellerProductsError}
            onBack={() => setActiveTab('profile')}
            onAddNewProduct={() => { setEditingProduct(null); setActiveTab(currentUser ? 'add_product' : 'login'); }}
            onEditProduct={(product) => { setEditingProduct(product); setActiveTab('add_product'); }}
            onDeleteProduct={handleDeleteSellerProduct}
            onRestoreProduct={handleRestoreSellerProduct}
            onChangePickupLocation={handleChangeSellerPickupLocation}
          />
        )}

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

        {activeTab === 'product_detail' && (
          <ProductDetailPage
            product={products.find((product) => String(product.id) === selectedProductId)}
            isOwner={products.find((product) => String(product.id) === selectedProductId)?.sellerId === currentUser?.id}
            onBack={() => {
              if (productDetailFromChat && selectedChatId) {
                setProductDetailFromChat(false);
                window.history.back();
                return;
              }
              navigateToProducts();
            }}
            onAddToCart={async (product) => {
              if (!currentUser) { navigateToLogin(); return; }
              if (product.sellerId === currentUser.id) return;
              const { error } = await supabase.from('cart_items').upsert({ user_id: currentUser.id, product_id: product.id }, { onConflict: 'user_id,product_id', ignoreDuplicates: true });
              if (error) { window.alert(error.message); return; }
              await refreshCartItemCount();
              window.history.pushState({}, '', `/cart?selected=${encodeURIComponent(product.id)}`);
              setActiveTab('cart');
            }}
            onNavigateToChat={async () => {
              if (!currentUser) {
                navigateToLogin();
                return;
              }
              const product = products.find((item) => String(item.id) === selectedProductId);
              if (!product || product.sellerId === currentUser.id) return;
              const { data: conversationId, error } = await supabase.rpc('open_marketplace_conversation', { p_product_id: product.id });
              if (error) { window.alert(error.message); return; }
              window.history.pushState({}, '', `/chat/${encodeURIComponent(conversationId)}`);
              setSelectedChatId(conversationId);
              setSelectedChatPartner({ name: product.seller, productTitle: product.title, image: product.image, price: product.price, location: product.location });
              setProductDetailFromChat(false);
              setActiveTab('chat_room');
            }}
          />
        )}

        {activeTab === 'chat' && (
          <ChatListPage currentUser={currentUser} onSelectChat={handleOpenChat} onNavigateHome={navigateHome} />
        )}

        {activeTab === 'chat_room' && (
          <ChatRoomPage
            conversationId={selectedChatId}
            currentUser={currentUser}
            chatPartner={selectedChatPartner}
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
          />
        )}

        {activeTab !== 'product_detail' && activeTab !== 'products' && activeTab !== 'chat_room' && activeTab !== 'add_product' && (
          <BottomNav
            activeTab={activeTab === 'seller' ? 'profile' : activeTab}
            onSelectTab={handleSelectTab}
            cartCount={cartItemCount}
            unreadMessageCount={unreadMessageCount}
          />
        )}
      </main>
    </div>
  );
}
