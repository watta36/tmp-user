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

## MongoDB data flow
- API route `/api/kv-products.ts` เชื่อม MongoDB โดยตรง (ไม่มี local fallback) ใช้ env:
  - `MONGODB_URI` → connection string
  - `MONGODB_DB` → `ecommerce`
  - `MONGODB_COLLECTION` → `products`
- ฝั่งแอดมิน (`KvStoreService` / `ProductService`):
  - โหลดสินค้า/หมวดหมู่จากฐานด้วย `loadState` (GET `/api/kv-products`).
  - บันทึก snapshot (เพิ่ม ลบ แก้ไข) ผ่าน `saveState` หรือ `applyChanges` ซึ่งจะเขียนลง collection และเพิ่มเลข version.
  - การนำเข้าไฟล์ CSV ส่งไฟล์ขึ้น backend → backend เป็นคน parse และ `insertMany` ลง Mongo ก่อนตอบยอดที่นำเข้า จากนั้นแอปจะ refresh state จากฐานจริง.
- Endpoint รองรับ `GET ?versionOnly=true` สำหรับตรวจสอบเลขเวอร์ชัน ใช้กับการ polling ของฝั่ง storefront.
