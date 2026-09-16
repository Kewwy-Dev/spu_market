import React, { useState } from 'react';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import BottomNav from './components/common/BottomNav';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [currentUser, setCurrentUser] = useState(null);

  const handleSelectTab = (tab) => {
    if (tab === 'seller') {
      if (!currentUser) {
        alert('ระบบสำหรับผู้ขาย: กรุณาเข้าสู่ระบบด้วยอีเมล @spumail.net ก่อนเริ่มใช้งาน');
        setActiveTab('login');
      } else {
        alert(`ยินดีต้อนรับคุณ ${currentUser.displayName} เข้าสู่หน้าจัดการร้านค้า`);
      }
      return;
    }
    if (tab === 'support') {
      alert('ศูนย์ช่วยเหลือ SPU Market: ติดต่อเจ้าหน้าที่กองบริการนักศึกษา อาคาร 10 หรือ LINE @spumarket');
      return;
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    alert(`เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับ ${user.displayName}`);
    setActiveTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    if (window.confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
      setCurrentUser(null);
      alert('ออกจากระบบเรียบร้อยแล้ว');
    }
  };

  return (
    <div className="app-viewport">
      <main className="market-app-shell" role="main">
        {activeTab === 'home' && (
          <HomePage
            onNavigateToRegister={() => setActiveTab('register')}
            onNavigateToLogin={() => setActiveTab('login')}
            currentUser={currentUser}
            onLogout={handleLogout}
          />
        )}

        {activeTab === 'register' && (
          <RegisterPage onBack={() => setActiveTab('home')} />
        )}

        {activeTab === 'login' && (
          <LoginPage
            onBack={() => setActiveTab('home')}
            onLoginSuccess={handleLoginSuccess}
            onNavigateToRegister={() => setActiveTab('register')}
          />
        )}

        {/* Fixed Bottom Navigation */}
        <BottomNav activeTab={activeTab} onSelectTab={handleSelectTab} />
      </main>
    </div>
  );
}
