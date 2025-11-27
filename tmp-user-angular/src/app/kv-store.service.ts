import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Product } from './product.service';

export type KvState = {
  products: Product[];
  categories: string[];
  version?: number;
};

@Injectable({ providedIn: 'root' })
export class KvStoreService {
  private http = inject(HttpClient);
  private baseUrl = '';

  loadState(): Observable<KvState> {
    return this.http.get<KvState>(`${this.baseUrl}/api/kv-products`);
  }

  loadVersion(): Observable<{ version: number }> {
    return this.http.get<{ version: number }>(`${this.baseUrl}/api/kv-products`, { params: { versionOnly: true } });
  }

  saveState(products: Product[], categories: string[]): Observable<{ ok: boolean; version?: number }> {
    return this.http.post<{ ok: boolean; version?: number }>(`${this.baseUrl}/api/kv-products`, { products, categories });
  }

  applyChanges(products: Product[], categories: string[]): Observable<{ ok: boolean; version?: number }> {
    return this.http.post<{ ok: boolean; version?: number }>(`${this.baseUrl}/api/kv-products`, {
      action: 'apply',
      products,
      categories,
    });
  }
}
