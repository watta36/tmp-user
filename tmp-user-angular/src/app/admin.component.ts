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
  // เปลี่ยนจาก template: `...` มาเป็นไฟล์แทน
  templateUrl: './admin/products-list/products-list.component.html',
  styleUrls: ['./admin/products-list/products-list.component.scss']
})
export class AdminComponent {
  username = '';
  password = '';
  draft: Draft = {
    name: '',
    price: 0,
    unit: '',
    category: '',
    sku: '',
    description: '',
    slug: '',
    image: '',
  };
  importing = signal(false);

  constructor(public ps: ProductService, public auth: AuthService) {}

  async onUploadNew(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    this.draft.image = await this.toDataUrl(f);
  }

  async onReplaceImage(p: Product, ev: Event) {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    const data = await this.toDataUrl(f);
    this.ps.update(p.id, { image: data });
    input.value = '';
  }

  toDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  doLogin() {
    if (!this.auth.login(this.username.trim(), this.password)) {
      alert('เข้าสู่ระบบไม่สำเร็จ');
    }
  }

  logout() {
    this.auth.logout();
  }

  reset() {
    if (confirm('รีเซ็ตข้อมูลเป็นค่าเริ่มต้น?')) this.ps.resetToSeed();
  }

  exportCsv() { this.ps.exportToCsv(); }

  async importCsv(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.importing.set(true);
    try {
      const result = await this.ps.importFromCsv(file);
      alert(`นำเข้า ${result.imported} รายการ (ข้าม ${result.skipped} รายการที่ไม่ครบข้อมูล)`);
    } catch (err) {
      console.error(err);
      alert('นำเข้าไฟล์ไม่สำเร็จ กรุณาตรวจสอบไฟล์ CSV');
    } finally {
      this.importing.set(false);
      input.value = '';
    }
  }

  clearAllProducts() {
    if (confirm('ลบสินค้าทั้งหมดในระบบ?')) this.ps.clearAll();
  }

  clearDraft() {
    this.draft = {
      name: '',
      price: 0,
      unit: '',
      category: '',
      sku: '',
      description: '',
      slug: '',
      image: '',
    };
  }

  add() {
    const d = this.draft;
    if (!d.name || !d.unit || !d.category) {
      alert('กรอก ชื่อ/หน่วย/หมวด ให้ครบ');
      return;
    }
    const slug = this.slugify(d.name);
    this.ps.add({ ...d, slug });
    this.clearDraft();
  }

  save(p: Product) {
    if (!p.name) {
      alert('ชื่อสินค้าห้ามว่าง');
      return;
    }
    const patch: Partial<Product> = { ...p, slug: this.slugify(p.name) };
    this.ps.update(p.id, patch);
  }

  cancelEdits() {
    this.ps.reloadFromStorage();
  }

  remove(id: number) {
    if (confirm('ลบสินค้านี้?')) this.ps.remove(id);
  }

  track = (_: number, p: Product) => p.id;

  slugify(s: string) {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9ก-๙\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60);
  }
}
