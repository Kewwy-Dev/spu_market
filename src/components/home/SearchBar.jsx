import React from 'react';
import { Search, ScanLine, X } from 'lucide-react';

export default function SearchBar({ searchQuery, onSearchChange }) {
  return (
    <div className="standalone-search-wrapper">
      <div className="standalone-search-box">
        <div className="search-icon-left" aria-hidden="true">
          <Search size={18} strokeWidth={2.4} />
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="ค้นหาหนังสือเรียน, อุปกรณ์การเรียน, เสื้อผ้า..."
          className="standalone-search-input"
          aria-label="ค้นหาสินค้าใน SPU Market"
        />

        {searchQuery ? (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => onSearchChange('')}
            title="ล้างคำค้นหา"
            aria-label="ล้างคำค้นหา"
          >
            <X size={16} />
          </button>
        ) : (
          <button
            type="button"
            className="search-filter-btn"
            title="สแกนหรือตั้งค่าตัวกรอง"
            aria-label="ตัวกรอง"
          >
            <ScanLine size={18} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}
