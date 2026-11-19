import React from 'react';
import { X, ShieldCheck } from 'lucide-react';

export default function PrivacyPolicyModal({ onClose }) {
  return (
    <div className="privacy-modal-backdrop" onClick={onClose}>
      <section
        className="privacy-policy-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-policy-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="privacy-policy-header">
          <div className="privacy-policy-heading-icon"><ShieldCheck size={20} /></div>
          <div>
            <h2 id="privacy-policy-title">นโยบายความเป็นส่วนตัว</h2>
            <p>แนวทางการใช้ข้อมูลของ SPU Market</p>
          </div>
          <button type="button" className="privacy-policy-close-icon" onClick={onClose} aria-label="ปิด">
            <X size={20} />
          </button>
        </header>

        <div className="privacy-policy-content">
          <p className="privacy-policy-intro">
            เราใช้ข้อมูลเท่าที่จำเป็นเพื่อแสดงโปรไฟล์และประกาศสินค้าในแอป โปรดตรวจสอบข้อมูลก่อนเผยแพร่
          </p>

          <section>
            <h3>ข้อมูลที่คุณให้ไว้</h3>
            <p>อาจรวมถึงชื่อ อีเมล ข้อมูลโปรไฟล์ รูปสินค้า ราคา รายละเอียดสินค้า และจุดนัดรับที่คุณกรอกหรืออัปโหลด</p>
          </section>

          <section>
            <h3>การใช้และการแสดงข้อมูล</h3>
            <p>ข้อมูลใช้เพื่อแสดงโปรไฟล์และประกาศสินค้า รวมถึงช่วยให้ผู้ซื้อกับผู้ขายดูรายละเอียดและติดต่อกันได้ ข้อมูลที่แสดงในประกาศหรือโปรไฟล์อาจมองเห็นได้โดยผู้ใช้แอปรายอื่น</p>
          </section>

          <section>
            <h3>การจัดเก็บและความปลอดภัย</h3>
            <p>ข้อมูลบัญชี ประกาศสินค้า การนัดรับ และข้อความซื้อขายถูกจัดเก็บในระบบฐานข้อมูลของ SPU Market เพื่อให้บริการซื้อขายและติดตามการนัดหมายได้อย่างต่อเนื่อง ข้อมูลการเข้าสู่ระบบอาจถูกเก็บไว้ในเบราว์เซอร์ของคุณตามการตั้งค่าของอุปกรณ์เพื่อรักษาสถานะการใช้งาน</p>
          </section>

          <section>
            <h3>การดูแลข้อมูล</h3>
            <p>หลีกเลี่ยงการใส่ข้อมูลอ่อนไหวในรายละเอียดสินค้า และนัดรับในจุดสาธารณะ หากต้องการสอบถามเกี่ยวกับข้อมูลส่วนบุคคล ติดต่อผู้ดูแล SPU Market ผ่าน LINE Official: @spumarket</p>
          </section>
        </div>

        <button type="button" className="privacy-policy-close-button" onClick={onClose}>รับทราบ</button>
      </section>
    </div>
  );
}
