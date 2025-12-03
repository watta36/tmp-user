import { Injectable, OnDestroy, effect, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { KvStoreService, KvState } from './kv-store.service';
import { DEFAULT_THEME } from './themes';

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
  private themeChoice = signal<string>(DEFAULT_THEME);
  private lastSnapshot: KvState | null = null;
  private versionPoller?: ReturnType<typeof setInterval>;
  private autoApplyTimer?: ReturnType<typeof setTimeout>;
  pendingChanges = signal(false);
  private appliedThemeClass: string | null = null;

  constructor(private kvStore: KvStoreService) {
    this.refreshFromServer();
    this.startVersionPolling();
    this.syncThemeToDom();
  }

  private markDirty() {
    this.pendingChanges.set(true);
    this.queueAutoApply();
  }

  private queueAutoApply() {
    if (typeof window === 'undefined') return;
    if (this.autoApplyTimer) clearTimeout(this.autoApplyTimer);
    this.autoApplyTimer = setTimeout(() => this.runAutoApply(), 1200);
  }

  private async runAutoApply() {
    this.autoApplyTimer = undefined;
    try {
      await this.applyLatest();
    } catch (err) {
      console.error('บันทึกอัตโนมัติไม่สำเร็จ', err);
      this.pendingChanges.set(true);
    }
  }

  list() { return this.products(); }
  categories(): string[] { return this.categoryOptions(); }
  theme() { return this.themeChoice(); }

  async addCategory(name: string) {
    const normalized = this.normalizeCategories([name, ...this.categoryOptions()]);
    this.categoryOptions.set(normalized);
    this.markDirty();
  }

  async renameCategory(prevName: string, nextName: string) {
    const newName = nextName.trim();
    if (!newName) return;
    const updatedList = this.normalizeCategories(this.categoryOptions().map((c) => (c === prevName ? newName : c)));
    this.categoryOptions.set(updatedList);
    this.products.set(
      this.products().map((p) => (p.category === prevName ? this.normalizeProduct({ ...p, category: newName }) : p))
    );
    this.markDirty();
  }

  async removeCategory(name: string) {
    this.categoryOptions.set(this.categoryOptions().filter((c) => c !== name));
    this.products.set(this.products().map((p) => (p.category === name ? this.normalizeProduct({ ...p, category: '' }) : p)));
    this.markDirty();
  }

  async add(p: Omit<Product, 'id'>) {
    const nextId = Math.max(0, ...this.products().map(x => x.id)) + 1;
    const product = this.normalizeProduct({ id: nextId, ...p } as Product);
    this.products.set([product, ...this.products()]);
    this.ensureCategoryExists(product.category);
    this.markDirty();
  }

  async update(id: number, patch: Partial<Product>) {
    this.products.set(this.products().map(p => p.id === id ? this.normalizeProduct({ ...p, ...patch, id: p.id }) : p));
    if (patch.category) this.ensureCategoryExists(patch.category);
    this.markDirty();
  }

  async remove(id: number) {
    this.products.set(this.products().filter(p => p.id !== id));
    this.markDirty();
  }

  async resetToSeed() {
    await this.refreshFromServer();
  }

  async clearAll() {
    this.products.set([]);
    this.categoryOptions.set([]);
    this.markDirty();
  }

  setTheme(id: string) {
    const next = (id || DEFAULT_THEME).trim();
    const value = next || DEFAULT_THEME;
    this.themeChoice.set(value);
    this.markDirty();
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
    const { products, skipped } = this.parseCsvProducts(text);
    if (!products.length) throw new Error('ไม่พบสินค้าในไฟล์');

    const normalizedProducts = this.normalizeList(products);
    const categories = this.normalizeCategories(normalizedProducts.map((p) => p.category));
    const chunkSize = 20;
    let latestVersion = this.serverVersion();

    for (let i = 0; i < normalizedProducts.length; i += chunkSize) {
      const chunk = normalizedProducts.slice(i, i + chunkSize);
      const res = await firstValueFrom(this.kvStore.importChunk(chunk, {
        reset: i === 0,
        categories,
        theme: this.themeChoice(),
      }));
      if (res?.version) latestVersion = res.version;
    }

    this.applyStateFromServer({
      products: normalizedProducts,
      categories,
      version: latestVersion,
      theme: this.themeChoice(),
    });
    return { imported: normalizedProducts.length, skipped };
  }

  async refreshFromServer() {
    try {
      const state = await firstValueFrom(this.kvStore.loadState());
      this.applyStateFromServer({
        products: state.products ?? [],
        categories: state.categories ?? [],
        version: state.version,
        theme: state.theme,
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
    if (this.autoApplyTimer) {
      clearTimeout(this.autoApplyTimer);
      this.autoApplyTimer = undefined;
    }
    await this.pushSnapshotToBackend({ products: this.products(), categories: this.categoryOptions(), theme: this.themeChoice() });
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
    const theme = state.theme || DEFAULT_THEME;
    this.themeChoice.set(theme);
    this.serverVersion.set(version);
    this.lastSnapshot = {
      products: [...this.products()],
      categories: [...this.categoryOptions()],
      theme,
      version,
    };
    this.pendingChanges.set(false);
  }

  private async pushSnapshotToBackend(state: { products: Product[]; categories: string[]; theme: string }) {
    const snapshot = this.lastSnapshot;
    const diff = this.buildDiff(snapshot, state);
    if (!diff.upserts.length && !diff.deletedIds.length && !diff.categoriesChanged && !diff.themeChanged) return;

    try {
      const res = await firstValueFrom(
        this.kvStore.patchChanges(diff.upserts, diff.deletedIds, state.categories, state.theme)
      );
      const version = res?.version ?? this.serverVersion() + 1;
      this.serverVersion.set(version);
      this.lastSnapshot = {
        products: [...state.products],
        categories: [...(res.categories || state.categories)],
        theme: state.theme,
        version,
      };
    } catch (err) {
      console.error('บันทึกข้อมูลไปยัง Edge Config/KV ไม่สำเร็จ', err);
      throw err;
    }
  }

  private buildDiff(snapshot: KvState | null, state: { products: Product[]; categories: string[]; theme: string }) {
    if (!snapshot) {
      return {
        upserts: state.products,
        deletedIds: [] as number[],
        categoriesChanged: true,
        themeChanged: true,
      };
    }

    const prevById = new Map(snapshot.products.map((p) => [p.id, p]));
    const currentIds = new Set(state.products.map((p) => p.id));

    const upserts = state.products.filter((p) => {
      const prev = prevById.get(p.id);
      if (!prev) return true;
      return this.hasProductChanged(prev, p);
    });

    const deletedIds = snapshot.products.filter((p) => !currentIds.has(p.id)).map((p) => p.id);

    return {
      upserts,
      deletedIds,
      categoriesChanged: !this.areArraysEqual(snapshot.categories, state.categories),
      themeChanged: (snapshot.theme || DEFAULT_THEME) !== state.theme,
    };
  }

  private hasProductChanged(prev: Product, next: Product): boolean {
    const fields: (keyof Product)[] = ['name', 'price', 'unit', 'category', 'sku', 'description', 'slug', 'image'];
    for (const key of fields) {
      if ((prev as any)[key] !== (next as any)[key]) return true;
    }
    const prevImages = (prev.images || []).join('|');
    const nextImages = (next.images || []).join('|');
    if (prevImages !== nextImages) return true;
    return false;
  }

  private areArraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
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

  private parseCsvProducts(csv: string): { products: Product[]; skipped: number } {
    const rows = this.splitCsv(csv);
    if (!rows.length) return { products: [], skipped: 0 };

    const headers = rows[0].map((h) => h.trim());
    const seen = new Set<number>();
    const products: Product[] = [];
    let skipped = 0;

    rows.slice(1).forEach((cells, idx) => {
      const record = this.cellsToRecord(headers, cells);
      const product = this.normalizeCsvProduct(record, idx + 1);
      if (!product || seen.has(product.id)) { skipped += 1; return; }
      seen.add(product.id);
      products.push(product);
    });

    return { products, skipped };
  }

  private normalizeCsvProduct(record: Record<string, string>, fallbackId: number): Product | null {
    const id = this.toNumber(record.id, fallbackId);
    const name = (record.name ?? '').toString().trim();
    const unit = (record.unit ?? '').toString().trim();
    const category = (record.category ?? '').toString().trim();
    const price = this.toNumber(record.price, 0);
    if (!name || !unit || !category || !Number.isFinite(id) || !Number.isFinite(price)) return null;

    const sku = (record.sku ?? '').toString().trim();
    const description = (record.description ?? '').toString();
    const slug = this.slugify(((record.slug ?? name) || '').toString());
    const images = this.parseImageField(record.images ?? record.image);

    return { id, name, price, unit, category, sku, description, slug, image: images[0] || '', images };
  }

  private splitCsv(text: string): string[][] {
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
    return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
  }

  private cellsToRecord(headers: string[], cells: string[]): Record<string, string> {
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => { rec[h || `col_${idx}`] = cells[idx] ?? ''; });
    return rec;
  }

  private parseImageField(value: unknown): string[] {
    if (Array.isArray(value)) {
      return Array.from(new Set(value.map((v) => v?.toString().trim()).filter(Boolean)));
    }
    if (typeof value === 'string') {
      // อย่า split ด้วย comma เพราะ Data URL ของรูป (data:image/png;base64,...) มี comma อยู่แล้ว
      // ใช้ only pipe หรือ newline แยกรูปหลายรายการแทน
      const parts = value
        .split(/\s*\|\s*|\n+/)
        .map((v) => v.trim())
        .filter(Boolean);
      return Array.from(new Set(parts));
    }
    return [];
  }

  private toNumber(value: unknown, fallback: number): number {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : fallback;
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

  private syncThemeToDom() {
    effect(() => {
      const themeId = this.themeChoice();
      if (typeof document === 'undefined') return;
      const root = document.documentElement;
      if (this.appliedThemeClass) root.classList.remove(this.appliedThemeClass);
      const next = `theme-${themeId}`;
      root.classList.add(next);
      this.appliedThemeClass = next;
    });
  }
}
