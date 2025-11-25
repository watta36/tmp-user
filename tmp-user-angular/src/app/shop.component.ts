import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService, Product } from './product.service';

@Component({
  standalone: true,
  selector: 'app-shop',
  imports: [CommonModule],
  template: `
  <section class="container" style="padding-top:12px">
    <div class="catbar">
      <div class="catbtn" [class.active]="!activeCat()" (click)="selectCat('')">✨ ทั้งหมด</div>
      <ng-container *ngFor="let c of cats()">
        <div class="catbtn" [class.active]="activeCat() === c" (click)="selectCat(c)">{{ iconFor(c) }} {{ c }}</div>
      </ng-container>
    </div>
  </section>

  <section class="container">
    <div class="toolbar">
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
        <img [src]="imgSrc(p)" [alt]="p.name" (click)="openDetail(p)" style="cursor:pointer">
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
    <div class="table-wrap" *ngIf="cart().length">
      <table class="table">
        <thead><tr><th>สินค้า</th><th>จำนวน</th><th>ราคา/หน่วย</th><th>รวม</th></tr></thead>
        <tbody>
          <tr *ngFor="let it of cart()">
            <td>{{ it.product.name }}</td>
            <td><input class="input qty-input" type="number" min="0" [value]="it.qty" (input)="updateQty(it.product, $any($event.target).valueAsNumber)"></td>
            <td>{{ it.product.price | number:'1.0-0' }} ฿</td>
            <td>{{ (it.product.price * it.qty) | number:'1.0-0' }} ฿</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div *ngIf="cart().length" class="cart-actions">
      <div class="small">ยอดรวม {{ cartTotal() | number:'1.0-0' }} ฿</div>
      <button class="btn primary" (click)="orderCart()">สั่งสินค้าทั้งตะกร้าผ่าน LINE</button>
    </div>
  </section>
  `
})
export class ShopComponent {
  q = '';
  sort: 'latest' | 'price-asc' | 'price-desc' | 'name' = 'latest';
  activeCat = signal<string>('');
  cart = signal<{product: Product; qty: number}[]>(JSON.parse(localStorage.getItem('tmp_cart')||'[]'));

  constructor(public ps: ProductService){}

  cats = computed(() => this.ps.categories());
  imgSrc(p: Product){ return p.image || ''; }

  selectCat(c: string){ this.activeCat.set(c); }
  iconFor(c: string){
    const t = (c||'').toLowerCase();
    if(t.includes('กุ้ง')||t.includes('shrimp')) return '🦐';
    if(t.includes('ปลา')||t.includes('fish')||t.includes('แซลมอน')) return '🐟';
    if(t.includes('ซอส')||t.includes('น้ำจิ้ม')||t.includes('sauce')) return '🧂';
    if(t.includes('พริกแกง')||t.includes('curry')) return '🥣';
    return '📦';
  }

  filtered() {
    let list = this.ps.list().filter(p => (p.name + ' ' + (p.description||'')).toLowerCase().includes(this.q.toLowerCase()));
    if (this.activeCat()) list = list.filter(p => p.category === this.activeCat());
    switch (this.sort) {
      case 'price-asc': list.sort((a,b) => a.price - b.price); break;
      case 'price-desc': list.sort((a,b) => b.price - a.price); break;
      case 'name': list.sort((a,b) => a.name.localeCompare(b.name, 'th')); break;
      default: list.sort((a,b) => b.id - a.id);
    }
    return list;
  }

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
  saveCart(){ localStorage.setItem('tmp_cart', JSON.stringify(this.cart())); }

  orderSingle(p: Product){ this.openLine(`สั่งซื้อสินค้า: ${p.name} จำนวน 1 ${p.unit}`); }
  orderCart(){
    const bag = this.cart();
    if (!bag.length) { alert('ยังไม่มีสินค้าในตะกร้า'); return; }
    const lines = bag.map(it => `- ${it.product.name} x ${it.qty} ${it.product.unit}`);
    const summary = `ยอดรวม ${this.cartTotal().toLocaleString('th-TH')} ฿`;
    this.openLine(`สั่งซื้อสินค้าทั้งตะกร้า:\n${lines.join('\n')}\n${summary}`);
  }
  openDetail(p: Product){ alert(`${p.name}\nราคา ${p.price} ฿/${p.unit}\n${p.description||''}`); }
  openLine(text: string){
    const LINE_ID = '@tmpseafood';
    const url = `https://line.me/R/oaMessage/${encodeURIComponent(LINE_ID)}/?${encodeURIComponent(text)}`;
    (window as any).location.href = url;
  }

  cartTotal(){ return this.cart().reduce((sum, it) => sum + (it.product.price * it.qty), 0); }
}
