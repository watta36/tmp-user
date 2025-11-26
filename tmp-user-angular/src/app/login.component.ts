import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';
import { APP_CONFIG } from './config';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [`
    .error {
      color: #b91c1c;
      margin-top: 8px;
    }
  `],
  template: `
  <section class="container admin-shell">
    <header class="admin-hero">
      <div>
        <p class="eyebrow">Store Console</p>
        <h2 style="margin:6px 0 4px">Login</h2>
        <p class="muted">เข้าสู่ระบบก่อนเข้าสู่ส่วนหลังร้าน</p>
      </div>
      <div class="admin-badge">จำกัดเฉพาะผู้ดูแล</div>
    </header>

    <div class="panel admin-card">
      <div class="panel-header">
        <div>
          <p class="eyebrow">เข้าสู่ระบบ</p>
          <h3 style="margin:4px 0 6px">ล็อกอินผู้ดูแล</h3>
          <p class="muted">ใช้บัญชีที่กำหนดไว้ใน <code>src/app/config.ts</code> เพื่อเข้าจัดการสินค้า</p>
        </div>
        <div class="pill pill-ghost">จำกัดเฉพาะผู้ดูแล</div>
      </div>
      <div class="form-grid two-col">
        <div><label class="small">Username</label><input class="input" [(ngModel)]="username" placeholder="admin"></div>
        <div><label class="small">Password</label><input class="input" [(ngModel)]="password" type="password" placeholder="1234"></div>
      </div>
      <div class="admin-login-actions">
        <button class="btn primary wide" (click)="doLogin()">Login</button>
        <span class="small">* รองรับการใช้งานบนมือถือและเดสก์ท็อป</span>
      </div>
      <p class="error" *ngIf="error">{{ error }}</p>
      <div class="admin-login-actions">
        <a class="btn ghost wide" routerLink="/">กลับหน้าร้าน</a>
      </div>
    </div>
  </section>
  `
})
export class LoginComponent {
  username = '';
  password = '';
  error = '';
  adminPath = APP_CONFIG.adminPath;

  constructor(private auth: AuthService, private router: Router, private route: ActivatedRoute) {}

  doLogin() {
    this.error = '';
    const ok = this.auth.login(this.username.trim(), this.password);
    if (ok) {
      const target = this.route.snapshot.queryParamMap.get('redirectTo') || `/${this.adminPath}`;
      this.router.navigateByUrl(target);
      return;
    }
    this.error = 'เข้าสู่ระบบไม่สำเร็จ ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
  }
}
