# tmp-user (Angular 20) — Hidden Admin + Offline Images
- **Admin URL แยก**: กำหนด path ใน `src/app/config.ts` เช่น `manage-987xyz` → เข้าได้ที่ `/manage-987xyz`
- ไม่โชว์ลิงก์ Admin ในเมนู
- **รูปออฟไลน์**: seed ใช้ **SVG Data URL**; ในหน้า Admin อัปโหลดรูปแล้วเก็บเป็น **Data URL** (ไม่พึ่งลิงก์)

## Run
npm install
npm start

### Sync status
- โค้ดใน branch `work` อัปเดตกับฐานล่าสุดแล้ว (ไม่มี remote ให้ pull เพิ่ม)
- `git status` สะอาด ไม่มีไฟล์ conflict หรือ marker เหลืออยู่

Shop: http://localhost:4200/
Admin: http://localhost:4200/manage-987xyz  (เปลี่ยน path ใน config.ts ได้)

## Build / Deploy (Vercel/Netlify/Cloudflare)
npm run build → dist/tmp-user/browser

## Vercel KV / Edge Config data flow
- API routes in `/api/kv-products.ts` และ `/api/kv-test.ts` รองรับ 3 โหมด: 
  1) **Edge Config** – ตั้ง `EDGE_CONFIG_ID` และ `EDGE_CONFIG_TOKEN` → จะอ่าน/เขียน `products`, `categories`, `products_version` ผ่าน REST (`https://edge-config.vercel.com/<id>/items`).
  2) **Vercel KV** – ถ้าไม่ได้ตั้ง Edge Config จะใช้ `@vercel/kv` ผ่าน env `KV_REST_API_URL` + `KV_REST_API_TOKEN`.
  3) **ไฟล์โลคัล** – ถ้าไม่ตั้งค่าอะไรเลยจะ fallback ไปที่ `api/local-kv.json`.
- ฝั่งแอดมินเรียก `KvStoreService` (`src/app/kv-store.service.ts`) เพื่อดึง/บันทึกสินค้าและหมวดหมู่ไปยัง API: `loadState` = GET, `saveState` = POST, `applyChanges` = POST `{ action: 'apply' }`, และ `loadVersion` = GET `?versionOnly=true` สำหรับเช็กเวอร์ชัน.
- ปุ่มหน้า Admin (`src/app/admin/products-list/products-list.component.html`) ที่มีผลกับฐานข้อมูล (Edge Config / KV / local ตามโหมด):
  - "บันทึก", "เพิ่มสินค้า", "ลบ", "เพิ่ม/แก้ไข/ลบหมวดหมู่", "Reset ข้อมูลเริ่มต้น", "นำเข้า CSV", "ลบสินค้าทั้งหมด" เรียก `ProductService` ให้ส่ง `saveState` → อัปเดตข้อมูลพร้อมเพิ่มเลขเวอร์ชัน.
  - "Apply" ส่ง snapshot ปัจจุบันไปอัปเดต Edge Config/KV พร้อมเพิ่ม version → หน้าร้านที่ polling อยู่จะดึงข้อมูลล่าสุดเสมอ.
  - "Apply" เรียก `applyChanges` → เพิ่ม version เพื่อบังคับให้หน้าร้านโหลดข้อมูลใหม่ (polling ทุก 10 วินาที).
  - "ยกเลิก" ใช้ `restoreLastSnapshot` → ดึงข้อมูลจาก backend/snapshot ล่าสุดโดยไม่เขียนฐาน.
