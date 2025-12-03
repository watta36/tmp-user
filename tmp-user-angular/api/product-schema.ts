import { ObjectId } from 'mongodb';

export type ProductPayload = {
  id?: number;
  name?: string;
  price?: number;
  unit?: string;
  category?: string;
  sku?: string;
  description?: string;
  slug?: string;
  image?: string;
  images?: string[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type ProductDocument = Required<Omit<ProductPayload, 'createdAt' | 'updatedAt'>> & {
  _id?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const REQUIRED_FIELDS: (keyof ProductDocument)[] = ['id', 'name', 'price', 'unit', 'category', 'slug'];

export function normalizeProduct(input: ProductPayload, fallbackId: number, now = new Date()): ProductDocument | null {
  const id = normalizeNumber(input.id ?? fallbackId);
  const name = (input.name ?? '').toString().trim();
  const unit = (input.unit ?? '').toString().trim();
  const category = (input.category ?? '').toString().trim();
  const price = normalizeNumber(input.price ?? 0);
  const sku = (input.sku ?? '').toString().trim();
  const description = (input.description ?? '').toString();
  const slug = (input.slug ?? slugify(name)).toString().trim();
  const image = (input.image ?? '').toString().trim();
  const images = normalizeImages(input.images, image);
  const createdAt = normalizeDate(input.createdAt, now);
  const updatedAt = normalizeDate(input.updatedAt, now);

  const product: ProductDocument = {
    id,
    name,
    price,
    unit,
    category,
    sku,
    description,
    slug,
    image: image || images[0] || '',
    images,
    createdAt,
    updatedAt,
  };

  if (!isValidProduct(product)) return null;
  return product;
}

export function normalizeProducts(list: unknown[]): ProductDocument[] {
  const normalized: ProductDocument[] = [];
  const seen = new Set<number>();
  const now = new Date();

  list.forEach((item, idx) => {
    const p = normalizeProduct(item as ProductPayload, idx + 1, now);
    if (p && !seen.has(p.id)) {
      seen.add(p.id);
      normalized.push(p);
    }
  });
  return normalized;
}

export function parseCsvProducts(csv: string): ProductDocument[] {
  const rows = parseCsv(csv);
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  const records = rows.slice(1).map((cells) => cellsToRecord(headers, cells));
  return normalizeProducts(records);
}

function normalizeImages(images: unknown, primary?: string): string[] {
  const imgs: string[] = [];
  if (Array.isArray(images)) imgs.push(...images.map((v) => v?.toString().trim()).filter(Boolean));
  if (primary) imgs.unshift(primary);
  return Array.from(new Set(imgs.filter(Boolean)));
}

function normalizeNumber(v: unknown): number {
  const num = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(num) ? num : 0;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

function normalizeDate(value: unknown, fallback: Date): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

function isValidProduct(p: ProductDocument): boolean {
  return REQUIRED_FIELDS.every((field) => {
    const value = p[field];
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value === 'string') return value.trim().length > 0;
    return !!value;
  });
}

// ---------------- CSV helpers ----------------

function parseCsv(text: string): string[][] {
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

function cellsToRecord(headers: string[], cells: string[]): Record<string, string> {
  const rec: Record<string, string> = {};
  headers.forEach((h, idx) => { rec[h || `col_${idx}`] = cells[idx] ?? ''; });
  return rec;
}
