import React from 'react';
import { CalendarDays, CheckCircle2, Clock3, MapPin, PackageCheck, X } from 'lucide-react';

const sampleHistory = [
  {
    id: 1,
    type: 'ส่งมอบสินค้า',
    title: 'ชีทสรุปวิชา ENG101',
    location: 'อาคาร 11 ชั้น 1',
    date: '4 พ.ย. 2569 · 12:30 น.',
    status: 'ส่งมอบแล้ว',
    complete: true,
  },
  {
    id: 2,
    type: 'รับสินค้า',
    title: 'เสื้อช็อปคณะ',
    location: 'โรงอาหารกลาง',
    date: '2 พ.ย. 2569 · 16:00 น.',
    status: 'รับสินค้าแล้ว',
    complete: true,
  },
  {
    id: 3,
    type: 'นัดรับสินค้า',
    title: 'เครื่องคิดเลขวิทยาศาสตร์',
    location: 'อาคาร 1 ชั้น 1',
    date: '6 พ.ย. 2569 · 13:00 น.',
    status: 'รอนัดรับ',
    complete: false,
  },
];

export default function PickupHistoryModal({ onClose }) {
  return (
    <div className="pickup-history-backdrop" onClick={onClose}>
      <section
        className="pickup-history-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pickup-history-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="pickup-history-header">
          <div className="pickup-history-icon"><PackageCheck size={20} /></div>
          <div>
            <h2 id="pickup-history-title">ประวัติการรับ/ส่งของในมหาวิทยาลัย</h2>
            <p>ตัวอย่างรายการนัดหมายและส่งมอบ</p>
          </div>
          <button type="button" className="pickup-history-close" onClick={onClose} aria-label="ปิด">
            <X size={20} />
          </button>
        </header>

        <div className="pickup-history-list">
          {sampleHistory.map((item) => (
            <article className="pickup-history-card" key={item.id}>
              <div className={`pickup-history-status-icon ${item.complete ? 'complete' : 'pending'}`}>
                {item.complete ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}
              </div>
              <div className="pickup-history-details">
                <div className="pickup-history-card-top">
                  <span className="pickup-history-type">{item.type}</span>
                  <span className={`pickup-history-status ${item.complete ? 'complete' : 'pending'}`}>
                    {item.status}
                  </span>
                </div>
                <h3>{item.title}</h3>
                <p><MapPin size={13} /> {item.location}</p>
                <p><CalendarDays size={13} /> {item.date}</p>
              </div>
            </article>
          ))}
        </div>

        <p className="pickup-history-note">รายการด้านบนเป็นข้อมูลตัวอย่าง ไม่ใช่ประวัติการซื้อขายจริง</p>
        <button type="button" className="pickup-history-done" onClick={onClose}>ปิด</button>
      </section>
    </div>
  );
}
