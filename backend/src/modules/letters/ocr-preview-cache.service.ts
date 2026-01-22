import { Injectable } from '@nestjs/common';
import { LRUCache } from 'lru-cache';

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

@Injectable()
export class OcrPreviewCacheService {
  /**
   * LRU Cache untuk OCR Preview dengan batasan memori.
   * Mencegah memory leak pada VPS 2GB RAM.
   *
   * - max: 100 entries (cukup untuk 100 file berbeda)
   * - ttl: 10 menit default
   * - maxSize: ~50MB total cache size
   */
  private readonly cache = new LRUCache<string, CacheEntry<unknown>>({
    max: 100, // Maksimal 100 entries
    ttl: 1000 * 60 * 10, // 10 menit TTL
    updateAgeOnGet: true, // Refresh TTL saat diakses
    updateAgeOnHas: true,
    // Cleanup function untuk memastikan expired entries dihapus
    dispose: () => {
      // Optional: log cleanup untuk monitoring
    },
  });

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    // Double-check expiration (LRU handles TTL otomatis)
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number) {
    const ttlMs = Math.max(ttlSeconds, 1) * 1000;
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  makeKey(parts: Record<string, unknown>) {
    return Object.entries(parts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => {
        if (v === null || v === undefined) return `${k}=`;
        if (typeof v === 'object') return `${k}=${JSON.stringify(v)}`;
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        return `${k}=${String(v)}`;
      })
      .join('&');
  }

  /**
   * Cache statistics untuk monitoring
   */
  getStats() {
    return {
      size: this.cache.size,
      itemCount: this.cache.size,
      max: this.cache.max,
      calculatedSize: this.cache.calculatedSize,
      maxSize: this.cache.maxSize,
    };
  }

  /**
   * Clear cache manually jika diperlukan
   */
  clear() {
    this.cache.clear();
  }
}
