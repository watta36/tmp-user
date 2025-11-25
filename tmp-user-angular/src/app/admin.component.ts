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
  <section class="container admin-shell">
    <header class="admin-hero">
      <div>
        <p class="eyebrow">Store Console</p>
        <h2 style="margin:6px 0 4px">Admin</h2>
        <p class="muted">จัดการสินค้าให้น่าใช้ ปรับราคา เปลี่ยนรูป และควบคุมสต็อกได้จากจุดเดียว</p>
      </div>
      <div class="admin-badge">พร้อมใช้งาน ✅</div>
    </header>

    <div *ngIf="!auth.authed()" class="panel admin-card">
      <div class="panel-header">
        <div>
          <p class="eyebrow">เข้าสู่ระบบ</p>
          <h3 style="margin:4px 0 6px">ล็อกอินผู้ดูแล</h3>
          <p class="muted">ใช้บัญชีที่กำหนดไว้ใน <code>src/app/config.ts</code> เพื่อเข้าจัดการสินค้า</p>
        </div>
        <div class="pill pill-ghost">จำกัดเฉพาะผู้ดูแล</div>
      </div>
      <div class="form-grid two-col">
        <div><label class="small">Username</label><input class="input" [(ngModel)]="username" placeholder="admin"></div>
        <div><label class="small">Password</label><input class="input" [(ngModel)]="password" type="password" placeholder="1234"></div>
      </div>
      <div class="admin-login-actions">
        <button class="btn primary wide" (click)="doLogin()">Login</button>
        <span class="small">* รองรับการใช้งานบนมือถือและเดสก์ท็อป</span>
      </div>
    </div>

    <div *ngIf="auth.authed()" class="admin-grid">
      <div class="panel admin-card">
        <div class="panel-header">
          <div>
            <p class="eyebrow">การจัดการร้าน</p>
            <h3 style="margin:4px 0">เพิ่ม / อัปเดตสินค้า</h3>
            <p class="muted">ออกแบบใหม่ให้ดูสะอาด ใช้ง่าย ทั้งบนมือถือและเดสก์ท็อป</p>
          </div>
          <div class="pill-row">
            <span class="pill">สินค้า {{ ps.products().length }} รายการ</span>
            <span class="pill pill-ghost">เข้าสู่ระบบแล้ว</span>
          </div>
        </div>
        <div class="admin-toolbar">
          <button class="btn" (click)="logout()">Logout</button>
          <button class="btn danger" (click)="reset()">Reset ข้อมูลเริ่มต้น</button>
        </div>

        <div class="form-grid two-col">
          <div><label class="small">ชื่อสินค้า</label><input class="input" [(ngModel)]="draft.name" placeholder="เช่น กุ้งสด 1 กก."></div>
          <div><label class="small">ราคา (บาท)</label><input class="input" type="number" [(ngModel)]="draft.price" placeholder="0"></div>
          <div><label class="small">หน่วย</label><input class="input" [(ngModel)]="draft.unit" placeholder="แพ็ค / กก. / ชิ้น"></div>
          <div><label class="small">หมวดหมู่</label><input class="input" [(ngModel)]="draft.category" placeholder="กุ้ง / ปลา / ซอส"></div>
          <div><label class="small">SKU</label><input class="input" [(ngModel)]="draft.sku" placeholder="ใส่หรือเว้นว่าง"></div>
          <div class="full-row"><label class="small">รายละเอียด</label><textarea class="input" rows="3" [(ngModel)]="draft.description" placeholder="จุดเด่น หรือวิธีใช้คร่าวๆ"></textarea></div>
          <div class="full-row upload-row">
            <div>
              <label class="small">รูปสินค้า (อัปโหลดไฟล์)</label>
              <input type="file" accept="image/*" (change)="onUploadNew($event)">
              <p class="small muted" style="margin-top:4px">บันทึกเป็น Data URL ในเครื่อง ไม่พึ่งลิงก์ภายนอก</p>
            </div>
            <div class="image-chip" *ngIf="draft.image">พร้อมใช้งาน</div>
          </div>
        </div>
        <div *ngIf="draft.image" class="preview-frame"><img class="preview" [src]="draft.image" alt=""></div>
        <div class="action-row">
          <button class="btn primary" (click)="add()">เพิ่มสินค้า</button>
          <button class="btn" (click)="clearDraft()">ล้างฟอร์ม</button>
        </div>
      </div>

      <div class="panel admin-card">
        <div class="panel-header">
          <div>
            <p class="eyebrow">รายการสินค้า</p>
            <h3 style="margin:4px 0">แก้ไขได้ทันที</h3>
            <p class="muted">รองรับการสกรอลล์ในมือถือ เซลล์พับบรรทัดยาวให้อ่านง่าย</p>
          </div>
          <div class="pill pill-ghost">แก้ไขแล้วจะเซฟทันที</div>
        </div>
        <div class="table-wrap admin-table-wrap">
          <table class="table admin-table">
            <thead><tr><th style="width:120px">รูป</th><th>ชื่อ</th><th style="width:110px">ราคา</th><th style="width:180px">หน่วย/หมวด</th><th>SKU</th><th>รายละเอียด</th><th style="width:220px">จัดการ</th></tr></thead>
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
