import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Product } from './product.service';

export type KvState = {
  products: Product[];
  categories: string[];
};

@Injectable({ providedIn: 'root' })
export class KvStoreService {
  private http = inject(HttpClient);
  private baseUrl = '';

  loadState(): Observable<KvState> {
    return this.http.get<KvState>(`${this.baseUrl}/api/kv-products`);
  }

  saveState(products: Product[], categories: string[]): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.baseUrl}/api/kv-products`, { products, categories });
  }
}
