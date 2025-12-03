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
  pendingChanges = signal(false);

  constructor(private kvStore: KvStoreService) {
    this.refreshFromServer();
    this.startVersionPolling();
  }

  list() { return this.products(); }
  categories(): string[] { return this.categoryOptions(); }

  async addCategory(name: string) {
    const normalized = this.normalizeCategories([name, ...this.categoryOptions()]);
    this.categoryOptions.set(normalized);
    this.pendingChanges.set(true);
  }

  async renameCategory(prevName: string, nextName: string) {
    const newName = nextName.trim();
    if (!newName) return;
    const updatedList = this.normalizeCategories(this.categoryOptions().map((c) => (c === prevName ? newName : c)));
    this.categoryOptions.set(updatedList);
    this.products.set(
      this.products().map((p) => (p.category === prevName ? this.normalizeProduct({ ...p, category: newName }) : p))
    );
    this.pendingChanges.set(true);
  }

  async removeCategory(name: string) {
    this.categoryOptions.set(this.categoryOptions().filter((c) => c !== name));
    this.products.set(this.products().map((p) => (p.category === name ? this.normalizeProduct({ ...p, category: '' }) : p)));
    this.pendingChanges.set(true);
  }

  async add(p: Omit<Product, 'id'>) {
    const nextId = Math.max(0, ...this.products().map(x => x.id)) + 1;
    const product = this.normalizeProduct({ id: nextId, ...p } as Product);
    this.products.set([product, ...this.products()]);
    this.ensureCategoryExists(product.category);
    this.pendingChanges.set(true);
  }

  async update(id: number, patch: Partial<Product>) {
    this.products.set(this.products().map(p => p.id === id ? this.normalizeProduct({ ...p, ...patch, id: p.id }) : p));
    if (patch.category) this.ensureCategoryExists(patch.category);
    this.pendingChanges.set(true);
  }

  async remove(id: number) {
    this.products.set(this.products().filter(p => p.id !== id));
    this.pendingChanges.set(true);
  }

  async resetToSeed() {
    await this.refreshFromServer();
  }

  async clearAll() {
    this.products.set([]);
    this.categoryOptions.set([]);
    this.pendingChanges.set(true);
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
    const result = await firstValueFrom(this.kvStore.importCsv(text));
    const normalizedProducts = this.normalizeList(result.products || []);
    this.products.set(normalizedProducts);
    const categories = result.categories?.length
      ? this.normalizeCategories(result.categories)
      : this.normalizeCategories(normalizedProducts.map((p) => p.category));
    this.categoryOptions.set(categories);
    this.pendingChanges.set(true);
    return { imported: normalizedProducts.length, skipped: 0 };
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
    this.pendingChanges.set(false);
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
    this.pendingChanges.set(false);
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
      throw err;
    }
  }

  private startVersionPolling() {
    if (typeof window === 'undefined') return;
    this.versionPoller = setInterval(async () => {
      try {
        const res = await firstValueFrom(this.kvStore.loadVersion());
        const version = res?.version ?? 0;
        if (version > this.serverVersion()) {
          if (this.pendingChanges()) return;
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
