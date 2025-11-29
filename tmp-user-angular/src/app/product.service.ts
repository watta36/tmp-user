import { Injectable, OnDestroy, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { KvStoreService, KvState } from './kv-store.service';

export type Product = {
  id: number;
  name: string;
  price: number;
  unit: string;
  category: string;
  sku?: string;
  description?: string;
  slug: string;
  image?: string;
  images?: string[];
};

@Injectable({ providedIn: 'root' })
export class ProductService implements OnDestroy {
  products = signal<Product[]>([]);
  private categoryOptions = signal<string[]>([]);
  private serverVersion = signal<number>(0);
  private lastSnapshot: KvState | null = null;
  private versionPoller?: ReturnType<typeof setInterval>;

  constructor(private kvStore: KvStoreService) {
    this.refreshFromServer();
    this.startVersionPolling();
  }

  list() { return this.products(); }
  categories(): string[] { return this.categoryOptions(); }

  async addCategory(name: string) {
    const normalized = this.normalizeCategories([name, ...this.categoryOptions()]);
    this.categoryOptions.set(normalized);
    await this.persistState();
  }

  async renameCategory(prevName: string, nextName: string) {
    const newName = nextName.trim();
    if (!newName) return;
    const updatedList = this.normalizeCategories(this.categoryOptions().map((c) => (c === prevName ? newName : c)));
    this.categoryOptions.set(updatedList);
    this.products.set(
      this.products().map((p) => (p.category === prevName ? this.normalizeProduct({ ...p, category: newName }) : p))
    );
    await this.persistState();
  }

  async removeCategory(name: string) {
    this.categoryOptions.set(this.categoryOptions().filter((c) => c !== name));
    this.products.set(this.products().map((p) => (p.category === name ? this.normalizeProduct({ ...p, category: '' }) : p)));
    await this.persistState();
  }

  async add(p: Omit<Product, 'id'>) {
    const nextId = Math.max(0, ...this.products().map(x => x.id)) + 1;
    const product = this.normalizeProduct({ id: nextId, ...p } as Product);
    this.products.set([product, ...this.products()]);
    this.ensureCategoryExists(product.category);
    await this.persistState();
  }

  async update(id: number, patch: Partial<Product>) {
    this.products.set(this.products().map(p => p.id === id ? this.normalizeProduct({ ...p, ...patch, id: p.id }) : p));
    if (patch.category) this.ensureCategoryExists(patch.category);
    await this.persistState();
  }

  async remove(id: number) {
    this.products.set(this.products().filter(p => p.id !== id));
    await this.persistState();
  }

  async resetToSeed() {
    await this.refreshFromServer();
  }

  async clearAll() {
    this.products.set([]);
    this.categoryOptions.set([]);
    await this.persistState();
  }

  exportToCsv(filename = 'products.csv') {
    const headers = ['id', 'name', 'price', 'unit', 'category', 'sku', 'description', 'slug', 'image', 'images'] as const;
    const rows = this.products().map((p) => headers.map((k) => {
      if (k === 'images') return this.escapeCsv((p.images || []).join(' | '));
      return this.escapeCsv((p as any)[k]);
    }));
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importFromCsv(file: File) {
    const text = await file.text();
    const rows = this.parseCsv(text);
    if (!rows.length) throw new Error('ไฟล์ว่าง');

    const headers = rows[0].map((h) => h.trim());
    const records = rows.slice(1).map((cells) => this.cellsToRecord(headers, cells));
    const products: Product[] = [];
    let skipped = 0;
    for (const r of records) {
      const p = this.recordToProduct(r);
      if (p) products.push(p); else skipped++;
    }

    const deduped = this.dedupById(products);
    this.products.set(deduped);
    this.categoryOptions.set(this.normalizeCategories(deduped.map((p) => p.category)));
    await this.persistState();
    return { imported: deduped.length, skipped };
  }

  async refreshFromServer() {
    try {
      const state = await firstValueFrom(this.kvStore.loadState());
      this.applyStateFromServer({
        products: state.products ?? [],
        categories: state.categories ?? [],
        version: state.version,
      });
    } catch (err) {
      console.warn('โหลดข้อมูลจากฐานไม่สำเร็จ', err);
      // อย่ารีเซ็ตสถานะในแอปเป็นค่าว่างเมื่อโหลดล้มเหลว เพราะมักเป็นเพียงข้อผิดพลาดชั่วคราว
      // การคง state เดิมช่วยหลีกเลี่ยงการคิดว่าฐานข้อมูลว่างและอาจเขียนค่าว่างกลับไปที่ backend
      if (this.lastSnapshot) {
        this.applyStateFromServer(this.lastSnapshot);
      }
    }
  }

  async restoreLastSnapshot() {
    if (this.lastSnapshot) {
      this.applyStateFromServer(this.lastSnapshot);
      return;
    }
    await this.refreshFromServer();
  }

  async applyLatest() {
    await this.pushSnapshotToBackend({ products: this.products(), categories: this.categoryOptions() });
  }

  ngOnDestroy(): void {
    if (this.versionPoller) clearInterval(this.versionPoller);
  }

  private applyStateFromServer(state: KvState) {
    const normalizedProducts = this.normalizeList(state.products || []);
    this.products.set(normalizedProducts);

    const cats = state.categories?.length
      ? this.normalizeCategories(state.categories)
      : this.normalizeCategories(normalizedProducts.map((p) => p.category));
    this.categoryOptions.set(cats);

    const version = state.version ?? this.serverVersion();
    this.serverVersion.set(version);
    this.lastSnapshot = {
      products: [...this.products()],
      categories: [...this.categoryOptions()],
      version,
    };
  }

  private async pushSnapshotToBackend(state: { products: Product[]; categories: string[] }) {
    try {
      const res = await firstValueFrom(this.kvStore.applyChanges(state.products, state.categories));
      const version = res?.version ?? this.serverVersion() + 1;
      this.serverVersion.set(version);
      this.lastSnapshot = {
        products: [...state.products],
        categories: [...state.categories],
        version,
      };
    } catch (err) {
      console.error('บันทึกข้อมูลไปยัง Edge Config/KV ไม่สำเร็จ', err);
    }
  }

  private async persistState(throwOnError = false) {
    try {
      const res = await firstValueFrom(this.kvStore.saveState(this.products(), this.categoryOptions()));
      const version = res?.version ?? this.serverVersion() + 1;
      this.serverVersion.set(version);
      this.lastSnapshot = {
        products: [...this.products()],
        categories: [...this.categoryOptions()],
        version,
      };
      return true;
    } catch (err) {
      console.error('ซิงค์ข้อมูลไป KV ไม่สำเร็จ', err);
      if (throwOnError) throw err;
      return false;
    }
  }

  private startVersionPolling() {
    if (typeof window === 'undefined') return;
    this.versionPoller = setInterval(async () => {
      try {
        const res = await firstValueFrom(this.kvStore.loadVersion());
        const version = res?.version ?? 0;
        if (version > this.serverVersion()) {
          await this.refreshFromServer();
        }
      } catch (err) {
        console.warn('เช็คเวอร์ชันข้อมูลไม่สำเร็จ', err);
      }
    }, 10000);
  }

  private escapeCsv(v: unknown) {
    const raw = v === undefined || v === null ? '' : String(v);
    if (/[",\n]/.test(raw)) {
      return '"' + raw.replace(/"/g, '""') + '"';
    }
    return raw;
  }

  private parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let current = '';
    let row: string[] = [];
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { current += '"'; i++; }
          else { inQuotes = false; }
        } else current += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',') { row.push(current); current = ''; }
        else if (ch === '\n') { row.push(current); rows.push(row); row = []; current = ''; }
        else if (ch === '\r') { /* ignore */ }
        else current += ch;
      }
    }
    if (current || row.length) { row.push(current); rows.push(row); }
    return rows.filter(r => r.some(cell => cell.trim() !== ''));
  }

  private cellsToRecord(headers: string[], cells: string[]) {
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => rec[h || `col_${idx}`] = cells[idx] ?? '');
    return rec;
  }

  private recordToProduct(r: Record<string, string>): Product | null {
    const id = Number(r.id ?? r.ID ?? r.Id ?? r['รหัส']);
    const name = (r.name ?? r.Name ?? '').toString().trim();
    const price = Number(r.price ?? r.Price ?? 0);
    const unit = (r.unit ?? r.Unit ?? '').toString().trim();
    const category = (r.category ?? r.Category ?? '').toString().trim();
    const sku = (r.sku ?? r.SKU ?? '').toString().trim();
    const description = (r.description ?? r.Description ?? '').toString();
    const image = (r.image ?? r.Image ?? '').toString();
    const rawImages = (r.images ?? r.Images ?? '').toString();
    const images = rawImages
      .split(/\||\n|,/)
      .map((v) => v.trim())
      .filter(Boolean);
    if (image) images.unshift(image);
    const slug = (r.slug ?? r.Slug ?? '').toString().trim() || this.slugify(name);

    if (!id || !name || !unit || !category || Number.isNaN(price)) return null;
    return this.normalizeProduct({ id, name, price, unit, category, sku, description, image, images, slug });
  }

  private dedupById(list: Product[]) {
    const seen = new Set<number>();
    const keep: Product[] = [];
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      keep.push(p);
    }
    return keep.reverse();
  }

  private slugify(s: string) {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9ก-๙\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60);
  }

  private normalizeList(list: Product[]): Product[] {
    return list.map((p) => this.normalizeProduct(p));
  }

  private normalizeProduct(p: Product): Product {
    const images = this.normalizeImages(p);
    return { ...p, images, image: images[0] || p.image || '', category: (p.category || '').trim() };
  }

  private normalizeImages(p: Partial<Product>): string[] {
    const imgs: string[] = [];
    if (Array.isArray(p.images)) imgs.push(...p.images.filter(Boolean));
    if (p.image) imgs.unshift(p.image);
    return Array.from(new Set(imgs.filter(Boolean)));
  }

  private normalizeCategories(list: string[]): string[] {
    return Array.from(new Set(list.map((c) => c.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'th'));
  }

  private ensureCategoryExists(name: string) {
    const next = name.trim();
    if (!next || this.categoryOptions().includes(next)) return;
    this.categoryOptions.set(this.normalizeCategories([...this.categoryOptions(), next]));
  }
}
