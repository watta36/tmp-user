import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Routes, withInMemoryScrolling } from '@angular/router';
import { AppComponent } from './app/app.component';
import { ShopComponent } from './app/shop.component';
import { AdminComponent } from './app/admin.component';
import { LoginComponent } from './app/login.component';
import { AuthGuard } from './app/auth.guard';
import { APP_CONFIG } from './app/config';

const routes: Routes = [
  { path: '', component: ShopComponent },
  { path: 'login', component: LoginComponent },
  { path: APP_CONFIG.adminPath, component: AdminComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '' }
];

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled' })),
    provideHttpClient()
  ]
}).catch(err => console.error(err));
