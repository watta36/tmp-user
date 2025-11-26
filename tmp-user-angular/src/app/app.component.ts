import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
  <nav class="nav">
    <div class="container nav__inner">
      <div class="nav__brand">
        <div class="brand-mark">TMP</div>
        <div>
          <div class="brand">TMP Shop</div>
          <div class="nav__subtitle">อาหารทะเลและซอสพร้อมส่ง</div>
        </div>
      </div>
      <div class="nav__links">
        <a class="nav__link" routerLink="/">หน้าร้าน</a>
        <a class="nav__link" routerLink="/admin">หลังร้าน</a>
      </div>
    </div>
  </nav>
  <router-outlet></router-outlet>
  <footer class="footer container small">
    © 2025 tmp-user — demo shop with hidden admin
  </footer>
  `
})
export class AppComponent {}
