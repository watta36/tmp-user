import { Component, computed } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
  <nav class="nav">
    <div class="brand">TMP Shop (Angular)</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <a class="btn" routerLink="/">ร้านค้า</a>
      <a class="btn" routerLink="/admin">Admin</a>
    </div>
  </nav>
  <router-outlet></router-outlet>
  <footer class="footer container small">
    © 2025 tmp-user — demo shop with admin CRUD
  </footer>
  `
})
export class AppComponent {
  constructor(public auth: AuthService){}
}
