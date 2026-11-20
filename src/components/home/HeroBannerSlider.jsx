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

const THEME_BG = {
  'theme-rose': 'bg-gradient-to-br from-[#fff0f5] via-[#ffe4ef] to-[#ffc8e0] text-[#9d174d]',
  'theme-magenta': 'bg-gradient-to-br from-[#a20857] via-[#d80072] to-[#7e22ce] text-white',
  'theme-indigo': 'bg-gradient-to-br from-[#1e3a8a] via-[#2563eb] to-[#4f46e5] text-white',
  'theme-teal': 'bg-gradient-to-br from-[#065f46] via-[#059669] to-[#0d9488] text-white',
};

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
      case 1:
        onNavigateToProducts?.();
        break;
      case 2:
        if (onSelectLocationSection) {
          onSelectLocationSection();
        } else {
          const el = document.getElementById('pickup-locations');
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        break;
      case 3:
        onNavigateToRegister?.();
        break;
      default:
        break;
    }
  };

  return (
    <div
      className="relative select-none overflow-hidden rounded-[18px] shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative w-full overflow-hidden rounded-[18px]">
        <div
          className="flex w-full transition-transform duration-[450ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {SLIDES.map((slide, index) => {
            const isRose = slide.theme === 'theme-rose';
            return (
              <div
                key={slide.id}
                className={`relative flex min-h-[152px] sm:min-h-[172px] w-full shrink-0 cursor-pointer flex-col justify-center overflow-hidden px-11 py-5 sm:px-14 sm:py-6 ${THEME_BG[slide.theme] || ''}`}
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
              >
                {/* Decorative corner glow */}
                {isRose ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -top-10 -right-10 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(236,72,153,0.18)_0%,transparent_70%)] animate-[rose-glow_3s_ease-in-out_infinite_alternate]"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -bottom-7 -left-5 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(244,114,182,0.15)_0%,transparent_70%)]"
                    />
                  </>
                ) : (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-7 -right-7 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.18)_0%,transparent_70%)]"
                  />
                )}

                <div className="relative z-[1] flex flex-col gap-1.5">
                  <div
                    className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[0.62rem] font-bold tracking-[0.4px] backdrop-blur-xs ${
                      isRose
                        ? 'border border-pink-500/35 bg-pink-500/12 text-pink-700'
                        : 'bg-black/22 text-white/95'
                    }`}
                  >
                    {slide.badgeType === 'live' && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.4)]" />
                    )}
                    {slide.badgeType === 'new' && (
                      <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-pink-500 animate-[new-blink_1.2s_ease-in-out_infinite]" />
                    )}
                    <span>{slide.badgeText}</span>
                  </div>

                  <h2
                    className={`mt-0.5 text-[1.1rem] sm:text-xl leading-[1.25] ${
                      isRose
                        ? 'bg-gradient-to-br from-pink-700 via-pink-500 to-pink-400 bg-clip-text font-black text-transparent'
                        : 'font-extrabold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.2)]'
                    }`}
                  >
                    {slide.title}
                  </h2>
                  <p
                    className={`mb-1 text-[0.72rem] sm:text-[0.8rem] leading-[1.45] ${
                      isRose ? 'text-pink-700/85' : 'text-white/90'
                    }`}
                  >
                    {slide.subtitle}
                  </p>

                  {isRose && (
                    <div className="absolute top-0 right-1 z-[2] flex items-center gap-1">
                      <Sparkles size={14} className="text-pink-500 animate-[sparkle-float_2s_ease-in-out_infinite]" />
                      <Sparkles size={10} className="text-pink-300 animate-[sparkle-float_2s_ease-in-out_0.4s_infinite]" />
                      <Flame size={12} className="text-pink-500 animate-[sparkle-float_2s_ease-in-out_infinite]" />
                    </div>
                  )}

                  <div
                    className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[0.7rem] font-bold transition-all duration-200 ${
                      isRose
                        ? 'bg-gradient-to-br from-pink-500 to-pink-400 font-extrabold tracking-[0.3px] text-white shadow-[0_3px_12px_rgba(236,72,153,0.4)] hover:-translate-y-px hover:from-pink-600 hover:to-pink-500 hover:shadow-[0_5px_18px_rgba(236,72,153,0.55)]'
                        : 'border border-white/35 bg-white/20 text-white backdrop-blur-xs hover:bg-white/30'
                    }`}
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
                    <span className="text-[0.8rem]">→</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Prev / Next Arrows */}
        <button
          type="button"
          className="absolute top-1/2 left-2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/25 text-white backdrop-blur-xs transition-all duration-200 hover:scale-108 hover:bg-white/40"
          onClick={handlePrev}
          aria-label="สไลด์ก่อนหน้า"
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>

        <button
          type="button"
          className="absolute top-1/2 right-2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/25 text-white backdrop-blur-xs transition-all duration-200 hover:scale-108 hover:bg-white/40"
          onClick={handleNext}
          aria-label="สไลด์ถัดไป"
        >
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Dot Indicators */}
      <div className="flex justify-center gap-1.5 py-1.5" role="tablist">
        {SLIDES.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            aria-selected={currentSlide === index}
            aria-label={`ไปที่สไลด์ ${index + 1}`}
            className={`h-1.5 cursor-pointer rounded-full border-0 p-0 transition-all duration-300 ${
              currentSlide === index ? 'w-[18px] bg-spu-pink' : 'w-1.5 bg-black/20'
            }`}
            onClick={() => setCurrentSlide(index)}
          />
        ))}
      </div>
    </div>
  );
}
