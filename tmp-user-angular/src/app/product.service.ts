import { Injectable, signal } from '@angular/core';

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
};

const STORAGE_KEY = 'tmp_products_v2';

function placeholder(name: string, emoji='🦐', bg='#e0f2fe'): string {
  const safe = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>
  <rect width='100%' height='100%' fill='${bg}'/>
  <text x='50%' y='45%' text-anchor='middle' font-size='96'>${emoji}</text>
  <text x='50%' y='60%' text-anchor='middle' font-size='28' font-family='Arial, sans-serif'>${safe(name)}</text>
</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const SEED = [
  {id:5001,name:'กุ้งขาวแกะ 61/70 nw80% 1 กก.',price:210,unit:'แพ็ค 1 กก.',category:'กุ้ง',sku:'FB01',description:'กุ้งขาวแกะ ขนาด 61/70 ประมาณ 110–125 ตัว/กก. (nw80%)',slug:'shrimp-6170',image:placeholder('กุ้งขาวแกะ 61/70','🦐','#e0f2fe')},
  {id:5002,name:'กุ้งแชบ๊วยหักหัว ไซส์รวม 2 กก.',price:199,unit:'แพ็ค 2 กก.',category:'กุ้ง',sku:'FB02',description:'กุ้งแชบ๊วยหักหัว ไซส์รวม เหมาะทำผัด/ทอด',slug:'shrimp-mixed',image:placeholder('กุ้งแชบ๊วยหักหัว','🦐','#e0f2fe')},
  {id:5003,name:'กุ้งขาว 41/50 ต้ม ไว้หาง 500 กรัม',price:130,unit:'แพ็ค 500 กรัม',category:'กุ้ง',sku:'FB03',description:'กุ้งขาวต้ม ไว้หาง พร้อมทาน',slug:'shrimp-cooked',image:placeholder('กุ้งขาวต้มไว้หาง','🦐','#e0f2fe')},
  {id:5004,name:'กุ้งแม่น้ำ 7 ตัว (1 แถม 1) 500 กรัม',price:240,unit:'แพ็ค 500 กรัม',category:'กุ้ง',sku:'FB04',description:'กุ้งแม่น้ำ 7 ตัว/แพ็ค',slug:'river-prawn',image:placeholder('กุ้งแม่น้ำ','🦐','#e0f2fe')},
  {id:5005,name:'ดอลลี่หั่น ไม่ติดท้อง Nw.60% 1 กก.',price:43,unit:'แพ็ค 1 กก.',category:'ปลา',sku:'FB05',description:'ปลาดอลลี่หั่น Nw60%',slug:'dolly-cut',image:placeholder('ดอลลี่หั่น','🐟','#e2f7e1')},
  {id:5006,name:'ดอลลี่ตัว 3–4 ชิ้น Nw.70%',price:65,unit:'แพ็ค 1 กก.',category:'ปลา',sku:'FB06',description:'ดอลลี่ 3–4 ชิ้น/แพ็ค Nw70%',slug:'dolly-34',image:placeholder('ดอลลี่ 3–4 ชิ้น','🐟','#e2f7e1')},
  {id:5007,name:'น้ำจิ้มซีฟูดส์แม่กระบอก 150–160 ml',price:35,unit:'ขวด',category:'ซอส/น้ำจิ้ม',sku:'FB07',description:'น้ำจิ้มซีฟูดส์พรีเมี่ยม',slug:'seafood-sauce',image:placeholder('น้ำจิ้มซีฟูดส์','🧂','#fff7d6')},
  {id:5008,name:'น้ำจิ้มหวาน (สูตรแม่กระบอก) ขวดเล็ก',price:100,unit:'3 ขวด/แพ็ค',category:'ซอส/น้ำจิ้ม',sku:'FB08',description:'น้ำจิ้มหวาน แพ็ค 3',slug:'sweet-chili',image:placeholder('น้ำจิ้มหวาน','🧂','#fff7d6')},
  {id:5009,name:'น้ำปลากวน 250 ml (4 ขวด 100)',price:100,unit:'4 ขวด/แพ็ค',category:'ซอส/น้ำจิ้ม',sku:'FB09',description:'น้ำปลากวน 250ml เซต',slug:'fish-sauce',image:placeholder('น้ำปลากวน','🧂','#fff7d6')},
  {id:5010,name:'พริกแกงกาญ เขียวหวาน 500 กรัม',price:65,unit:'แพ็ค 500 กรัม',category:'พริกแกง',sku:'FB10',description:'พริกแกงเขียวหวาน',slug:'green-curry-paste',image:placeholder('พริกแกงเขียวหวาน','🥣','#ffe4f1')}
];

@Injectable({ providedIn: 'root' })
export class ProductService {
  products = signal<Product[]>(this.load());

  private load(): Product[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return SEED;
  }
  private save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.products())); } catch {}
  }

  list() { return this.products(); }
  categories(): string[] { return Array.from(new Set(this.products().map(p => p.category))).sort(); }
  add(p: Omit<Product, 'id'>) {
    const nextId = Math.max(0, ...this.products().map(x=>x.id)) + 1;
    this.products.set([{ id: nextId, ...p }, ...this.products()]);
    this.save();
  }
  update(id: number, patch: Partial<Product>) {
    this.products.set(this.products().map(p => p.id===id ? { ...p, ...patch, id: p.id } : p));
    this.save();
  }
  remove(id: number) {
    this.products.set(this.products().filter(p => p.id !== id));
    this.save();
  }
  resetToSeed() { this.products.set(SEED); this.save(); }
}
