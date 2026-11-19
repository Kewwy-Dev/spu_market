import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Flame } from 'lucide-react';

const SLIDES = [
  {
    id: 0,
    badgeType: 'new',
    badgeText: '✨ ใหม่ล่าสุด • เพิ่งลงขาย',
    title: 'สินค้าลงขายล่าสุด 🛍️',
    subtitle: 'ไม่พลาดทุกชิ้นใหม่! สินค้ามือสองและของใหม่ป้ายแดงจากนักศึกษา SPU',
    theme: 'theme-rose',
    ctaText: 'ดูสินค้าใหม่ทั้งหมด',
  },
  {
    id: 1,
    badgeType: 'live',
    badgeText: 'LINE MINI APP • ON CAMPUS',
    title: 'SPU Student Market',
    subtitle: 'ตลาดนัดชาวเด็กแนว ศรีปทุม ช้อป-ส่งต่อปลอดภัยภายในมหาลัย',
    theme: 'theme-magenta',
    ctaText: 'ดูสินค้าทั้งหมด',
  },
  {
    id: 2,
    badgeType: 'pickup',
    badgeText: '📍 ON-CAMPUS PICKUP • ฟรีค่าส่ง',
    title: 'นัดรับฟรีในแคมปัส SPU',
    subtitle: 'สะดวก ปลอดภัย นัดรับง่ายที่ตึก 11, อาคาร 9, และโรงอาหารกลาง',
    theme: 'theme-indigo',
    ctaText: 'ดูจุดนัดรับยอดนิยม',
  },
  {
    id: 3,
    badgeType: 'verified',
    badgeText: '🛡️ SPU VERIFIED • ปลอดภัย 100%',
    title: 'ช้อปมั่นใจ ยืนยันตัวตน @spumail.net',
    subtitle: 'ผู้ซื้อและผู้ขายผ่านการตรวจสอบรหัสนักศึกษาจริง ไร้กังวลเรื่องการโกง',
    theme: 'theme-teal',
    ctaText: 'ยืนยันตัวตนเลย',
  },
];

export default function HeroBannerSlider({
  onNavigateToRegister,
  onNavigateToProducts,
  onSelectLocationSection,
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const isDragging = useRef(false);

  // Auto-advance slider every 3.8 seconds
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 3800);

    return () => clearInterval(timer);
  }, [isPaused]);

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev === 0 ? SLIDES.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    isDragging.current = false;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
    if (Math.abs(touchStartX.current - touchEndX.current) > 10) {
      isDragging.current = true;
    }
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  const handleBannerClick = (slide) => {
    if (isDragging.current) {
      isDragging.current = false;
      return;
    }

    switch (slide.id) {
      case 0:
        // สไลด์ 0 (สินค้าใหม่) -> ไปหน้าสินค้า เรียงตามของใหม่ล่าสุด
        onNavigateToProducts?.();
        break;
      case 1:
        // สไลด์ 1 (SPU Market) -> ไปหน้าสินค้าทั้งหมด
        onNavigateToProducts?.();
        break;
      case 2:
        // สไลด์ 2 (จุดนัดรับยอดนิยม) -> เลื่อน/กรองหมวดหมู่จุดนัดรับ
        if (onSelectLocationSection) {
          onSelectLocationSection();
        } else {
          const el = document.getElementById('pickup-locations') || document.querySelector('.location-section');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        break;
      case 3:
        // สไลด์ 3 (SPU Verified) -> ไปหน้าสมัคร/ยืนยันตัวตน
        onNavigateToRegister?.();
        break;
      default:
        break;
    }
  };

  return (
    <div
      className="hero-slider-wrapper"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="hero-slider-container">
        <div
          className="hero-slider-track"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {SLIDES.map((slide, index) => (
            <div
              key={slide.id}
              className={`hero-slide-item ${slide.theme}`}
              onClick={() => handleBannerClick(slide)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleBannerClick(slide);
                }
              }}
              role="button"
              tabIndex={0}
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${SLIDES.length}: ${slide.title} - ${slide.ctaText}`}
              style={{ cursor: 'pointer' }}
            >
              <div className="slide-content">
                <div className={`slider-badge ${slide.theme === 'theme-rose' ? 'slider-badge-rose' : ''}`}>
                  {slide.badgeType === 'live' && <span className="live-pulse-dot" />}
                  {slide.badgeType === 'new' && <span className="new-pulse-dot" />}
                  <span>{slide.badgeText}</span>
                </div>

                <h2 className={`slider-title ${slide.theme === 'theme-rose' ? 'slider-title-rose' : ''}`}>
                  {slide.title}
                </h2>
                <p className={`slider-subtitle ${slide.theme === 'theme-rose' ? 'slider-subtitle-rose' : ''}`}>
                  {slide.subtitle}
                </p>

                {slide.theme === 'theme-rose' && (
                  <div className="rose-sparkles">
                    <Sparkles size={14} className="sparkle-icon" />
                    <Sparkles size={10} className="sparkle-icon sparkle-sm" />
                    <Flame size={12} className="sparkle-icon" />
                  </div>
                )}

                <div
                  className={`slider-cta-tag ${slide.theme === 'theme-rose' ? 'slider-cta-rose' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBannerClick(slide);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleBannerClick(slide);
                    }
                  }}
                >
                  <span>{slide.ctaText}</span>
                  <span className="cta-arrow">→</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Prev / Next Arrows */}
        <button
          type="button"
          className="slider-nav-btn prev-btn"
          onClick={handlePrev}
          aria-label="สไลด์ก่อนหน้า"
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>

        <button
          type="button"
          className="slider-nav-btn next-btn"
          onClick={handleNext}
          aria-label="สไลด์ถัดไป"
        >
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Dot Indicators */}
      <div className="slider-dots-container" role="tablist">
        {SLIDES.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            aria-selected={currentSlide === index}
            aria-label={`ไปที่สไลด์ ${index + 1}`}
            className={`slider-dot ${currentSlide === index ? 'active' : ''}`}
            onClick={() => setCurrentSlide(index)}
          />
        ))}
      </div>
    </div>
  );
}
