import { Component, signal, computed } from '@angular/core';

type Product = { id:number; name:string; price:number; unit:string; category:string; sku?:string; description?:string; slug:string; image:string; };

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
  <nav class="nav">
    <div class="brand">TMP Shop (Angular)</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <a class="btn" href="#/">ร้านค้า</a>
      <a class="btn" href="#/cart">ตะกร้า <span class="badge" style="margin-left:6px">{{ cartCount() }}</span></a>
      <button class="btn primary" (click)="openLineWithCart()">สั่งผ่าน LINE</button>
    </div>
  </nav>

  <section class="container" style="padding-top:12px">
    <div class="catbar">
      <div class="catbtn" [class.active]="!activeCat()" (click)="selectCat('')">✨ ทั้งหมด</div>
      <ng-container *ngFor="let c of cats()">
        <div class="catbtn" [class.active]="activeCat() === c" (click)="selectCat(c)">{{ iconFor(c) }} {{ c }}</div>
      </ng-container>
    </div>
  </section>

  <section class="container">
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px">
      <input class="input" placeholder="ค้นหา..." (input)="q = ($any($event.target).value || '').toString()">
      <select class="input" style="max-width:220px" (change)="sort = $any($event.target).value">
        <option value="latest">ล่าสุด</option>
        <option value="price-asc">ราคาต่ำ-สูง</option>
        <option value="price-desc">ราคาสูง-ต่ำ</option>
        <option value="name">ชื่อสินค้า (ก-ฮ)</option>
      </select>
    </div>

    <div class="grid">
      <article class="card" *ngFor="let p of filtered()">
        <img [src]="p.image" [alt]="p.name" (click)="openDetail(p)" style="cursor:pointer">
        <div class="body">
          <strong style="cursor:pointer" (click)="openDetail(p)">{{ p.name }}</strong>
          <div class="small">{{ p.category }} <ng-container *ngIf="p.sku">• SKU: {{ p.sku }}</ng-container></div>
          <div class="price">{{ p.price | number:'1.0-0' }} ฿ <span class="small">/ {{ p.unit }}</span></div>
          <div style="display:flex;gap:8px">
            <button class="btn" (click)="addToCart(p,1)">เพิ่มตะกร้า</button>
            <button class="btn primary" (click)="orderSingle(p)">สั่งผ่าน LINE</button>
          </div>
        </div>
      </article>
    </div>

    <p class="small" *ngIf="!filtered().length">ไม่พบสินค้า</p>
  </section>

  <section class="container">
    <h2>ตะกร้าสินค้า</h2>
    <div *ngIf="!cart().length" class="small">ยังไม่มีสินค้าในตะกร้า</div>
    <table class="table" *ngIf="cart().length">
      <thead><tr><th>สินค้า</th><th>จำนวน</th><th>ราคา/หน่วย</th><th>รวม</th></tr></thead>
      <tbody>
        <tr *ngFor="let it of cart()">
          <td>{{ it.product.name }}</td>
          <td><input class="input" type="number" min="0" [value]="it.qty" (input)="updateQty(it.product, $any($event.target).valueAsNumber)" style="width:90px"></td>
          <td>{{ it.product.price | number:'1.0-0' }} ฿</td>
          <td>{{ (it.product.price * it.qty) | number:'1.0-0' }} ฿</td>
        </tr>
      </tbody>
    </table>
  </section>

  <footer class="footer container small">
    © 2025 tmp-user (Angular 20). Local-only demo with LINE checkout link.
  </footer>
  `
})
export class AppComponent {
  seed: Product[] = [
    {id:5001,name:'กุ้งขาวแกะ 61/70 nw80% 1 กก.',price:210,unit:'แพ็ค 1 กก.',category:'กุ้ง',sku:'FB01',description:'กุ้งขาวแกะ ขนาด 61/70 ประมาณ 110–125 ตัว/กก. (nw80%)',slug:'shrimp-6170',image:'https://source.unsplash.com/featured/?peeled%20shrimp%20seafood'},
    {id:5002,name:'กุ้งแชบ๊วยหักหัว ไซส์รวม 2 กก.',price:199,unit:'แพ็ค 2 กก.',category:'กุ้ง',sku:'FB02',description:'กุ้งแชบ๊วยหักหัว ไซส์รวม เหมาะทำผัด/ทอด',slug:'shrimp-mixed',image:'https://source.unsplash.com/featured/?raw%20shrimp%20heap%20seafood'},
    {id:5003,name:'กุ้งขาว 41/50 ต้ม ไว้หาง 500 กรัม',price:130,unit:'แพ็ค 500 กรัม',category:'กุ้ง',sku:'FB03',description:'กุ้งขาวต้ม ไว้หาง พร้อมทาน',slug:'shrimp-cooked',image:'https://source.unsplash.com/featured/?cooked%20shrimp%20tail%20on'},
    {id:5004,name:'กุ้งแม่น้ำ 7 ตัว (1 แถม 1) 500 กรัม',price:240,unit:'แพ็ค 500 กรัม',category:'กุ้ง',sku:'FB04',description:'กุ้งแม่น้ำ 7 ตัว/แพ็ค',slug:'river-prawn',image:'https://source.unsplash.com/featured/?river%20prawn%20raw'},
    {id:5005,name:'ดอลลี่หั่น ไม่ติดท้อง Nw.60% 1 กก.',price:43,unit:'แพ็ค 1 กก.',category:'ปลา',sku:'FB05',description:'ปลาดอลลี่หั่น Nw60%',slug:'dolly-cut',image:'https://source.unsplash.com/featured/?white%20fish%20fillet'},
    {id:5006,name:'ดอลลี่ตัว 3–4 ชิ้น Nw.70%',price:65,unit:'แพ็ค 1 กก.',category:'ปลา',sku:'FB06',description:'ดอลลี่ 3–4 ชิ้น/แพ็ค Nw70%',slug:'dolly-34',image:'https://source.unsplash.com/featured/?fish%20fillet%20pack'},
    {id:5007,name:'น้ำจิ้มซีฟูดส์แม่กระบอก 150–160 ml',price:35,unit:'ขวด',category:'ซอส/น้ำจิ้ม',sku:'FB07',description:'น้ำจิ้มซีฟูดส์พรีเมี่ยม',slug:'seafood-sauce',image:'https://source.unsplash.com/featured/?seafood%20sauce%20bottle'},
    {id:5008,name:'น้ำจิ้มหวาน (สูตรแม่กระบอก) ขวดเล็ก',price:100,unit:'3 ขวด/แพ็ค',category:'ซอส/น้ำจิ้ม',sku:'FB08',description:'น้ำจิ้มหวาน แพ็ค 3',slug:'sweet-chili',image:'https://source.unsplash.com/featured/?sweet%20chili%20sauce%20bottle'},
    {id:5009,name:'น้ำปลากวน 250 ml (4 ขวด 100)',price:100,unit:'4 ขวด/แพ็ค',category:'ซอส/น้ำจิ้ม',sku:'FB09',description:'น้ำปลากวน 250ml เซต',slug:'fish-sauce',image:'https://source.unsplash.com/featured/?fish%20sauce%20bottle'},
    {id:5010,name:'พริกแกงกาญ เขียวหวาน 500 กรัม',price:65,unit:'แพ็ค 500 กรัม',category:'พริกแกง',sku:'FB10',description:'พริกแกงเขียวหวาน',slug:'green-curry-paste',image:'https://source.unsplash.com/featured/?thai%20green%20curry%20paste'}
  ];

  q = '';
  sort: 'latest' | 'price-asc' | 'price-desc' | 'name' = 'latest';
  activeCat = signal<string>('');
  cart = signal<{product: Product; qty: number}[]>(JSON.parse(localStorage.getItem('tmp_cart')||'[]'));
  cats = computed(() => Array.from(new Set(this.seed.map(p => p.category))).sort());
  cartCount = computed(() => this.cart().reduce((s, i) => s + i.qty, 0));

  filtered() {
    let list = this.seed.filter(p => (p.name + ' ' + (p.description||'')).toLowerCase().includes(this.q.toLowerCase()));
    if (this.activeCat()) list = list.filter(p => p.category === this.activeCat());
    switch (this.sort) {
      case 'price-asc': list.sort((a,b) => a.price - b.price); break;
      case 'price-desc': list.sort((a,b) => b.price - a.price); break;
      case 'name': list.sort((a,b) => a.name.localeCompare(b.name, 'th')); break;
      default: list.sort((a,b) => b.id - a.id);
    }
    return list;
  }
  selectCat(c: string){ this.activeCat.set(c); }
  addToCart(p: Product, qty: number){
    const bag = this.cart().slice();
    const found = bag.find(i => i.product.id === p.id);
    if (found) found.qty += qty; else bag.push({product: p, qty});
    this.cart.set(bag); this.saveCart();
  }
  updateQty(p: Product, qty: number){
    const n = Math.max(0, qty||0);
    let bag = this.cart().slice();
    const it = bag.find(i => i.product.id === p.id);
    if (!it) return;
    it.qty = n;
    bag = bag.filter(i => i.qty > 0);
    this.cart.set(bag); this.saveCart();
  }
  clearCart(){ this.cart.set([]); this.saveCart(); }
  saveCart(){ localStorage.setItem('tmp_cart', JSON.stringify(this.cart())); }

  iconFor(c: string){
    const t = (c||'').toLowerCase();
    if(t.includes('กุ้ง')||t.includes('shrimp')) return '🦐';
    if(t.includes('ปลา')||t.includes('fish')||t.includes('แซลมอน')) return '🐟';
    if(t.includes('ซอส')||t.includes('น้ำจิ้ม')||t.includes('sauce')) return '🧂';
    if(t.includes('พริกแกง')||t.includes('curry')) return '🥣';
    return '📦';
  }

  openLineWithCart(){
    if(!this.cart().length){ alert('ตะกร้าว่าง'); return; }
    const msg = this.cart().map(i => `- ${i.product.name} x ${i.qty} (${i.product.price}฿/${i.product.unit})`).join('\n');
    const total = this.cart().reduce((s,i)=>s+i.qty*i.product.price,0);
    this.openLine(`สั่งซื้อสินค้า\n${msg}\nยอดรวมประมาณ: ${total} บาท`);
  }
  orderSingle(p: Product){ this.openLine(`สั่งซื้อสินค้า: ${p.name} จำนวน 1 ${p.unit}`); }
  openDetail(p: Product){ alert(`${p.name}\nราคา ${p.price} ฿/${p.unit}\n${p.description||''}`); }
  openLine(text: string){
    const LINE_ID = '@saji.sunmarine';
    const url = `https://line.me/R/oaMessage/${encodeURIComponent(LINE_ID)}/?${encodeURIComponent(text)}`;
    (window as any).location.href = url;
  }
}
