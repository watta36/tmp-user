import { Injectable, signal } from '@angular/core';
import { APP_CONFIG } from './config';

const KEY = 'tmp_admin_authed';

@Injectable({ providedIn: 'root' })
export class AuthService {
  authed = signal<boolean>(this.read());

  private read(){ try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; } }
  private write(v:boolean){ try { sessionStorage.setItem(KEY, v ? '1' : '0'); } catch {} }

  login(user:string, pass:string){
    const ok = (user === APP_CONFIG.adminUser && pass === APP_CONFIG.adminPass);
    this.authed.set(ok);
    this.write(ok);
    return ok;
  }
  logout(){ this.authed.set(false); this.write(false); }
}
