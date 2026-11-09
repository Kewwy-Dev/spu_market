import React from 'react';
import { MapPin } from 'lucide-react';
import { LOCATIONS } from '../../data/products';
import ImagePreview from '../spectrumui/image-preview';

const CAMPUS_MAP_IMAGE = '/images/spu-campus-map.png';

export default function LocationFilter({ activeLocation, onSelectLocation }) {
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

      <div className="location-chips-row">
        <button
          type="button"
          className={`location-chip ${activeLocation === 'all' ? 'active' : ''}`}
          onClick={() => onSelectLocation('all')}
        >
          {activeLocation === 'all' && <span className="chip-dot" />}
          <span>ทั้งหมดทุกตึก</span>
        </button>

        {LOCATIONS.map((loc) => {
          const isActive = activeLocation === loc.id;
          return (
            <button
              key={loc.id}
              type="button"
              className={`location-chip ${isActive ? 'active' : ''}`}
              onClick={() => onSelectLocation(loc.id)}
            >
              {isActive && <span className="chip-dot" />}
              <span>{loc.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
