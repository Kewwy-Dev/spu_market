import React, { useEffect, useState } from 'react';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import SellerDashboardPage from './pages/SellerDashboardPage';
import ProductDetailPage from './pages/ProductDetailPage';
import AddProductPage from './pages/AddProductPage';
import { PRODUCTS } from './data/products';
import ChatListPage from './pages/ChatListPage';
import ChatRoomPage from './pages/ChatRoomPage';
import CartPage from './pages/CartPage';
import BottomNav from './components/common/BottomNav';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [currentUser, setCurrentUser] = useState(null);
  const [userProducts, setUserProducts] = useState(() => {
    try {
      const savedProducts = JSON.parse(window.localStorage.getItem('spu-market-user-products') || '[]');
      return Array.isArray(savedProducts) ? savedProducts : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('spu-market-user-products', JSON.stringify(userProducts));
    } catch {
      // Keep the current session usable if browser storage is full.
    }
  }, [userProducts]);
  const [_selectedChatId, setSelectedChatId] = useState('fah');

  const handleSelectTab = (tab) => {
    if (tab === 'chat' || tab === 'cart' || tab === 'profile') {
      setActiveTab(currentUser ? tab : 'login');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    alert(`เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับ ${user.displayName}`);
    setActiveTab('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    if (window.confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
      setCurrentUser(null);
      alert('ออกจากระบบเรียบร้อยแล้ว');
      setActiveTab('home');
    }
  };

  const handleSwitchToSeller = () => {
    setActiveTab('seller');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenChat = (partnerId) => {
    setSelectedChatId(partnerId);
    setActiveTab('chat_room');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-viewport">
      <main className="market-app-shell" role="main">
        {activeTab === 'home' && (
          <HomePage
            onNavigateToRegister={() => setActiveTab('register')}
            onNavigateToLogin={() => setActiveTab('login')}
            onNavigateToSeller={handleSwitchToSeller}
            currentUser={currentUser}
            onLogout={handleLogout}
            products={[...userProducts, ...PRODUCTS]}
          />
        )}

        {activeTab === 'register' && (
          <RegisterPage
            onBack={() => setActiveTab('home')}
            onGoToSeller={handleSwitchToSeller}
          />
        )}

        {activeTab === 'login' && (
          <LoginPage
            onBack={() => setActiveTab('home')}
            onLoginSuccess={handleLoginSuccess}
            onNavigateToRegister={() => setActiveTab('register')}
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
            userProducts={userProducts}
            onBack={() => {
              setActiveTab('profile');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onAddNewProduct={() => {
              setActiveTab('add_product');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeTab === 'add_product' && (
          <AddProductPage
            currentUser={currentUser}
            onBack={() => {
              setActiveTab('seller');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSubmit={(product) => {
              setUserProducts((previous) => [product, ...previous]);
              setActiveTab('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
        {activeTab === 'product_detail' && (
          <ProductDetailPage
            currentUser={currentUser}
            onBack={() => {
              setActiveTab('seller');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToChat={() => {
              if (!currentUser) {
                setActiveTab('login');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
              }
              setSelectedChatId('fah');
              setActiveTab('chat_room');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeTab === 'chat' && (
          <ChatListPage
            onSelectChat={handleOpenChat}
            onNavigateHome={() => setActiveTab('home')}
          />
        )}

        {activeTab === 'chat_room' && (
          <ChatRoomPage
            onBack={() => {
              setActiveTab('chat');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onViewProductDetail={() => {
              setActiveTab('product_detail');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeTab === 'cart' && (
          <CartPage
            onNavigateHome={() => setActiveTab('home')}
            onOpenChat={(partnerId) => {
              setSelectedChatId(partnerId);
              setActiveTab('chat_room');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* Fixed Bottom Navigation (hidden on product detail and chat room) */}
        {activeTab !== 'product_detail' && activeTab !== 'chat_room' && activeTab !== 'add_product' && (
          <BottomNav
            activeTab={activeTab === 'seller' ? 'profile' : activeTab}
            onSelectTab={handleSelectTab}
            cartCount={3}
          />
        )}
      </main>
    </div>
  );
}
