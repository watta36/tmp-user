import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService, Product } from './product.service';

@Component({
  standalone: true,
  selector: 'app-shop',
  imports: [CommonModule],
  template: `
  <section class="container hero hero-shop hero-cart">
    <div class="hero-panel hero-panel--wide">
      <div class="hero-panel-row">
        <div>
          <p class="small label">จำนวนสินค้าในตะกร้า</p>
          <div class="hero-number">{{ cartCount() }} ชิ้น</div>
        </div>
        <div>
          <p class="small label">ยอดรวมโดยประมาณ</p>
          <div class="hero-number">{{ cartTotal() | number:'1.0-0' }} ฿</div>
        </div>
      </div>
      <button class="btn primary wide" (click)="orderCart()" [disabled]="!cart().length">สั่งทั้งตะกร้าผ่าน LINE</button>
    </div>
  </section>

  <section class="container">
    <h2>ตะกร้าสินค้า</h2>
    <div *ngIf="!cart().length" class="small">ยังไม่มีสินค้าในตะกร้า</div>
    <div class="table-wrap" *ngIf="cart().length">
      <table class="table">
        <thead><tr><th>สินค้า</th><th>จำนวน</th><th>ราคา/หน่วย</th><th>รวม</th><th></th></tr></thead>
        <tbody>
          <tr *ngFor="let it of cart()">
            <td>{{ it.product.name }}</td>
            <td><input class="input qty-input" type="number" min="0" [value]="it.qty" (input)="updateQty(it.product, $any($event.target).valueAsNumber)"></td>
            <td>{{ it.product.price | number:'1.0-0' }} ฿</td>
            <td>{{ (it.product.price * it.qty) | number:'1.0-0' }} ฿</td>
            <td><button class="btn ghost" type="button" (click)="removeFromCart(it.product)">ลบ</button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div *ngIf="cart().length" class="cart-actions">
      <div class="small">ยอดรวม {{ cartTotal() | number:'1.0-0' }} ฿</div>
      <button class="btn primary" (click)="orderCart()">สั่งสินค้าทั้งตะกร้าผ่าน LINE</button>
    </div>
  </section>

  <section class="container" style="padding-top:8px">
    <div class="filter-card">
      <div class="catbar">
        <div class="catbtn" [class.active]="!activeCat()" (click)="selectCat('')">✨ ทั้งหมด</div>
        <ng-container *ngFor="let c of cats()">
          <div class="catbtn" [class.active]="activeCat() === c" (click)="selectCat(c)">{{ iconFor(c) }} {{ c }}</div>
        </ng-container>
      </div>
      <div class="toolbar">
        <input class="input" placeholder="ค้นหาเมนูหรือรหัสสินค้า..." [value]="q" (input)="updateQuery($any($event.target).value)">
        <select class="input" style="max-width:220px" [value]="sort" (change)="changeSort($any($event.target).value)">
          <option value="latest">เรียงล่าสุด</option>
          <option value="price-asc">ราคาต่ำ-สูง</option>
          <option value="price-desc">ราคาสูง-ต่ำ</option>
          <option value="name">ชื่อสินค้า (ก-ฮ)</option>
        </select>
        <select class="input" style="max-width:200px" [value]="pageSize()" (change)="changePageSize($any($event.target).value)">
          <option [value]="6">6 สินค้าต่อหน้า</option>
          <option [value]="9">9 สินค้าต่อหน้า</option>
          <option [value]="12">12 สินค้าต่อหน้า</option>
        </select>
      </div>
    </div>

    <div class="grid product-grid">
      <article class="card product-card" *ngFor="let p of pagedProducts()">
        <div class="product-media">
          <div class="product-img-frame">
            <img [src]="imgSrc(p)" [alt]="p.name" (click)="openDetail(p)" class="product-img">
          </div>
          <div class="gallery-pill" *ngIf="productImages(p).length > 1">{{ productImages(p).length }} รูป</div>
          <div class="sku-pill" *ngIf="p.sku">SKU {{ p.sku }}</div>
          <div class="tag">{{ iconFor(p.category) }} {{ p.category }}</div>
        </div>
        <div class="body product-body">
          <div class="product-top">
            <span class="pill-highlight">{{ iconFor(p.category) }} หมวด {{ p.category }}</span>
            <span class="pill-soft" *ngIf="p.sku">#{{ p.sku }}</span>
          </div>
          <div class="product-head">
            <div>
              <p class="eyebrow smallcaps">แนะนำ</p>
              <h3 class="product-name" (click)="openDetail(p)">{{ p.name }}</h3>
              <p class="muted product-desc">{{ p.description || 'พร้อมจัดส่งทันที สอบถามรายละเอียดเพิ่มเติมได้ทาง LINE' }}</p>
            </div>
            <div class="price-block">
              <div class="unit-price muted">{{ p.price | number:'1.0-0' }} ฿ / {{ p.unit }}</div>
            </div>
          </div>
          <div class="action-row">
            <button class="btn" (click)="addToCart(p,1)">เพิ่มตะกร้า</button>
            <button class="btn primary" (click)="orderSingle(p)">สั่งผ่าน LINE</button>
          </div>
        </div>
      </article>
    </div>

    <div class="pagination" *ngIf="filteredList().length > pageSize()">
      <button class="btn ghost" type="button" (click)="prevPage()" [disabled]="page() === 1">« หน้าก่อนหน้า</button>
      <div class="page-info">
        หน้า {{ page() }} / {{ totalPages() }} · แสดง {{ pageRangeStart() }}-{{ pageRangeEnd() }} จาก {{ filteredList().length }} รายการ
      </div>
      <button class="btn ghost" type="button" (click)="nextPage()" [disabled]="page() >= totalPages()">หน้าถัดไป »</button>
    </div>

    <p class="small" *ngIf="!filteredList().length">ไม่พบสินค้า</p>
  </section>

  <button class="floating-cart" type="button" (click)="toggleCartPanel()">
    <div class="floating-cart__icon">🛒</div>
    <div class="floating-cart__meta">
      <div class="floating-cart__count">{{ cartCount() }} ชิ้น</div>
      <div class="floating-cart__total">{{ cartTotal() | number:'1.0-0' }} ฿</div>
    </div>
  </button>

  <div class="cart-flyout" *ngIf="showCartPanel()">
    <div class="cart-flyout__backdrop" (click)="toggleCartPanel()"></div>
    <div class="cart-flyout__panel">
      <div class="cart-flyout__header">
        <div>
          <p class="smallcaps eyebrow">ตะกร้าสินค้า</p>
          <h3 class="cart-flyout__title">ตรวจสอบสินค้าทั้งหมด</h3>
        </div>
        <button class="btn ghost" type="button" (click)="toggleCartPanel()">ปิด</button>
      </div>
      <div class="cart-flyout__body" *ngIf="cart().length; else emptyCart">
        <div class="cart-flyout__list">
          <div class="cart-flyout__item" *ngFor="let it of cart()">
            <div>
              <div class="cart-flyout__name">{{ it.product.name }}</div>
              <div class="muted small">{{ it.product.price | number:'1.0-0' }} ฿ / {{ it.product.unit }}</div>
            </div>
            <div class="cart-flyout__controls">
              <input class="input qty-input" type="number" min="0" [value]="it.qty" (input)="updateQty(it.product, $any($event.target).valueAsNumber)">
              <div class="cart-flyout__line">{{ (it.product.price * it.qty) | number:'1.0-0' }} ฿</div>
              <button class="btn ghost" type="button" (click)="removeFromCart(it.product)">ลบ</button>
            </div>
          </div>
        </div>
      </div>
      <ng-template #emptyCart>
        <div class="muted small">ยังไม่มีสินค้าในตะกร้า</div>
      </ng-template>
      <div class="cart-flyout__footer">
        <div>
          <div class="muted small">รวมทั้งหมด</div>
          <div class="cart-flyout__sum">{{ cartTotal() | number:'1.0-0' }} ฿ ({{ cartCount() }} ชิ้น)</div>
        </div>
        <button class="btn primary" type="button" [disabled]="!cart().length" (click)="orderCart()">สั่งทั้งตะกร้าผ่าน LINE</button>
      </div>
    </div>
  </div>

  <div class="lightbox" *ngIf="detailProduct() as dp">
    <div class="lightbox__backdrop" (click)="closeDetail()"></div>
    <div class="lightbox__dialog">
      <button class="lightbox__close" type="button" (click)="closeDetail()">×</button>
      <div class="lightbox__media">
        <button class="lightbox__nav" type="button" (click)="prevImage()" aria-label="previous">‹</button>
        <img [src]="currentDetailImage()" [alt]="dp.name">
        <button class="lightbox__nav" type="button" (click)="nextImage()" aria-label="next">›</button>
      </div>
      <div class="lightbox__thumbs" *ngIf="productImages(dp).length > 1">
        <img *ngFor="let img of productImages(dp); let i = index" [src]="img" [alt]="dp.name" [class.active]="i === detailIndex()" (click)="detailIndex.set(i)">
      </div>
      <div class="lightbox__info">
        <div>
          <p class="smallcaps eyebrow">{{ iconFor(dp.category) }} {{ dp.category }}</p>
          <h3>{{ dp.name }}</h3>
          <p class="muted">{{ dp.description || 'รายละเอียดสินค้า' }}</p>
        </div>
        <div class="price-block">
          <div class="unit muted">{{ dp.price | number:'1.0-0' }} ฿ / {{ dp.unit }}</div>
        </div>
      </div>
    </div>
  </div>
  `
})
export class ShopComponent {
  q = '';
  sort: 'latest' | 'price-asc' | 'price-desc' | 'name' = 'latest';
  activeCat = signal<string>('');
  page = signal(1);
  pageSize = signal(9);
  showCartPanel = signal(false);
  cart = signal<{product: Product; qty: number}[]>(JSON.parse(localStorage.getItem('tmp_cart')||'[]'));
  detailProduct = signal<Product | null>(null);
  detailIndex = signal(0);

  constructor(public ps: ProductService){}

  cats = computed(() => this.ps.categories());
  imgSrc(p: Product){ return this.productImages(p)[0] || ''; }
  productImages(p: Product){ return (p.images && p.images.length ? p.images : (p.image ? [p.image] : [])).filter(Boolean); }

  updateQuery(value: string){
    this.q = (value || '').toString();
    this.page.set(1);
  }
  changeSort(value: 'latest' | 'price-asc' | 'price-desc' | 'name'){
    this.sort = value;
    this.page.set(1);
  }
  changePageSize(value: number){
    const parsed = Math.max(1, Number(value) || this.pageSize());
    this.pageSize.set(parsed);
    this.page.set(1);
  }

  selectCat(c: string){ this.activeCat.set(c); this.page.set(1); }
  iconFor(c: string){
    const t = (c||'').toLowerCase();
    if(t.includes('กุ้ง')||t.includes('shrimp')) return '🦐';
    if(t.includes('ปลา')||t.includes('fish')||t.includes('แซลมอน')) return '🐟';
    if(t.includes('ซอส')||t.includes('น้ำจิ้ม')||t.includes('sauce')) return '🧂';
    if(t.includes('พริกแกง')||t.includes('curry')) return '🥣';
    return '📦';
  }

  filteredList() {
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

  pagedProducts() {
    const products = this.filteredList();
    const totalPages = this.totalPages();
    const currentPage = Math.min(Math.max(this.page(), 1), totalPages || 1);
    if (currentPage !== this.page()) this.page.set(currentPage);
    const start = (currentPage - 1) * this.pageSize();
    return products.slice(start, start + this.pageSize());
  }

  totalPages(){
    const total = Math.ceil(this.filteredList().length / this.pageSize());
    return Math.max(total || 0, 1);
  }
  nextPage(){ if (this.page() < this.totalPages()) this.page.set(this.page() + 1); }
  prevPage(){ if (this.page() > 1) this.page.set(this.page() - 1); }
  pageRangeStart(){
    const totalItems = this.filteredList().length;
    if (!totalItems) return 0;
    return (this.page() - 1) * this.pageSize() + 1;
  }
  pageRangeEnd(){
    const totalItems = this.filteredList().length;
    if (!totalItems) return 0;
    return Math.min(totalItems, this.pageRangeStart() + this.pageSize() - 1);
  }

  toggleCartPanel(){ this.showCartPanel.set(!this.showCartPanel()); }

  addToCart(p: Product, qty: number){
    const bag = this.cart().slice();
    const found = bag.find(i => i.product.id === p.id);
    if (found) found.qty += qty; else bag.push({product: p, qty});
    this.cart.set(bag); this.saveCart();
  }
  removeFromCart(p: Product){
    const bag = this.cart().filter(i => i.product.id !== p.id);
    this.cart.set(bag);
    this.saveCart();
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
  openDetail(p: Product){
    this.detailProduct.set(p);
    this.detailIndex.set(0);
  }
  closeDetail(){ this.detailProduct.set(null); }
  currentDetailImage(){
    const p = this.detailProduct();
    if (!p) return '';
    const imgs = this.productImages(p);
    return imgs[this.detailIndex()] || imgs[0] || '';
  }
  nextImage(){
    const p = this.detailProduct();
    if (!p) return;
    const imgs = this.productImages(p);
    if (!imgs.length) return;
    this.detailIndex.set((this.detailIndex() + 1) % imgs.length);
  }
  prevImage(){
    const p = this.detailProduct();
    if (!p) return;
    const imgs = this.productImages(p);
    if (!imgs.length) return;
    this.detailIndex.set((this.detailIndex() - 1 + imgs.length) % imgs.length);
  }
  openLine(text: string){
    const LINE_ID = '@thanan.pf';
    const url = `https://line.me/R/oaMessage/${encodeURIComponent(LINE_ID)}/?${encodeURIComponent(text)}`;
    (window as any).location.href = url;
  }

  cartCount(){ return this.cart().reduce((sum, it) => sum + it.qty, 0); }
  cartTotal(){ return this.cart().reduce((sum, it) => sum + (it.product.price * it.qty), 0); }
}
