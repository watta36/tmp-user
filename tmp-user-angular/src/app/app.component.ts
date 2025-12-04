import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './auth.service';
import { APP_CONFIG } from './config';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
  <nav class="nav">
    <div class="container nav__inner">
      <div class="nav__brand">
        <div class="brand-mark">TN</div>
        <div>
          <div class="brand">THANAN PROFOODS</div>
          <div class="nav__subtitle">ค้าส่งอาหารแช่แข็งราคาส่ง</div>
        </div>
      </div>
      <div class="nav__links">
        <a class="nav__link" routerLink="/">หน้าร้าน</a>
        <ng-template #authedLinks>
          <button type="button" class="nav__link nav__button" (click)="logout()">ออกจากระบบ</button>
        </ng-template>
      </div>
    </div>
  </nav>
  <router-outlet></router-outlet>
  <footer class="footer container small">
    © 2025 tmp-user — demo shop with hidden admin
  </footer>
  `
})
export class AppComponent {
  adminPath = APP_CONFIG.adminPath;
  constructor(public auth: AuthService) {}

  logout() { this.auth.logout(); }
}
