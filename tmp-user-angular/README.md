# tmp-user (Angular 20) — Shop + Admin CRUD
- หน้า Shop สำหรับลูกค้า (ไม่มีล็อกอิน)
- หน้า Admin (`/admin`) เพิ่ม/แก้ไข/ลบสินค้าได้ทั้งหมด (ชื่อ/ราคา/หน่วย/หมวด/รูป/รายละเอียด/SKU)
- ล็อกอินแบบง่าย (config ใน `src/app/config.ts`)

## รัน
```bash
npm install
npm start
```
เปิด http://localhost:4200/ (Shop)
ไปหน้า Admin: http://localhost:4200/admin

## บัญชีแอดมิน (แก้ได้ใน config.ts)
```ts
export const APP_CONFIG = { adminUser: 'admin', adminPass: '1234' };
```

## บันทึกข้อมูล
- Product เก็บใน `localStorage` คีย์ `tmp_products_v1`
- ปุ่ม Reset ในหน้า Admin จะคืนค่าเป็น SEED 10 รายการ

## Build/Deploy
```bash
npm run build
```
ไฟล์ static: `dist/tmp-user/browser`
