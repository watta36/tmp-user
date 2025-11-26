import { Injectable, OnDestroy, signal } from '@angular/core';

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

const STORAGE_KEY = 'tmp_products_v2';

function placeholder(name: string, emoji = '🦐', bg = '#e0f2fe'): string {
  const safe = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>
  <rect width='100%' height='100%' fill='${bg}'/>
  <text x='50%' y='45%' text-anchor='middle' font-size='96'>${emoji}</text>
  <text x='50%' y='60%' text-anchor='middle' font-size='28' font-family='Arial, sans-serif'>${safe(name)}</text>
</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const SEED: Product[] = [
  {
    id: 5001,
    name: 'กุ้งขาวแกะ 61/70 nw80% 1 กก.',
    price: 210,
    unit: 'แพ็ค 1 กก.',
    category: 'กุ้ง',
    sku: 'FB01',
    description: 'กุ้งขาวแกะ ขนาด 61/70 ประมาณ 110–125 ตัว/กก. (nw80%)',
    slug: 'shrimp-6170',
    images: [placeholder('กุ้งขาวแกะ 61/70', '🦐', '#e0f2fe')],
  },
  {
    id: 5002,
    name: 'กุ้งแชบ๊วยหักหัว ไซส์รวม 2 กก.',
    price: 199,
    unit: 'แพ็ค 2 กก.',
    category: 'กุ้ง',
    sku: 'FB02',
    description: 'กุ้งแชบ๊วยหักหัว ไซส์รวม เหมาะทำผัด/ทอด',
    slug: 'shrimp-mixed',
    images: [placeholder('กุ้งแชบ๊วยหักหัว', '🦐', '#e0f2fe')],
  },
  {
    id: 5003,
    name: 'กุ้งขาว 41/50 ต้ม ไว้หาง 500 กรัม',
    price: 130,
    unit: 'แพ็ค 500 กรัม',
    category: 'กุ้ง',
    sku: 'FB03',
    description: 'กุ้งขาวต้ม ไว้หางพร้อมทาน',
    slug: 'shrimp-cooked',
    images: [placeholder('กุ้งขาวต้มไว้หาง', '🦐', '#e0f2fe')],
  },
  {
    id: 5004,
    name: 'กุ้งแม่น้ำ 7 ตัว (1 แถม 1) 500 กรัม',
    price: 240,
    unit: 'แพ็ค 500 กรัม',
    category: 'กุ้ง',
    sku: 'FB04',
    description: 'กุ้งแม่น้ำ 7 ตัว/แพ็ค',
    slug: 'river-prawn',
    images: [placeholder('กุ้งแม่น้ำ', '🦐', '#e0f2fe')],
  },
  {
    id: 5005,
    name: 'ดอลลี่หั่น ไม่ติดท้อง Nw.60% 1 กก.',
    price: 43,
    unit: 'แพ็ค 1 กก.',
    category: 'ปลา',
    sku: 'FB05',
    description: 'ปลาดอลลี่หั่น Nw60%',
    slug: 'dolly-cut',
    images: [placeholder('ดอลลี่หั่น', '🐟', '#e2f7e1')],
  },
  {
    id: 5006,
    name: 'ดอลลี่ตัว 3–4 ชิ้น Nw.70%',
    price: 65,
    unit: 'แพ็ค 1 กก.',
    category: 'ปลา',
    sku: 'FB06',
    description: 'ดอลลี่ 3–4 ชิ้น/แพ็ค Nw70%',
    slug: 'dolly-34',
    images: [placeholder('ดอลลี่ 3–4 ชิ้น', '🐟', '#e2f7e1')],
  },
  {
    id: 5007,
    name: 'น้ำจิ้มซีฟูดส์แม่กระบอก 150–160 ml',
    price: 35,
    unit: 'ขวด',
    category: 'ซอส/น้ำจิ้ม',
    sku: 'FB07',
    description: 'น้ำจิ้มซีฟูดส์พรีเมี่ยม',
    slug: 'seafood-sauce',
    images: [placeholder('น้ำจิ้มซีฟูดส์', '🧂', '#fff7d6')],
  },
  {
    id: 5008,
    name: 'น้ำจิ้มหวาน (สูตรแม่กระบอก) ขวดเล็ก',
    price: 100,
    unit: '3 ขวด/แพ็ค',
    category: 'ซอส/น้ำจิ้ม',
    sku: 'FB08',
    description: 'น้ำจิ้มหวาน แพ็ค 3',
    slug: 'sweet-chili',
    images: [placeholder('น้ำจิ้มหวาน', '🧂', '#fff7d6')],
  },
  {
    id: 5009,
    name: 'น้ำปลากวน 250 ml (4 ขวด 100)',
    price: 100,
    unit: '4 ขวด/แพ็ค',
    category: 'ซอส/น้ำจิ้ม',
    sku: 'FB09',
    description: 'น้ำปลากวน 250ml เซต',
    slug: 'fish-sauce',
    images: [placeholder('น้ำปลากวน', '🧂', '#fff7d6')],
  },
  {
    id: 5010,
    name: 'พริกแกงกาญ ขียวหวาน 500 กรัม',
    price: 65,
    unit: 'แพ็ค 500 กรัม',
    category: 'พริกแกง',
    sku: 'FB10',
    description: 'พริกแกงเขียวหวาน',
    slug: 'green-curry-paste',
    images: [placeholder('พริกแกงเขียวหวาน', '🥣', '#ffe4f1')],
  },
];

@Injectable({ providedIn: 'root' })
export class ProductService implements OnDestroy {
  products = signal<Product[]>(this.load());
  private storageHandler?: (ev: StorageEvent) => void;

  constructor() {
    this.listenToStorageChanges();
  }

  private load(): Product[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return this.normalizeList(JSON.parse(raw));
    } catch {}
    return this.normalizeList(SEED);
  }
  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.products()));
    } catch {}
  }

  list() { return this.products(); }
  categories(): string[] { return Array.from(new Set(this.products().map(p => p.category))).sort(); }
  add(p: Omit<Product, 'id'>) {
    const nextId = Math.max(0, ...this.products().map(x => x.id)) + 1;
    const product = this.normalizeProduct({ id: nextId, ...p } as Product);
    this.products.set([product, ...this.products()]);
    this.save();
  }
  update(id: number, patch: Partial<Product>) {
    this.products.set(this.products().map(p => p.id === id ? this.normalizeProduct({ ...p, ...patch, id: p.id }) : p));
    this.save();
  }
  remove(id: number) {
    this.products.set(this.products().filter(p => p.id !== id));
    this.save();
  }
  reloadFromStorage() { this.products.set(this.load()); }
  resetToSeed() { this.products.set(this.normalizeList(SEED)); this.save(); }
  clearAll() { this.products.set([]); this.save(); }

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
    this.save();
    return { imported: deduped.length, skipped };
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
    return { ...p, images, image: images[0] || p.image || '' };
  }

  private normalizeImages(p: Partial<Product>): string[] {
    const imgs: string[] = [];
    if (Array.isArray(p.images)) imgs.push(...p.images.filter(Boolean));
    if (p.image) imgs.unshift(p.image);
    return Array.from(new Set(imgs.filter(Boolean)));
  }

  ngOnDestroy(): void {
    if (this.storageHandler && typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageHandler);
    }
  }

  private listenToStorageChanges() {
    if (typeof window === 'undefined' || !window.addEventListener) return;
    this.storageHandler = (ev: StorageEvent) => {
      if (ev.key && ev.key !== STORAGE_KEY) return;
      this.reloadFromStorage();
    };
    window.addEventListener('storage', this.storageHandler);
  }
}
