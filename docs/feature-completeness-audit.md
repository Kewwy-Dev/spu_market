# SPU Market — Feature Completeness Audit

วันที่ตรวจ: 18 พฤศจิกายน 2026  
ขอบเขต: ตรวจจาก source code, migrations และ production build ของ React/Vite ณ เวลาที่จัดทำเอกสารนี้

## สถานะโดยรวม

`npm.cmd run build` ผ่านเรียบร้อย (Vite build สำเร็จ) แต่มีคำเตือนว่า JavaScript bundle หลักมีขนาดประมาณ 800 KB หลัง minify

ระบบหลักเชื่อม Supabase แล้วสำหรับ authentication, สินค้า, รูปสินค้า, ตะกร้า, การนัดรับ และแชทแบบ realtime อย่างไรก็ตามยังมี UI/flow ที่เป็นข้อมูลตัวอย่าง, `alert`, state เฉพาะหน้า หรือมีเส้นทางที่ไม่สมบูรณ์

## สถาปัตยกรรมที่ AI ผู้แก้ไขควรรู้

- App เป็น React + Vite และ route ถูกจัดการเองใน `src/App.jsx` ผ่าน History API; ไม่มี React Router
- Supabase client อยู่ที่ `src/lib/supabase.js`
- data-access สำหรับสินค้า/ผู้ขายอยู่ที่ `src/lib/marketplace.js`
- migrations อยู่ใน `supabase/migrations/`
- ตารางสำคัญที่โค้ดเรียกใช้: `profiles`, `products`, `product_images`, `cart_items`, `conversations`, `messages`, `pickup_appointments`, `pickup_locations`, `categories`, `seller_reviews`
- RPC สำคัญที่มีการเรียกใช้: `open_marketplace_conversation`, `request_marketplace_pickup`, `create_marketplace_product_with_images`, `update_marketplace_product`, `trash_marketplace_product`, `restore_marketplace_product`, `complete_seller_registration`, `conversation_participant_display_names`, `edit_marketplace_message`

ก่อนแก้ schema หรือ RLS ให้ตรวจ migration ที่เกี่ยวข้องก่อนเสมอ และรักษาการตรวจสิทธิ์ไว้ที่ฐานข้อมูล/RPC ไม่ย้ายความรับผิดชอบไปพึ่ง client เพียงอย่างเดียว

## สิ่งที่ทำงานแล้วตามโค้ด

- Login ผ่าน magic link และ Google OAuth: `src/pages/LoginPage.jsx`
- สมัครผู้ขาย/ยืนยันผ่าน magic link: `src/pages/RegisterPage.jsx` และ `complete_seller_registration`
- สร้าง แก้ไข บันทึกร่าง ย้ายลงถังขยะ และกู้คืนสินค้า: `src/pages/AddProductPage.jsx`, `src/pages/SellerDashboardPage.jsx`, `src/lib/marketplace.js`
- อัปโหลดรูปสินค้าสูงสุด 5 รูปไปยัง Storage
- เปิด conversation จากหน้ารายละเอียดสินค้า: `src/App.jsx`
- รายการแชท, realtime messages, แนบรูป, reply และแก้ไขข้อความ: `src/pages/ChatListPage.jsx`, `src/pages/ChatRoomPage.jsx`
- เพิ่มสินค้าเข้าตะกร้าและสร้างนัดรับ: `src/pages/CartPage.jsx`
- แสดงกิจกรรมการนัดรับของผู้ซื้อจาก `pickup_appointments`: `src/pages/ProfilePage.jsx`
- เปิดแชทจากตะกร้าด้วย `conversationId` ที่ได้จาก `open_marketplace_conversation` แล้ว
- รองรับการรับสินค้าแบบนัดรับในมหาวิทยาลัยเท่านั้นทั้ง UI และ migration ของฐานข้อมูล

## งานที่ยังไม่สมบูรณ์และลำดับความสำคัญ

### P1 — ฟีเจอร์สำคัญที่ยังเป็น placeholder

#### หน้าแรก (`src/pages/HomePage.jsx`, `src/components/home/HeroBannerSlider.jsx`)

- ปุ่มแจ้งเตือนแสดง `alert` ว่าไม่มีแจ้งเตือน
- ศูนย์ช่วยเหลือแสดง `alert`
- CTA ของ Hero Slider ทำงานจริงเฉพาะสไลด์ยืนยันตัวตน (`slide.id === 3`); CTA อื่นไม่มี navigation
- `HomePage` มี `_handleContactSeller` ที่ไม่ได้ถูกใช้งาน

**เป้าหมาย:** สร้าง notification center จริงหรือซ่อนปุ่มจนกว่าจะพร้อม, เชื่อม help/report ไปยังช่องทางที่ใช้งานได้ และกำหนด navigation ของ CTA ทุกสไลด์

#### รายการสินค้า (`src/pages/ProductsPage.jsx`)

- filter category และ location ใช้ `CATEGORIES`, `LOCATIONS` จาก `src/data/products.js` ขณะที่หน้าลงขายอ่าน category จาก Supabase

**เป้าหมาย:** ใช้ master data ชุดเดียวจาก Supabase หรือมีชั้น cache/shared query เพื่อไม่ให้ filter กับข้อมูลจริงไม่ตรงกัน

#### รายละเอียดสินค้า (`src/pages/ProductDetailPage.jsx`)

- ปุ่มหัวใจ (`isSaved`) เป็น state ชั่วคราว ไม่มีตาราง/การบันทึกรายการโปรด
- ปุ่ม share คัดลอกลิงก์ แต่ไม่มี success/error feedback และไม่มี fallback เมื่อ clipboard ใช้ไม่ได้

**เป้าหมาย:** หากต้องการ Favorites ให้เพิ่ม schema/RLS/API และหน้ารายการโปรด; หากไม่ทำ ให้ซ่อนปุ่มเพื่อไม่ทำให้ผู้ใช้เข้าใจผิด

#### โปรไฟล์ (`src/pages/ProfilePage.jsx`)

- Settings และ Help/Report มี Modal รองรับแล้ว; Favorites ยังใช้ alert
- direct route `/profile/<id>` ไม่ได้ใช้ `selectedProfileId`; ไม่มีความหมายของการเปิด profile คนอื่น

**เป้าหมาย:** ทำหน้ารายการโปรด (Favorites) เชื่อมโยงกับฐานข้อมูลจริง และทำ route guard สำหรับ deep links

#### จัดการร้านและเพิ่มสินค้า

- ไม่มี UI ปิดการขายด้วยตนเองจาก `SellerDashboardPage`
- ยอดขายคือผลรวมราคาของสินค้าที่สถานะ `sold`; ไม่อ้างอิงธุรกรรม/appointment ที่เสร็จสิ้น
- ปุ่มคำแนะนำและลิงก์กฎของตลาดใน `AddProductPage` ยังไม่ทำงาน

**เป้าหมาย:** ตกลง business rule ก่อนว่าใครเปลี่ยนสินค้าเป็น `sold`, เมื่อไร และสัมพันธ์กับ appointment อย่างไร จากนั้นสร้าง action/RPC ที่ตรวจสิทธิ์และ audit ได้

### P2 — พฤติกรรมและคุณภาพที่ควรปรับ

- ปรับจำนวนสินค้าในตะกร้าเก็บแค่ React state/cache; refresh แล้วหาย และไม่มี stock validation
- `ChatRoomPage` ซ่อนข้อความด้วย `localStorage` เท่านั้น ไม่ได้ delete หรือ hide แบบ server-side — ต้องระบุใน UX ให้ชัด หรือทำ feature ซ่อนเฉพาะผู้ใช้ใน DB
- route `/chat`, `/cart`, `/profile/:id` ที่เปิดโดยตรงยังไม่มี centralized auth guard; navigation ปกติ guard แล้วแต่ deep link ยังไม่สอดคล้อง
- Home header ไม่ได้รับ notification count จาก App และระบบแจ้งเตือนยังไม่มี data model
- README ยังเป็นค่าเริ่มต้นของ Vite; ควรเพิ่มวิธีตั้งค่า `.env.local`, รัน migrations/seed, run/test/build และ deployment rewrites สำหรับ History API
- bundle หลักหลัง build มีขนาด ~800 KB; พิจารณา `React.lazy`/dynamic import สำหรับแต่ละหน้าเมื่อใกล้ deploy

## ลำดับแนะนำสำหรับการลงมือแก้

1. [x] ทำ appointment lifecycle: ดูรายละเอียด, chat, cancel, complete และบทบาทของ buyer/seller (เสร็จสมบูรณ์ - คอนเฟิร์มแล้ว)
2. [x] ทำหน้าแรก & Quick Actions: แจ้งเตือน, Help, ลิงก์ CTA ของ Hero Slider ทุกสไลด์ (เสร็จสมบูรณ์ - คอนเฟิร์มแล้ว)
3. [x] รวม master data ของ category/location ในหน้า ProductsPage (เสร็จสมบูรณ์ - คอนเฟิร์มแล้ว)
4. [x] ทำ Favorites (รายการโปรด) และการแชร์สินค้า (เสร็จสมบูรณ์ - คอนเฟิร์มแล้ว)
5. ทำ Route guard และจัดการ deep links ของโปรไฟล์/ตะกร้า
6. [x] เพิ่มปุ่มปิดการขายด้วยตนเองใน Seller Dashboard และสรุปยอดขายสัมพันธ์กับธุรกรรม (เสร็จสมบูรณ์ - คอนเฟิร์มแล้ว)
7. ปรับ Performance และ Code Splitting ลดขนาด Bundle

## ข้อควรระวังขณะแก้

- ห้ามใช้ `productId` แทน `conversationId`; UUID สองชนิดนี้คนละ resource
- อย่าทำ client-side role checks เป็นการป้องกันเพียงชั้นเดียว; รักษา RLS/RPC authorization ใน Supabase
- อย่าเปลี่ยนข้อความ PDPA แบบคาดเดาเอง ต้องได้รับเนื้อหาที่อนุมัติแล้ว
- หากจะเพิ่ม delivery รูปแบบอื่นในอนาคต ให้ทำ fulfillment flow, migration, policy และ migration test ควบคู่กัน
- ข้อมูล mock/placeholder ควรถูกซ่อนใน production จนกว่าจะเชื่อมข้อมูลจริง

## การตรวจสอบหลังแก้ไข

1. รัน `npm.cmd run build`
2. ทดสอบด้วยผู้ใช้สองบัญชี: ผู้ซื้อและผู้ขาย
3. ทดสอบ RLS โดยลองเข้าถึงสินค้า/แชท/appointment ของบัญชีอื่น
4. ทดสอบ deep links: `/products/:id`, `/chat/:conversationId`, `/cart`, `/profile/:id`
5. ทดสอบ mobile viewport และ refresh ระหว่าง flow สำคัญ

