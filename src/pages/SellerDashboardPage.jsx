import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, BadgeCheck, BookOpenCheck, Building2, Check, CircleDollarSign,
  Edit3, MapPin, PackageCheck, Plus, RotateCcw, Star, Store, Trash2,
} from 'lucide-react';

const statusLabels = { active: 'กำลังขาย', sold: 'ขายแล้ว', draft: 'ฉบับร่าง', archived: 'เก็บถาวร', trash: 'ถังขยะ' };
const filters = [
  { id: 'active', label: 'กำลังขาย' },
  { id: 'draft', label: 'ฉบับร่าง' },
  { id: 'sold', label: 'ขายแล้ว' },
  { id: 'trash', label: 'ถังขยะ' },
];

function formatPrice(price) {
  return `฿${Number(price || 0).toLocaleString('th-TH')}`;
}

function trashExpiry(trashedAt) {
  if (!trashedAt) return { expired: false, text: 'กู้คืนได้ภายใน 3 วัน' };
  const remaining = new Date(trashedAt).getTime() + 3 * 24 * 60 * 60 * 1000 - Date.now();
  if (remaining <= 0) return { expired: true, text: 'หมดเวลากู้คืนแล้ว' };
  const hours = Math.ceil(remaining / (60 * 60 * 1000));
  return { expired: false, text: hours > 24 ? `ลบถาวรในอีก ${Math.ceil(hours / 24)} วัน` : `ลบถาวรในอีก ${hours} ชม.` };
}

export default function SellerDashboardPage({
  currentUser,
  userProducts = [],
  pickupLocations = [],
  reviewSummary = { average: null, count: 0 },
  defaultPickupLocation = 'b11',
  initialPickupLocation = defaultPickupLocation,
  onBack,
  onAddNewProduct,
  onEditProduct,
  onDeleteProduct,
  onRestoreProduct,
  onChangePickupLocation,
  isLoading = false,
  error = '',
}) {
  const [activeFilter, setActiveFilter] = useState('active');
  const [pickupIndex, setPickupIndex] = useState(0);
  const [pickupOrderOffset, setPickupOrderOffset] = useState(0);
  const pickupTrack = useRef(null);
  const pickupPages = useRef([]);
  const initialPickup = useRef(null);
  const orderedPickupLocations = useMemo(() => {
    if (!pickupLocations.length) return [];
    const offset = ((pickupOrderOffset % pickupLocations.length) + pickupLocations.length) % pickupLocations.length;
    return [...pickupLocations.slice(offset), ...pickupLocations.slice(0, offset)];
  }, [pickupLocations, pickupOrderOffset]);
  const pickupPageCount = Math.ceil(orderedPickupLocations.length / 4);
  const displayName = currentUser?.displayName || '—';
  const initial = Array.from(displayName)[0] || 'S';
  const activeCount = userProducts.filter((product) => product.status === 'active').length;
  const soldProducts = userProducts.filter((product) => product.status === 'sold');
  const soldCount = soldProducts.length;
  const trashCount = userProducts.filter((product) => product.status === 'trash').length;
  const draftCount = userProducts.filter((product) => product.status === 'draft' || product.status === 'archived').length;
  const soldValue = soldProducts.reduce((total, product) => total + Number(product.price || 0), 0);
  const visibleProducts = useMemo(() => userProducts.filter((product) => (
    activeFilter === 'draft'
      ? product.status === 'draft' || product.status === 'archived'
      : product.status === activeFilter
  )), [userProducts, activeFilter]);

  useEffect(() => {
    if (!pickupLocations.length || initialPickup.current !== null) return;
    initialPickup.current = initialPickupLocation;
    const index = pickupLocations.findIndex((location) => location.id === initialPickupLocation);
    setPickupOrderOffset(Math.max(index, 0));
    setPickupIndex(0);
  }, [initialPickupLocation, pickupLocations]);

  const scrollPickupTo = (pageIndex) => {
    const track = pickupTrack.current;
    const page = pickupPages.current[pageIndex];
    if (track && page) track.scrollTo({ left: page.offsetLeft - track.offsetLeft, behavior: 'smooth' });
  };

  const handlePickupScroll = () => {
    const track = pickupTrack.current;
    if (!track || pickupPageCount < 2) return;
    setPickupIndex(Math.min(Math.round(track.scrollLeft / track.clientWidth), pickupPageCount - 1));
  };

  const selectPickup = (location) => {
    if (defaultPickupLocation === location.id) {
      const resetLocation = initialPickup.current || location.id;
      const resetIndex = Math.max(pickupLocations.findIndex((item) => item.id === resetLocation), 0);
      setPickupOrderOffset(resetIndex);
      setPickupIndex(0);
      scrollPickupTo(0);
      if (resetLocation !== location.id) onChangePickupLocation?.(resetLocation);
      return;
    }
    const selectedIndex = pickupLocations.findIndex((item) => item.id === location.id);
    setPickupOrderOffset(Math.max(selectedIndex, 0));
    setPickupIndex(0);
    onChangePickupLocation?.(location.id);
    scrollPickupTo(0);
  };

  return (
    <div className="seller-store-page stitch-seller-page">
      <header className="stitch-market-header">
        <div className="stitch-seller-header-main">
          <button type="button" className="stitch-settings-button stitch-back-button" onClick={onBack} aria-label="ย้อนกลับ"><ArrowLeft size={18} /></button>
          <span className="stitch-seller-header-title">จัดการร้านค้า &amp; โปรไฟล์ผู้ขาย</span>
        </div>
        <span className="stitch-account-label">บัญชีผู้ขาย</span>
      </header>

      <main className="stitch-seller-content">
        <section className="stitch-seller-profile-card">
          <div className="stitch-seller-identity">
            <div className="stitch-seller-avatar">{initial}{currentUser?.verified && <span><Check size={11} /></span>}</div>
            <div className="stitch-seller-copy">
              <h2>{displayName}</h2>
              <p><span className="stitch-private-id">▣ รหัสนักศึกษา {currentUser?.studentId || 'ไม่พบข้อมูล'}</span>{currentUser?.faculty ? ` · ${currentUser.faculty}` : ''}</p>
              <span className={`stitch-verified-pill ${currentUser?.verified ? '' : 'unverified'}`}>
                {currentUser?.verified ? <><BadgeCheck size={13} /> ยืนยันตัวตนแล้ว</> : 'ยังไม่ยืนยันตัวตน'}
              </span>
            </div>
          </div>
          <div className="stitch-seller-summary">
            <div className="stitch-seller-metric stitch-rating-metric">
              <div className="stitch-stars" aria-label={reviewSummary.average ? `คะแนน ${reviewSummary.average.toFixed(1)} จาก 5` : 'ยังไม่มีคะแนน'}>
                {Array.from({ length: 5 }, (_, index) => <Star key={index} size={13} fill={reviewSummary.average && index < Math.round(reviewSummary.average) ? 'currentColor' : 'none'} />)}
              </div>
              <strong>{reviewSummary.average ? reviewSummary.average.toFixed(1) : '—'}</strong><small>คะแนน</small>
            </div>
            <div className="stitch-seller-metric"><strong>{isLoading ? '—' : reviewSummary.count}</strong><small>รีวิว</small></div>
            <div className="stitch-seller-metric"><strong>{isLoading ? '—' : soldCount}</strong><small>ชิ้นที่ขายแล้ว</small></div>
          </div>
        </section>

        <div className="stitch-section-title"><div><CircleDollarSign size={18} /><h2>ภาพรวมร้านค้า</h2></div><span>จากสินค้าที่ขายแล้ว</span></div>
        <section className="stitch-sales-card">
          <div className="stitch-sales-copy">
            <span>ยอดรวมสินค้าที่ขายแล้ว</span>
            <strong>{isLoading ? 'กำลังโหลด…' : formatPrice(soldValue)}</strong>
            <small><PackageCheck size={13} /> รวม {isLoading ? '—' : soldCount} ชิ้นที่ทำเครื่องหมายว่าขายแล้ว</small>
          </div>
          <div className="stitch-sales-icon"><CircleDollarSign size={29} /></div>
        </section>

        <section className="stitch-stat-grid" aria-label="สถิติร้านค้า">
          <article><span>ขายแล้ว</span><PackageCheck size={16} /><strong>{isLoading ? '—' : soldCount}</strong><small>รายการ</small></article>
          <article><span>กำลังขาย</span><Store size={16} /><strong>{isLoading ? '—' : activeCount}</strong><small>รายการที่เปิดอยู่</small></article>
          <article><span>ฉบับร่าง</span><BookOpenCheck size={16} /><strong>{isLoading ? '—' : draftCount}</strong><small>รายการ</small></article>
        </section>

        <button type="button" className="stitch-primary-cta" onClick={onAddNewProduct}><Plus size={19} /> เพิ่มสินค้าใหม่ลงขาย</button>

        <section className="stitch-inventory-section">
          <div className="stitch-section-title stitch-inventory-title"><div><Store size={18} /><h2>สินค้าของฉัน</h2></div><span>{isLoading ? 'กำลังโหลด…' : `${userProducts.length} รายการ`}</span></div>
          <div className="stitch-product-tabs" role="tablist" aria-label="กรองสถานะสินค้า">
            {filters.map((filter) => {
              const count = isLoading ? '—' : filter.id === 'draft'
                ? draftCount
                : filter.id === 'trash'
                  ? trashCount
                  : userProducts.filter((product) => product.status === filter.id).length;
              return <button type="button" role="tab" aria-selected={activeFilter === filter.id} className={activeFilter === filter.id ? 'active' : ''} key={filter.id} onClick={() => setActiveFilter(filter.id)}>{filter.label}<span>{count}</span></button>;
            })}
          </div>
          {error && <p className="seller-store-error" role="alert">{error}</p>}
          {isLoading ? <div className="stitch-empty-state">กำลังโหลดสินค้าของร้าน...</div> : visibleProducts.length ? (
            <div className="stitch-inventory-list">
              {visibleProducts.map((product) => {
                const expiry = product.status === 'trash' ? trashExpiry(product.trashedAt) : null;
                return (
                  <article className="stitch-inventory-card" key={product.id}>
                    <div className="stitch-inventory-image-wrap">
                      {product.image ? <img src={product.image} alt={product.title} /> : <div className="stitch-no-product-image"><Store size={21} /><span>ไม่มีรูปสินค้า</span></div>}
                      <span className={`stitch-product-status ${product.status}`}>{statusLabels[product.status] || product.status}</span>
                    </div>
                    <div className="stitch-inventory-main">
                      <div className="stitch-inventory-heading"><h3>{product.title}</h3><strong>{formatPrice(product.price)}</strong></div>
                      <p className="stitch-inventory-location"><MapPin size={13} /> {product.location || 'ไม่ระบุจุดนัดรับ'}</p>
                      <div className="stitch-inventory-meta">
                        <span>{product.categoryName || product.category || 'ไม่ระบุหมวดหมู่'}</span>
                        <span>{product.conditionTag || 'ไม่ระบุสภาพ'}</span>
                        <span>ลงขาย {product.createdAt ? new Date(product.createdAt).toLocaleDateString('th-TH') : '—'}</span>
                      </div>
                      {expiry && <p className={`stitch-trash-expiry ${expiry.expired ? 'expired' : ''}`}>{expiry.text}</p>}
                      <div className="stitch-inventory-actions">
                        {product.status === 'trash' ? (
                          <button type="button" disabled={expiry.expired} onClick={() => onRestoreProduct?.(product)}><RotateCcw size={14} /> กู้คืนสินค้า</button>
                        ) : (
                          <>
                            <button type="button" onClick={() => onEditProduct?.(product)}><Edit3 size={14} /> แก้ไข</button>
                            <button type="button" className="delete" onClick={() => onDeleteProduct?.(product)}><Trash2 size={14} /> ย้ายไปถังขยะ</button>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="stitch-empty-state"><Store size={24} /><strong>{activeFilter === 'trash' ? 'ถังขยะว่างเปล่า' : userProducts.length ? `ยังไม่มีสินค้า${statusLabels[activeFilter] || ''}` : 'ยังไม่มีสินค้าในร้าน'}</strong><span>{activeFilter === 'trash' ? 'สินค้าที่ลบจะอยู่ที่นี่และกู้คืนได้ภายใน 3 วัน' : 'เริ่มลงขายและจัดการสินค้าของคุณได้ที่นี่'}</span>{activeFilter !== 'trash' && <button type="button" onClick={onAddNewProduct}><Plus size={16} /> เพิ่มสินค้าใหม่</button>}</div>
          )}
        </section>

        <section className="stitch-pickup-card">
          <div className="stitch-section-title"><div><MapPin size={18} /><h2>จุดนัดรับประจำร้าน</h2></div><span>เปลี่ยนได้</span></div>
          <p>เลือกจุดหลักสำหรับสินค้าที่กำลังขายอยู่ ระบบจะอัปเดตตำแหน่งให้สินค้าที่ยังเปิดขายทั้งหมด</p>
          {pickupLocations.length ? <>
            <div className="stitch-pickup-carousel" ref={pickupTrack} onScroll={handlePickupScroll}>
              <div className="stitch-pickup-pages">
                {Array.from({ length: pickupPageCount }, (_, pageIndex) => (
                  <div className="stitch-pickup-page" key={`pickup-page-${pageIndex}`} ref={(node) => { pickupPages.current[pageIndex] = node; }}>
                    {orderedPickupLocations.slice(pageIndex * 4, pageIndex * 4 + 4).map((location) => (
                      <button
                        key={location.id}
                        type="button"
                        className={defaultPickupLocation === location.id ? 'selected' : ''}
                        aria-pressed={defaultPickupLocation === location.id}
                        onClick={() => selectPickup(location)}
                      >
                        <Building2 size={17} /><span>{location.name}{location.isPopular && <small>จุดนัดรับยอดนิยม</small>}</span>{defaultPickupLocation === location.id && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            {pickupPageCount > 1 && <div className="stitch-pickup-index" aria-label={`Index ${pickupIndex} จาก ${pickupPageCount - 1}`}>
              <span>Index {pickupIndex}</span>
              <div>{Array.from({ length: pickupPageCount }, (_, index) => <button key={index} type="button" aria-label={`ไปชุดจุดนัดรับ ${index + 1}`} className={pickupIndex === index ? 'active' : ''} onClick={() => { setPickupIndex(index); scrollPickupTo(index); }} />)}</div>
              <span>{pickupPageCount - 1}</span>
            </div>}
          </> : <p className="stitch-location-empty">{isLoading ? 'กำลังโหลดจุดนัดรับ...' : 'ไม่พบจุดนัดรับในฐานข้อมูล'}</p>}
        </section>

        <p className="stitch-security-note"><BadgeCheck size={14} /> ข้อมูลร้านค้าเชื่อมกับบัญชีนักศึกษา SPU ของคุณ</p>
      </main>
    </div>
  );
}
