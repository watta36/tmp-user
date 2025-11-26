import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
  <nav class="nav">
    <div class="brand">TMP Shop</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <a class="btn" routerLink="/">ร้านค้า</a>
    </div>
  </nav>
  <router-outlet></router-outlet>
  <footer class="footer container small">
    © 2025 tmp-user — demo shop with hidden admin
  </footer>
  `
})
export class AppComponent {}
