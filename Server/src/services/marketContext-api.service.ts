const BASE_URL = "https://finnhub.io/api/v1";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// ---------- TYPES ---------- //

export interface MarketStatus {
  exchange: string;
  holiday: string | null;
  isOpen: boolean;
  session: string;
  timezone: string;
}

export interface EarningsEvent {
  symbol: string;
  date: string;
  epsActual?: number;
  epsEstimate?: number;
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  sector: string;
}

export interface MarketNews {
  headline: string;
  source: string;
  datetime: number;
  url: string;
  summary: string;
}

// ---------- SERVICE ---------- //

export class MarketContextAPIService {
  private apiKey: string;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private CACHE_TTL = 5 * 60 * 1000; // 5 min

  constructor() {
    if (!process.env.FINNHUB_API_KEY) {
      throw new Error("FINNHUB_API_KEY is not set");
    }
    this.apiKey = process.env.FINNHUB_API_KEY;
  }

  // ---------- FETCH WITH RETRY + SAFE PARSE ---------- //
  private async fetchWithRetry(url: string, retries = 2): Promise<any> {
    for (let i = 0; i <= retries; i++) {
      try {
        const res = await fetch(url);

        if (!res.ok) {
          throw new Error(`HTTP Error: ${res.status}`);
        }

        const text = await res.text();

        // Prevent HTML crash (your earlier error)
        if (text.startsWith("<!DOCTYPE")) {
          throw new Error("Finnhub returned HTML instead of JSON");
        }

        return JSON.parse(text);
      } catch (err) {
        if (i === retries) {
          console.error("Finnhub API failed:", err);
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

    url.searchParams.append("token", this.apiKey);

    return url.toString();
  }

  // ---------- 1. MARKET STATUS ---------- //
  async getMarketStatus(exchange: string = "US"): Promise<MarketStatus> {
    const cacheKey = `market_status_${exchange}`;

    const cached = this.getCache<MarketStatus>(cacheKey);
    if (cached) return cached;

    const url = this.buildUrl("stock/market-status", { exchange });
    const data = await this.fetchWithRetry(url);

    const parsed: MarketStatus = {
      exchange: data.exchange,
      holiday: data.holiday || null,
      isOpen: data.isOpen,
      session: data.session,
      timezone: data.timezone,
    };

    this.setCache(cacheKey, parsed);
    return parsed;
  }

  // ---------- 2. EARNINGS CALENDAR ---------- //
  async getEarningsCalendar(
    from: string,
    to: string
  ): Promise<EarningsEvent[]> {
    const cacheKey = `earnings_${from}_${to}`;

    const cached = this.getCache<EarningsEvent[]>(cacheKey);
    if (cached) return cached;

    const url = this.buildUrl("calendar/earnings", { from, to });
    const data = await this.fetchWithRetry(url);

    const parsed: EarningsEvent[] = (data.earningsCalendar || []).map(
      (item: any) => ({
        symbol: item.symbol,
        date: item.date,
        epsActual: item.epsActual,
        epsEstimate: item.epsEstimate,
      })
    );

    this.setCache(cacheKey, parsed);
    return parsed;
  }

  // ---------- 3. COMPANY PROFILE (SECTOR SOURCE) ---------- //
  async getCompanyProfile(symbol: string): Promise<CompanyProfile> {
    const cacheKey = `profile_${symbol}`;

    const cached = this.getCache<CompanyProfile>(cacheKey);
    if (cached) return cached;

    const url = this.buildUrl("stock/profile2", { symbol });
    const data = await this.fetchWithRetry(url);

    const parsed: CompanyProfile = {
      symbol: data.ticker,
      name: data.name,
      sector: data.finnhubIndustry,
    };

    this.setCache(cacheKey, parsed);
    return parsed;
  }

  // ---------- 4. MULTIPLE PROFILES (IMPORTANT FOR PORTFOLIO) ---------- //
  async getMultipleProfiles(
    symbols: string[]
  ): Promise<Record<string, CompanyProfile>> {
    const results: Record<string, CompanyProfile> = {};

    await Promise.all(
      symbols.map(async (symbol) => {
        const profile = await this.getCompanyProfile(symbol);
        results[symbol] = profile;
      })
    );

    return results;
  }

  // ---------- 5. MARKET NEWS ---------- //
  async getMarketNews(): Promise<MarketNews[]> {
    const cacheKey = "market_news";

    const cached = this.getCache<MarketNews[]>(cacheKey);
    if (cached) return cached;

    const url = this.buildUrl("news", { category: "general" });
    const data = await this.fetchWithRetry(url);

    const parsed: MarketNews[] = data.map((item: any) => ({
      headline: item.headline,
      source: item.source,
      datetime: item.datetime,
      url: item.url,
      summary: item.summary,
    }));

    this.setCache(cacheKey, parsed);
    return parsed;
  }

  // ---------- 6. COMPANY NEWS ---------- //
  async getCompanyNews(
    symbol: string,
    from: string,
    to: string
  ): Promise<MarketNews[]> {
    const cacheKey = `company_news_${symbol}_${from}_${to}`;

    const cached = this.getCache<MarketNews[]>(cacheKey);
    if (cached) return cached;

    const url = this.buildUrl("company-news", {
      symbol,
      from,
      to,
    });

    const data = await this.fetchWithRetry(url);

    const parsed: MarketNews[] = data.map((item: any) => ({
      headline: item.headline,
      source: item.source,
      datetime: item.datetime,
      url: item.url,
      summary: item.summary,
    }));

    this.setCache(cacheKey, parsed);
    return parsed;
  }
}