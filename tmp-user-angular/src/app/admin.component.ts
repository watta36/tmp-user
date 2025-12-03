import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Product } from './product.service';
import { AuthService } from './auth.service';
import { DEFAULT_THEME, THEME_OPTIONS, ThemeOption } from './themes';

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
  catInput = '';
  catEdit: Record<string, string> = {};
  draft: Draft = {
    name: '',
    price: 0,
    unit: '',
    category: '',
    sku: '',
    description: '',
    slug: '',
    image: '',
    images: [],
  };
  importing = signal(false);
  themes: ThemeOption[] = THEME_OPTIONS;
  currentTheme = computed(() => this.ps.theme() || DEFAULT_THEME);

  constructor(public ps: ProductService, public auth: AuthService) {}

  setTheme(themeId: string) {
    this.ps.setTheme(themeId);
  }

  async onUploadNew(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    const urls = await Promise.all(files.map((f) => this.toDataUrl(f)));
    this.draft.images = [...(this.draft.images || []), ...urls];
    this.draft.image = this.draft.images[0] || '';
    input.value = '';
  }

  async onReplaceImage(p: Product, ev: Event) {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    const data = await this.toDataUrl(f);
    this.ps.update(p.id, { image: data, images: [data] });
    input.value = '';
  }

  async onAddImages(p: Product, ev: Event) {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    const urls = await Promise.all(files.map((f) => this.toDataUrl(f)));
    const merged = [...(p.images || []), ...urls];
    this.ps.update(p.id, { images: merged, image: merged[0] });
    input.value = '';
  }

  removeDraftImage(idx: number) {
    this.draft.images = (this.draft.images || []).filter((_, i) => i !== idx);
    this.draft.image = this.draft.images[0] || '';
  }

  toDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  logout() {
    this.auth.logout();
  }

  reset() {
    if (confirm('โหลดข้อมูลล่าสุดจากฐานข้อมูล?')) this.ps.resetToSeed();
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
      images: [],
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

  addCategory() {
    const name = this.catInput.trim();
    if (!name) return;
    this.ps.addCategory(name);
    this.catInput = '';
  }

  editCategory(name: string, value: string) {
    this.catEdit[name] = value;
  }

  saveCategory(name: string) {
    const next = (this.catEdit[name] ?? name).trim();
    if (!next) {
      alert('ชื่อหมวดหมู่ห้ามว่าง');
      return;
    }
    this.ps.renameCategory(name, next);
    delete this.catEdit[name];
  }

  removeCategory(name: string) {
    if (!confirm(`ลบหมวดหมู่ "${name}" ? สินค้าเดิมจะถูกลบชื่อหมวดหมู่ออก`)) return;
    this.ps.removeCategory(name);
    delete this.catEdit[name];
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
    this.ps.restoreLastSnapshot();
  }

  remove(id: number) {
    if (confirm('ลบสินค้านี้?')) this.ps.remove(id);
  }

  track = (_: number, p: Product) => p.id;
  trackCat = (_: number, name: string) => name;

  getCurrentThemeName() {
    const theme = this.themes.find((t) => t.id === this.currentTheme());
    return theme?.name ?? '';
  }

  slugify(s: string) {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9ก-๙\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60);
  }
}
