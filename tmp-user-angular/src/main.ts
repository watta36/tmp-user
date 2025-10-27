import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Routes, withInMemoryScrolling } from '@angular/router';
import { AppComponent } from './app/app.component';
import { ShopComponent } from './app/shop.component';
import { AdminComponent } from './app/admin.component';

const routes: Routes = [
  { path: '', component: ShopComponent },
  { path: 'admin', component: AdminComponent },
  { path: '**', redirectTo: '' }
];

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled' }))
  ]
}).catch(err => console.error(err));
