import React from 'react';
import { Search, ScanLine, Sparkles } from 'lucide-react';

export default function HeroSearch({ searchQuery, onSearchChange }) {
  return (
    <section className="market-hero-card">
      <div className="line-miniapp-badge">
        <span className="live-pulse-dot" />
        <span className="badge-text">LINE MINI APP • ON CAMPUS</span>
      </div>

      <h1 className="hero-market-title">
        SPU Student Market
      </h1>

      <p className="hero-market-subtitle">
        ตลาดนัดชาวเด็กแนว ศรีปทุม ช้อป-ส่งต่อปลอดภัยภายในมหาลัย
      </p>

      <div className="search-bar-container">
        <div className="search-icon-left">
          <Search size={18} strokeWidth={2.4} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="ค้นหาหนังสือเรียน, อุปกรณ์การเรียน, เสื้อผ้า..."
          className="market-search-input"
        />
        <button
          type="button"
          className="search-filter-btn"
          title="สแกนหรือตั้งค่าตัวกรอง"
          aria-label="ตัวกรอง"
        >
          <ScanLine size={18} strokeWidth={2} />
        </button>
      </div>
    </section>
  );
}
