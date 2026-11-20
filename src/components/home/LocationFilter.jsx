import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { LOCATIONS } from '../../data/products';
import { listPickupLocations } from '../../lib/marketplace';
import ImagePreview from '../spectrumui/image-preview';

const CAMPUS_MAP_IMAGE = '/images/spu-campus-map.png';

export default function LocationFilter({ activeLocation, onSelectLocation, locations: propLocations }) {
  const scrollRef = useRef(null);
  const [activeDot, setActiveDot] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);
  const [locations, setLocations] = useState(propLocations || []);

  useEffect(() => {
    let isCurrent = true;
    if (propLocations?.length) {
      setLocations(propLocations);
      return;
    }
    listPickupLocations()
      .then((rows) => {
        if (!isCurrent) return;
        setLocations(rows);
      })
      .catch((error) => {
        console.warn('Could not load pickup locations in LocationFilter:', error);
      });
    return () => {
      isCurrent = false;
    };
  }, [propLocations]);

  const locationList = locations.length > 0 ? locations : LOCATIONS;

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setIsScrollable(maxScroll > 6);
    if (maxScroll > 6) {
      const ratio = el.scrollLeft / maxScroll;
      if (ratio <= 0.25) setActiveDot(0);
      else if (ratio >= 0.75) setActiveDot(2);
      else setActiveDot(1);
    } else {
      setActiveDot(0);
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();

    const handleResize = () => updateScrollState();
    window.addEventListener('resize', handleResize);

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateScrollState());
      resizeObserver.observe(el);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [locationList.length, updateScrollState]);

  const scrollToDot = (index) => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;
    let target = 0;
    if (index === 1) target = maxScroll / 2;
    else if (index === 2) target = maxScroll;
    el.scrollTo({ left: target, behavior: 'smooth' });
  };

  return (
    <section className="flex min-w-0 flex-col gap-2 rounded-[14px] border border-purple-100 bg-purple-50/70 px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          <MapPin size={16} className="text-purple-600" strokeWidth={2.4} />
          <h3 className="text-[0.78rem] sm:text-sm font-bold text-purple-950">จุดนัดรับยอดนิยมในมหาวิทยาลัย</h3>
        </div>
        <ImagePreview
          src={CAMPUS_MAP_IMAGE}
          alt="แผนที่มหาวิทยาลัยศรีปทุม"
          width={480}
          height={340}
          className="inline-flex !w-auto cursor-zoom-in items-center justify-center gap-1 rounded-full border border-spu-teal-border bg-spu-teal-light px-2 py-0.5 text-[0.62rem] font-bold text-emerald-700"
          triggerLabel="แผนที่ SPU"
        />
      </div>

      <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto pb-0.5" ref={scrollRef} onScroll={updateScrollState}>
        <button
          type="button"
          className={`inline-flex shrink-0 items-center gap-[5px] whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold transition-all duration-200 ${
            activeLocation === 'all'
              ? 'border-spu-pink bg-[#fff5f9] text-spu-pink shadow-[0_1px_4px_rgba(230,0,126,0.15)]'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
          onClick={() => onSelectLocation('all')}
        >
          {activeLocation === 'all' && <span className="h-1.5 w-1.5 rounded-full bg-spu-pink" />}
          <span>ทั้งหมดทุกตึก</span>
        </button>

        {locationList.map((loc) => {
          const locKey = loc.slug || loc.id;
          const isActive = activeLocation === locKey;
          return (
            <button
              key={locKey}
              type="button"
              className={`inline-flex shrink-0 items-center gap-[5px] whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold transition-all duration-200 ${
                isActive
                  ? 'border-spu-pink bg-[#fff5f9] text-spu-pink shadow-[0_1px_4px_rgba(230,0,126,0.15)]'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
              onClick={() => onSelectLocation(locKey)}
            >
              {isActive && <span className="h-1.5 w-1.5 rounded-full bg-spu-pink" />}
              <span>{loc.name || loc.location_name}</span>
            </button>
          );
        })}
      </div>

      {/* Scroll indicator dots */}
      {isScrollable && (
        <div className="-mt-[3px] flex justify-center gap-[5px] pt-px" role="tablist" aria-label="ตัวบอกตำแหน่งการเลื่อนจุดนัดรับ">
          {[0, 1, 2].map((index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={activeDot === index}
              aria-label={`เลื่อนจุดนัดรับไปตำแหน่งที่ ${index + 1}`}
              className={`h-1.5 cursor-pointer rounded-full border-0 p-0 transition-all duration-300 ${
                activeDot === index ? 'w-[18px] bg-purple-600' : 'w-1.5 bg-purple-600/20'
              }`}
              onClick={() => scrollToDot(index)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
