/**
 * Local-currency display layer (spec §3b) — INDICATIVE only.
 *
 * The real charge currency + amount are handled by Stripe Adaptive Pricing at
 * checkout (local presentment, USD settlement). These figures are purely the
 * "shown in your local currency" indication on the marketing pages, so a
 * slightly stale rate is harmless. We NEVER hardcode FX: rates come from the
 * daily-cached /api/rates endpoint; the country comes from /api/geo. The user
 * can override via the switcher (persisted in localStorage). Everything falls
 * back to USD on VPN / unknown / network failure.
 */

import { useEffect, useState } from 'react';

export const SUPPORTED_CURRENCIES = ['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'NGN', 'INR', 'ZAR'] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number] | string;

const OVERRIDE_KEY = 'dita_currency';

let ratesCache: Record<string, number> | null = null;
let ratesPromise: Promise<Record<string, number>> | null = null;

async function fetchRates(): Promise<Record<string, number>> {
  if (ratesCache) return ratesCache;
  if (ratesPromise) return ratesPromise;
  ratesPromise = (async () => {
    try {
      const res = await fetch('/api/rates');
      const json = await res.json().catch(() => ({}));
      ratesCache = (json?.rates && typeof json.rates === 'object') ? json.rates : {};
    } catch {
      ratesCache = {};
    }
    return ratesCache!;
  })();
  return ratesPromise;
}

async function fetchGeoCurrency(): Promise<string> {
  try {
    const res = await fetch('/api/geo');
    const json = await res.json().catch(() => ({}));
    return typeof json?.currency === 'string' ? json.currency : 'USD';
  } catch {
    return 'USD';
  }
}

function readOverride(): string | null {
  try { return localStorage.getItem(OVERRIDE_KEY); } catch { return null; }
}
function writeOverride(c: string): void {
  try { localStorage.setItem(OVERRIDE_KEY, c); } catch { /* private mode */ }
}

/** Format a USD amount in the given currency at the given rate. Rounded to a
 *  tidy figure and prefixed "≈" because it is indicative, not the charge. */
export function formatIndicative(amountUsd: number, currency: string, rate: number): string {
  const raw = amountUsd * (rate || 1);
  // Whole numbers for high-denomination currencies, else 2 dp.
  const zeroDp = ['NGN', 'JPY', 'INR', 'ZAR', 'KES', 'GHS'].includes(currency);
  const value = zeroDp ? Math.round(raw) : Math.round(raw * 100) / 100;
  try {
    return '≈ ' + new Intl.NumberFormat(undefined, {
      style: 'currency', currency, maximumFractionDigits: zeroDp ? 0 : 2,
    }).format(value);
  } catch {
    return '≈ ' + value.toFixed(zeroDp ? 0 : 2) + ' ' + currency;
  }
}

export interface LocalCurrencyState {
  currency: string;
  rate: number;          // USD → currency multiplier (1 for USD)
  ready: boolean;        // true once geo + rates resolved (or fell back)
  isLocal: boolean;      // true when not USD
  setCurrency: (c: string) => void;
}

/** Resolve the display currency: localStorage override → geo → USD. */
export function useLocalCurrency(): LocalCurrencyState {
  const [currency, setCurrencyState] = useState<string>('USD');
  const [rate, setRate] = useState<number>(1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const override = readOverride();
      const detected = override || (await fetchGeoCurrency());
      const rates = await fetchRates();
      if (cancelled) return;
      const r = detected === 'USD' ? 1 : (typeof rates[detected] === 'number' ? rates[detected] : 0);
      // If we have no rate for the detected currency, fall back to USD so we
      // never show a wrong/blank figure.
      if (detected !== 'USD' && r > 0) { setCurrencyState(detected); setRate(r); }
      else { setCurrencyState('USD'); setRate(1); }
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const setCurrency = (c: string) => {
    writeOverride(c);
    if (c === 'USD') { setCurrencyState('USD'); setRate(1); return; }
    fetchRates().then((rates) => {
      const r = typeof rates[c] === 'number' ? rates[c] : 0;
      if (r > 0) { setCurrencyState(c); setRate(r); }
      else { setCurrencyState('USD'); setRate(1); }
    });
  };

  return { currency, rate, ready, isLocal: currency !== 'USD', setCurrency };
}
