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
    <section className="location-section">
      <div className="location-header-row">
        <div className="location-title-group">
          <MapPin size={16} className="pin-icon" strokeWidth={2.4} />
          <h3 className="location-heading">จุดนัดรับยอดนิยมในมหาวิทยาลัย</h3>
        </div>
        <ImagePreview
          src={CAMPUS_MAP_IMAGE}
          alt="แผนที่มหาวิทยาลัยศรีปทุม"
          width={480}
          height={340}
          className="campus-safe-badge campus-map-trigger"
          triggerLabel="แผนที่ SPU"
        />
      </div>

      <div className="location-chips-row" ref={scrollRef} onScroll={updateScrollState}>
        <button
          type="button"
          className={`location-chip ${activeLocation === 'all' ? 'active' : ''}`}
          onClick={() => onSelectLocation('all')}
        >
          {activeLocation === 'all' && <span className="chip-dot" />}
          <span>ทั้งหมดทุกตึก</span>
        </button>

        {locationList.map((loc) => {
          const locKey = loc.slug || loc.id;
          const isActive = activeLocation === locKey;
          return (
            <button
              key={locKey}
              type="button"
              className={`location-chip ${isActive ? 'active' : ''}`}
              onClick={() => onSelectLocation(locKey)}
            >
              {isActive && <span className="chip-dot" />}
              <span>{loc.name || loc.location_name}</span>
            </button>
          );
        })}
      </div>

      {/* Scroll indicator dots */}
      {isScrollable && (
        <div className="slider-dots-container" role="tablist" aria-label="ตัวบอกตำแหน่งการเลื่อนจุดนัดรับ">
          {[0, 1, 2].map((index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={activeDot === index}
              aria-label={`เลื่อนจุดนัดรับไปตำแหน่งที่ ${index + 1}`}
              className={`slider-dot ${activeDot === index ? 'active' : ''}`}
              onClick={() => scrollToDot(index)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
