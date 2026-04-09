const BASE_URL = "https://api.twelvedata.com";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class VolatilityAPIService {
  private apiKey: string;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private CACHE_TTL = 5 * 60 * 1000; // 5 min

  constructor() {
    if (!process.env.TWELVE_DATA_API_KEY) {
      throw new Error("TWELVE_DATA_API_KEY is not set");
    }
    this.apiKey = process.env.TWELVE_DATA_API_KEY;
  }

  // ---------- FETCH WITH RETRY ---------- //
  private async fetchWithRetry(url: string, retries = 2): Promise<any> {
    for (let i = 0; i <= retries; i++) {
      try {
        const res = await fetch(url);

        if (!res.ok) {
          throw new Error(`HTTP Error: ${res.status}`);
        }

        const data = await res.json();

        if (data.status === "error") {
          throw new Error(data.message);
        }

        return data;
      } catch (err) {
        if (i === retries) {
          console.error("VIX fetch failed:", err);
          throw err;
        }
      }
    }
  }

  // ---------- CACHE ---------- //
  private getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > this.CACHE_TTL;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache(key: string, data: any) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  // ---------- URL BUILDER ---------- //
  private buildUrl(endpoint: string, params: Record<string, any>) {
    const url = new URL(`${BASE_URL}/${endpoint}`);

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    url.searchParams.append("apikey", this.apiKey);

    return url.toString();
  }

  // ---------- GET VIX (LATEST) ---------- //
  async getVIX(): Promise<number> {
    const cacheKey = "vix_latest";

    const cached = this.getCache<number>(cacheKey);
    if (cached) return cached;

    const url = this.buildUrl("price", {
      symbol: "VIX",
    });

    const data = await this.fetchWithRetry(url);

    const price = parseFloat(data.price);

    this.setCache(cacheKey, price);

    return price;
  }

  // ---------- OPTIONAL: HISTORICAL VIX ---------- //
  async getVIXHistory(days: number = 100): Promise<number[]> {
    const cacheKey = `vix_history_${days}`;

    const cached = this.getCache<number[]>(cacheKey);
    if (cached) return cached;

    const url = this.buildUrl("time_series", {
      symbol: "VIX",
      interval: "1day",
      outputsize: days,
      order: "ASC",
    });

    const data = await this.fetchWithRetry(url);

    const prices: number[] = data.values.map((item: any) =>
      parseFloat(item.close)
    );

    this.setCache(cacheKey, prices);

    return prices;
  }
}