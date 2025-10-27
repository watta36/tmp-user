# tmp-user (Angular 20) — Hidden Admin + Offline Images
- **Admin URL แยก**: กำหนด path ใน `src/app/config.ts` เช่น `manage-987xyz` → เข้าได้ที่ `/manage-987xyz`
- ไม่โชว์ลิงก์ Admin ในเมนู
- **รูปออฟไลน์**: seed ใช้ **SVG Data URL**; ในหน้า Admin อัปโหลดรูปแล้วเก็บเป็น **Data URL** (ไม่พึ่งลิงก์)

## Run
npm install
npm start

Shop: http://localhost:4200/
Admin: http://localhost:4200/manage-987xyz  (เปลี่ยน path ใน config.ts ได้)

## Build / Deploy (Vercel/Netlify/Cloudflare)
npm run build → dist/tmp-user/browser
