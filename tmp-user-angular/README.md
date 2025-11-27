# tmp-user (Angular 20) — Hidden Admin + Offline Images
- **Admin URL แยก**: กำหนด path ใน `src/app/config.ts` เช่น `manage-987xyz` → เข้าได้ที่ `/manage-987xyz`
- ไม่โชว์ลิงก์ Admin ในเมนู
- **รูปออฟไลน์**: seed ใช้ **SVG Data URL**; ในหน้า Admin อัปโหลดรูปแล้วเก็บเป็น **Data URL** (ไม่พึ่งลิงก์)
- **ตั้งค่า API base**: ถ้า backend อยู่คนละโดเมนให้ตั้ง `apiBaseUrl` ใน `src/app/config.ts` (ปล่อยค่าว่างเพื่อใช้ relative path)

## Run
npm install
npm start  # dev server proxies /api → http://localhost:3000 by default

### Sync status
- โค้ดใน branch `work` อัปเดตกับฐานล่าสุดแล้ว (ไม่มี remote ให้ pull เพิ่ม)
- `git status` สะอาด ไม่มีไฟล์ conflict หรือ marker เหลืออยู่

Shop: http://localhost:4200/
Admin: http://localhost:4200/manage-987xyz  (เปลี่ยน path ใน config.ts ได้)

### Dev proxy (แก้ CORS)
- `ng serve` ใช้ `proxy.conf.json` ให้เรียบร้อยแล้ว: request ที่ขึ้นต้นด้วย `/api` จะถูก proxy ไปที่ `http://localhost:3000` เพื่อเลี่ยง CORS เวลามี backend แยกพอร์ต
- ถ้าต้องการยิง backend โดเมนอื่น ให้แก้ target ใน `proxy.conf.json` หรือปิด proxy แล้วตั้ง `apiBaseUrl` ใน `src/app/config.ts`

## Build / Deploy (Vercel/Netlify/Cloudflare)
npm run build → dist/tmp-user/browser

## Vercel KV / Edge Config data flow
- API routes in `/api/kv-products.ts` และ `/api/kv-test.ts` รองรับ 3 โหมด:
  1) **Edge Config** – ตั้ง `EDGE_CONFIG_ID` และ `EDGE_CONFIG_TOKEN` → จะอ่าน/เขียน `products`, `categories`, `products_version` ผ่าน REST (`https://edge-config.vercel.com/<id>/items`). ไม่ต้องใช้ connection string; เอาแค่ ID และ token จากลิงก์ Edge Config (เช่น `https://edge-config.vercel.com/<EDGE_CONFIG_ID>/items?token=<EDGE_CONFIG_TOKEN>`).
  2) **Vercel KV** – ถ้าไม่ได้ตั้ง Edge Config จะเรียก REST API (`KV_REST_API_URL` + `KV_REST_API_TOKEN`) ตรง ๆ ไม่พึ่งแพ็กเกจ `@vercel/kv` (ไม่ใช้ connection string ของ KV UI; ใช้ REST URL/Token ที่ Vercel ให้มาพร้อมกัน).
  3) **ไฟล์โลคัล** – ถ้าไม่ตั้งค่าอะไรเลยจะ fallback ไปที่ `api/local-kv.json`.
- ฝั่งแอดมินเรียก `KvStoreService` (`src/app/kv-store.service.ts`) เพื่อดึง/บันทึกสินค้าและหมวดหมู่ไปยัง API: `loadState` = GET, `saveState` = POST, `applyChanges` = POST `{ action: 'apply' }`, และ `loadVersion` = GET `?versionOnly=true` สำหรับเช็กเวอร์ชัน.
- ปุ่มหน้า Admin (`src/app/admin/products-list/products-list.component.html`) ที่มีผลกับฐานข้อมูล (Edge Config / KV / local ตามโหมด):
  - "บันทึก", "เพิ่มสินค้า", "ลบ", "เพิ่ม/แก้ไข/ลบหมวดหมู่", "Reset ข้อมูลเริ่มต้น", "นำเข้า CSV", "ลบสินค้าทั้งหมด" เรียก `ProductService` ให้ส่ง `saveState` → อัปเดตข้อมูลพร้อมเพิ่มเลขเวอร์ชัน.
  - "Apply" ส่ง snapshot ปัจจุบันไปอัปเดต Edge Config/KV พร้อมเพิ่ม version → หน้าร้านที่ polling อยู่จะดึงข้อมูลล่าสุดเสมอ.
- "Apply" เรียก `applyChanges` → เพิ่ม version เพื่อบังคับให้หน้าร้านโหลดข้อมูลใหม่ (polling ทุก 10 วินาที).
- "ยกเลิก" ใช้ `restoreLastSnapshot` → ดึงข้อมูลจาก backend/snapshot ล่าสุดโดยไม่เขียนฐาน.

### ยิงทดสอบว่า backend ตอบกลับได้ไหม
- ใช้ `curl http://localhost:3000/api/kv-test` เพื่อดู backend ที่กำลังใช้งาน (`edge-config`, `vercel-kv` หรือ `local-fallback`) พร้อมค่า counter ที่อ่านได้
  - ถ้าไม่ได้ตั้ง env ของ Edge Config / KV จะยังตอบ 200 พร้อม message ว่าใช้ local-fallback เพื่อให้รู้ว่ายังไม่ได้ผูก backend จริง
- ยิง POST เพื่อเช็กเขียน/อ่านเชื่อมต่อได้ เช่น `curl -X POST http://localhost:3000/api/kv-test -H 'content-type: application/json' -d '{"value":1}'`
  - ถ้าเชื่อมต่อได้จะได้ `{ ok: true, backend: 'edge-config|vercel-kv', counter: <ค่าที่เพิ่งตั้ง> }`
