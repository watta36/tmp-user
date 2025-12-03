import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Product } from './product.service';
import { APP_CONFIG } from './config';

export type KvState = {
  products: Product[];
  categories: string[];
  theme?: string;
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

  patchChanges(
    upserts: Product[],
    deleteIds: number[],
    categories: string[],
    theme: string,
  ): Observable<{ ok: boolean; version?: number; categories?: string[] }> {
    return this.http.post<{ ok: boolean; version?: number; categories?: string[] }>(`${this.baseUrl}/api/kv-products`, {
      action: 'patch',
      upserts,
      deleteIds,
      categories,
      theme,
    });
  }

  importChunk(
    products: Product[],
    options: { reset?: boolean; categories: string[]; theme: string },
  ): Observable<{ ok: boolean; imported: number; version?: number; categories?: string[]; theme?: string }> {
    return this.http.post<{ ok: boolean; imported: number; version?: number; categories?: string[]; theme?: string }>(
      `${this.baseUrl}/api/kv-products`,
      {
        action: 'importChunk',
        products,
        reset: options.reset,
        categories: options.categories,
        theme: options.theme,
      }
    );
  }
}
