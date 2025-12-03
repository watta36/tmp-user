import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Product } from './product.service';
import { APP_CONFIG } from './config';

export type KvState = {
  products: Product[];
  categories: string[];
  version?: number;
};

@Injectable({ providedIn: 'root' })
export class KvStoreService {
  private http = inject(HttpClient);
  private baseUrl = (APP_CONFIG.apiBaseUrl || '').replace(/\/$/, '');

  loadState(): Observable<KvState> {
    return this.http.get<KvState>(`${this.baseUrl}/api/kv-products`);
  }

  loadVersion(): Observable<{ version: number }> {
    return this.http.get<{ version: number }>(`${this.baseUrl}/api/kv-products`, { params: { versionOnly: true } });
  }

  applyChanges(products: Product[], categories: string[]): Observable<{ ok: boolean; version?: number }> {
    return this.http.post<{ ok: boolean; version?: number }>(`${this.baseUrl}/api/kv-products`, {
      action: 'apply',
      products,
      categories,
    });
  }

  importCsv(csv: string): Observable<{ ok: boolean; products: Product[]; categories: string[]; version?: number }> {
    return this.http.post<{ ok: boolean; products: Product[]; categories: string[]; version?: number }>(`${this.baseUrl}/api/kv-products`, {
      csv,
      action: 'preview',
    });
  }
}
