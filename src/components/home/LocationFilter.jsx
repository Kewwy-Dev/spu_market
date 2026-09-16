import React from 'react';
import { MapPin, Shield } from 'lucide-react';
import { LOCATIONS } from '../../data/products';

export default function LocationFilter({ activeLocation, onSelectLocation }) {
  return (
    <section className="location-section">
      <div className="location-header-row">
        <div className="location-title-group">
          <MapPin size={16} className="pin-icon" strokeWidth={2.4} />
          <h3 className="location-heading">จุดนัดรับยอดนิยมในมหาวิทยาลัย</h3>
        </div>
        <div className="campus-safe-badge">
          <Shield size={11} />
          <span>สะดวกปลอดภัย ในแคมปัส</span>
        </div>
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
