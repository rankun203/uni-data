export class MemoryCache {
  private cache: Map<string, { value: any; expires: number }>;

  constructor() {
    this.cache = new Map();
  }

  set(key: string, value: any, expiresInSeconds: number): void {
    const expires = Date.now() + expiresInSeconds * 1000;
    this.cache.set(key, { value, expires });
  }

  get(key: string, defaultValue: any = null): any {
    const item = this.cache.get(key);
    if (item && Date.now() < item.expires) {
      return item.value;
    } else {
      return defaultValue;
    }
  }
}
