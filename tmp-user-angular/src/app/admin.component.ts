import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Product } from './product.service';
import { AuthService } from './auth.service';

type Draft = Omit<Product, 'id'>;

@Component({
  standalone: true,
  selector: 'app-admin',
  imports: [CommonModule, FormsModule],
  template: `
  <section class="container">
    <h2>Admin</h2>

    <!-- Login section -->
    <div *ngIf="!auth.authed()">
      <div class="form-grid">
        <div>
          <label class="small">Username</label>
          <input class="input" [(ngModel)]="username" placeholder="admin">
        </div>
        <div>
          <label class="small">Password</label>
          <input class="input" [(ngModel)]="password" placeholder="1234" type="password">
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn primary" (click)="doLogin()">Login</button>
        <span class="small">* ค่า default ดูใน <code>src/app/config.ts</code></span>
      </div>
      <hr>
      <p class="small">ผู้ใช้ทั่วไปยังเข้าหน้าร้านได้ตามปกติที่ <a class="btn" href="/">กลับหน้าร้าน</a></p>
    </div>

    <!-- CRUD section -->
    <div *ngIf="auth.authed()">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <button class="btn" (click)="logout()">Logout</button>
        <button class="btn danger" (click)="reset()">Reset เป็นข้อมูลเริ่มต้น</button>
      </div>

      <h3 style="margin-top:16px">เพิ่มสินค้าใหม่</h3>
      <div class="form-grid">
        <div><label class="small">ชื่อสินค้า</label><input class="input" [(ngModel)]="draft.name"></div>
        <div><label class="small">ราคา (บาท)</label><input class="input" type="number" [(ngModel)]="draft.price"></div>
        <div><label class="small">หน่วย</label><input class="input" [(ngModel)]="draft.unit" placeholder="แพ็ค 1 กก."></div>
        <div><label class="small">หมวดหมู่</label><input class="input" [(ngModel)]="draft.category" placeholder="กุ้ง/ปลา/ซอส/พริกแกง..."></div>
        <div><label class="small">SKU</label><input class="input" [(ngModel)]="draft.sku"></div>
        <div><label class="small">รูปภาพ (URL)</label><input class="input" [(ngModel)]="draft.image"></div>
        <div style="grid-column:1/-1"><label class="small">รายละเอียด</label><textarea class="input" rows="3" [(ngModel)]="draft.description"></textarea></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn primary" (click)="add()">เพิ่มสินค้า</button>
        <button class="btn" (click)="clearDraft()">ล้างฟอร์ม</button>
      </div>
      <div *ngIf="draft.image" style="margin-top:10px"><img class="preview" [src]="draft.image" alt=""></div>

      <h3 style="margin-top:24px">รายการสินค้า (แก้ไขได้)</h3>
      <table class="table">
        <thead>
          <tr><th style="width:110px">รูป</th><th>ชื่อ</th><th style="width:110px">ราคา</th><th style="width:160px">หน่วย/หมวด</th><th>SKU</th><th>รายละเอียด</th><th style="width:180px">จัดการ</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let p of ps.products(); trackBy: track">
            <td><img class="preview" [src]="p.image" alt=""></td>
            <td><input class="input" [(ngModel)]="p.name"></td>
            <td><input class="input" type="number" [(ngModel)]="p.price"></td>
            <td>
              <input class="input" [(ngModel)]="p.unit" placeholder="หน่วย"><br/>
              <input class="input" [(ngModel)]="p.category" placeholder="หมวดหมู่">
            </td>
            <td><input class="input" [(ngModel)]="p.sku"></td>
            <td><textarea class="input" rows="3" [(ngModel)]="p.description"></textarea></td>
            <td class="tr-actions">
              <button class="btn" (click)="save(p)">บันทึก</button>
              <button class="btn danger" (click)="remove(p.id)">ลบ</button>
              <button class="btn" (click)="editImage(p)">แก้รูป</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
  `
})
export class AdminComponent {
  username = '';
  password = '';

  draft: Draft = { name:'', price:0, unit:'', category:'', sku:'', description:'', slug:'', image:'' };

  constructor(public ps: ProductService, public auth: AuthService){}

  doLogin(){
    if(!this.auth.login(this.username.trim(), this.password)){
      alert('เข้าสู่ระบบไม่สำเร็จ');
    }
  }
  logout(){ this.auth.logout(); }
  reset(){ if(confirm('ยืนยันรีเซ็ตข้อมูลเป็นค่าเริ่มต้น?')) this.ps.resetToSeed(); }

  clearDraft(){ this.draft = { name:'', price:0, unit:'', category:'', sku:'', description:'', slug:'', image:'' }; }

  add(){
    const d = this.draft;
    if(!d.name || !d.image || !d.unit || !d.category){ alert('กรอก ชื่อ/รูป/หน่วย/หมวด ให้ครบ'); return; }
    const slug = this.slugify(d.name);
    this.ps.add({ ...d, slug });
    this.clearDraft();
  }

  save(p: Product){
    if(!p.name){ alert('ชื่อสินค้าห้ามว่าง'); return; }
    const patch: Partial<Product> = { ...p, slug: this.slugify(p.name) };
    this.ps.update(p.id, patch);
  }
  editImage(p: Product){
    const url = prompt('ใส่ URL รูปใหม่', p.image || '');
    if(url!=null){ this.ps.update(p.id, { image: url }); }
  }
  remove(id: number){
    if(confirm('ลบสินค้านี้?')) this.ps.remove(id);
  }

  track = (_: number, p: Product) => p.id;

  slugify(s: string){
    return s.toLowerCase().replace(/[^a-z0-9ก-๙\s-]/g,'').trim().replace(/\s+/g,'-').slice(0,60);
  }
}
