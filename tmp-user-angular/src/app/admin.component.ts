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

    <div *ngIf="!auth.authed()">
      <div class="form-grid">
        <div><label class="small">Username</label><input class="input" [(ngModel)]="username" placeholder="admin"></div>
        <div><label class="small">Password</label><input class="input" [(ngModel)]="password" type="password" placeholder="1234"></div>
      </div>
      <div class="admin-login-actions">
        <button class="btn primary" (click)="doLogin()">Login</button>
        <span class="small">* ตั้งค่าใน <code>src/app/config.ts</code></span>
      </div>
      <hr>
    </div>

    <div *ngIf="auth.authed()">
      <div class="admin-toolbar">
        <button class="btn" (click)="logout()">Logout</button>
        <button class="btn danger" (click)="reset()">Reset ข้อมูลเริ่มต้น</button>
      </div>

      <h3 style="margin-top:16px">เพิ่มสินค้าใหม่</h3>
      <div class="form-grid">
        <div><label class="small">ชื่อสินค้า</label><input class="input" [(ngModel)]="draft.name"></div>
        <div><label class="small">ราคา (บาท)</label><input class="input" type="number" [(ngModel)]="draft.price"></div>
        <div><label class="small">หน่วย</label><input class="input" [(ngModel)]="draft.unit"></div>
        <div><label class="small">หมวดหมู่</label><input class="input" [(ngModel)]="draft.category"></div>
        <div><label class="small">SKU</label><input class="input" [(ngModel)]="draft.sku"></div>
        <div style="grid-column:1/-1"><label class="small">รายละเอียด</label><textarea class="input" rows="3" [(ngModel)]="draft.description"></textarea></div>
        <div style="grid-column:1/-1">
          <label class="small">รูปสินค้า (อัปโหลดไฟล์)</label><br>
          <input type="file" accept="image/*" (change)="onUploadNew($event)">
          <span class="small">* เก็บเป็น Data URL ในเครื่อง (ไม่ใช้ลิงก์)</span>
        </div>
      </div>
      <div *ngIf="draft.image" style="margin-top:10px"><img class="preview" [src]="draft.image" alt=""></div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn primary" (click)="add()">เพิ่มสินค้า</button>
        <button class="btn" (click)="clearDraft()">ล้างฟอร์ม</button>
      </div>

      <h3 style="margin-top:24px">รายการสินค้า</h3>
      <div class="table-wrap admin-table-wrap">
        <table class="table admin-table">
          <thead><tr><th style="width:110px">รูป</th><th>ชื่อ</th><th style="width:110px">ราคา</th><th style="width:160px">หน่วย/หมวด</th><th>SKU</th><th>รายละเอียด</th><th style="width:220px">จัดการ</th></tr></thead>
          <tbody>
            <tr *ngFor="let p of ps.products(); trackBy: track">
              <td><img class="preview" [src]="p.image" alt=""></td>
              <td><input class="input" [(ngModel)]="p.name"></td>
              <td><input class="input" type="number" [(ngModel)]="p.price"></td>
              <td>
                <input class="input" [(ngModel)]="p.unit"><br/>
                <input class="input" [(ngModel)]="p.category">
              </td>
              <td><input class="input" [(ngModel)]="p.sku"></td>
              <td><textarea class="input" rows="3" [(ngModel)]="p.description"></textarea></td>
              <td class="tr-actions admin-row-actions">
                <input type="file" accept="image/*" (change)="onReplaceImage(p, $event)">
                <button class="btn" (click)="save(p)">บันทึก</button>
                <button class="btn danger" (click)="remove(p.id)">ลบ</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
  `
})
export class AdminComponent {
  username = '';
  password = '';
  draft: Draft = { name:'', price:0, unit:'', category:'', sku:'', description:'', slug:'', image:'' };

  constructor(public ps: ProductService, public auth: AuthService){}

  async onUploadNew(ev: Event){
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    if(!f) return;
    this.draft.image = await this.toDataUrl(f);
  }
  async onReplaceImage(p: Product, ev: Event){
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    if(!f) return;
    const data = await this.toDataUrl(f);
    this.ps.update(p.id, { image: data });
    input.value = '';
  }
  toDataUrl(file: File): Promise<string>{
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  doLogin(){ if(!this.auth.login(this.username.trim(), this.password)) alert('เข้าสู่ระบบไม่สำเร็จ'); }
  logout(){ this.auth.logout(); }
  reset(){ if(confirm('รีเซ็ตข้อมูลเป็นค่าเริ่มต้น?')) this.ps.resetToSeed(); }

  clearDraft(){ this.draft = { name:'', price:0, unit:'', category:'', sku:'', description:'', slug:'', image:'' }; }
  add(){
    const d = this.draft;
    if(!d.name || !d.unit || !d.category){ alert('กรอก ชื่อ/หน่วย/หมวด ให้ครบ'); return; }
    const slug = this.slugify(d.name);
    this.ps.add({ ...d, slug });
    this.clearDraft();
  }
  save(p: Product){
    if(!p.name){ alert('ชื่อสินค้าห้ามว่าง'); return; }
    const patch: Partial<Product> = { ...p, slug: this.slugify(p.name) };
    this.ps.update(p.id, patch);
  }
  remove(id: number){ if(confirm('ลบสินค้านี้?')) this.ps.remove(id); }
  track = (_: number, p: Product) => p.id;

  slugify(s: string){
    return s.toLowerCase().replace(/[^a-z0-9ก-๙\s-]/g,'').trim().replace(/\s+/g,'-').slice(0,60);
  }
}
