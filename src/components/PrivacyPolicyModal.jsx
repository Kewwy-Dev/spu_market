import React from 'react';
import { X, ShieldCheck } from 'lucide-react';

export default function PrivacyPolicyModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/56 p-[18px] backdrop-blur-[3px]"
      onClick={onClose}
    >
      <section
        className="flex max-h-[min(84vh,760px)] w-full max-w-[440px] sm:max-w-[480px] flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.28)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-policy-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center gap-[11px] border-b border-slate-100 px-[18px] pt-[18px] pb-3.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-spu-pink-light text-spu-pink">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 id="privacy-policy-title" className="text-[0.96rem] font-extrabold text-slate-900">
              นโยบายความเป็นส่วนตัว
            </h2>
            <p className="mt-0.5 text-[0.68rem] text-slate-500">แนวทางการใช้ข้อมูลของ SPU Market</p>
          </div>
          <button
            type="button"
            className="ml-auto grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
            aria-label="ปิด"
          >
            <X size={20} />
          </button>
        </header>

        <div className="overflow-y-auto px-[18px] py-4 text-[0.76rem] sm:text-xs leading-[1.65] text-slate-600">
          <p className="rounded-xl bg-slate-50 px-3 py-[11px] text-slate-700">
            เราใช้ข้อมูลเท่าที่จำเป็นเพื่อแสดงโปรไฟล์และประกาศสินค้าในแอป โปรดตรวจสอบข้อมูลก่อนเผยแพร่
          </p>

          <section className="mt-[15px]">
            <h3 className="mb-1 text-[0.8rem] font-extrabold text-[#172033]">ข้อมูลที่คุณให้ไว้</h3>
            <p>อาจรวมถึงชื่อ อีเมล ข้อมูลโปรไฟล์ รูปสินค้า ราคา รายละเอียดสินค้า และจุดนัดรับที่คุณกรอกหรืออัปโหลด</p>
          </section>

          <section className="mt-[15px]">
            <h3 className="mb-1 text-[0.8rem] font-extrabold text-[#172033]">การใช้และการแสดงข้อมูล</h3>
            <p>ข้อมูลใช้เพื่อแสดงโปรไฟล์และประกาศสินค้า รวมถึงช่วยให้ผู้ซื้อกับผู้ขายดูรายละเอียดและติดต่อกันได้ ข้อมูลที่แสดงในประกาศหรือโปรไฟล์อาจมองเห็นได้โดยผู้ใช้แอปรายอื่น</p>
          </section>

          <section className="mt-[15px]">
            <h3 className="mb-1 text-[0.8rem] font-extrabold text-[#172033]">การจัดเก็บและความปลอดภัย</h3>
            <p>ข้อมูลบัญชี ประกาศสินค้า การนัดรับ และข้อความซื้อขายถูกจัดเก็บในระบบฐานข้อมูลของ SPU Market เพื่อให้บริการซื้อขายและติดตามการนัดหมายได้อย่างต่อเนื่อง ข้อมูลการเข้าสู่ระบบอาจถูกเก็บไว้ในเบราว์เซอร์ของคุณตามการตั้งค่าของอุปกรณ์เพื่อรักษาสถานะการใช้งาน</p>
          </section>

          <section className="mt-[15px]">
            <h3 className="mb-1 text-[0.8rem] font-extrabold text-[#172033]">การดูแลข้อมูล</h3>
            <p>หลีกเลี่ยงการใส่ข้อมูลอ่อนไหวในรายละเอียดสินค้า และนัดรับในจุดสาธารณะ หากต้องการสอบถามเกี่ยวกับข้อมูลส่วนบุคคล ติดต่อผู้ดูแล SPU Market ผ่าน LINE Official: @spumarket</p>
          </section>
        </div>

        <button
          type="button"
          className="mx-[18px] mb-[18px] min-h-11 rounded-xl bg-gradient-to-br from-[#a20857] to-[#ec008c] text-[0.82rem] font-extrabold text-white transition-opacity hover:opacity-95"
          onClick={onClose}
        >
          รับทราบ
        </button>
      </section>
    </div>
  );
}
