const { getDb, save } = require('../config/database');

const DEFAULT_BASE_CURRENCY = process.env.BASE_CURRENCY || 'USD';
const DEFAULT_API_BASE_URL = 'https://api.exchangerate-api.com/v4/latest';

class Currency {
  static normalizeCode(code) {
    return String(code || DEFAULT_BASE_CURRENCY).trim().toUpperCase();
  }

  static findAll() {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT code, name, symbol, exchange_rate_to_usd as exchangeRateToUsd,
             exchange_rate_from_usd as exchangeRateFromUsd, last_updated as lastUpdated
      FROM currencies
      ORDER BY code
    `);

    const currencies = [];
    while (stmt.step()) {
      currencies.push(stmt.getAsObject());
    }
    stmt.free();
    return currencies;
  }

  static findByCode(code) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT code, name, symbol, exchange_rate_to_usd as exchangeRateToUsd,
             exchange_rate_from_usd as exchangeRateFromUsd, last_updated as lastUpdated
      FROM currencies
      WHERE code = ?
    `);
    stmt.bind([this.normalizeCode(code)]);

    if (stmt.step()) {
      const result = stmt.getAsObject();
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  static upsert({ code, name, symbol, exchangeRateFromUsd, exchangeRateToUsd }) {
    const db = getDb();
    const normalizedCode = this.normalizeCode(code);
    const fromUsd = Number(exchangeRateFromUsd);
    const toUsd = Number(exchangeRateToUsd || (fromUsd ? 1 / fromUsd : 1));

    const stmt = db.prepare(`
      INSERT INTO currencies (code, name, symbol, exchange_rate_to_usd, exchange_rate_from_usd, last_updated)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(code) DO UPDATE SET
        name = excluded.name,
        symbol = excluded.symbol,
        exchange_rate_to_usd = excluded.exchange_rate_to_usd,
        exchange_rate_from_usd = excluded.exchange_rate_from_usd,
        last_updated = CURRENT_TIMESTAMP
    `);
    stmt.bind([
      normalizedCode,
      name || normalizedCode,
      symbol || normalizedCode,
      toUsd,
      fromUsd
    ]);
    stmt.step();
    stmt.free();
    save();

    return this.findByCode(normalizedCode);
  }

  static convert(amount, fromCode = DEFAULT_BASE_CURRENCY, toCode = DEFAULT_BASE_CURRENCY) {
    const value = Number(amount || 0);
    const from = this.findByCode(fromCode);
    const to = this.findByCode(toCode);

    if (!from || !to) {
      return value;
    }

    const usdAmount = value * Number(from.exchangeRateToUsd || 1);
    return usdAmount * Number(to.exchangeRateFromUsd || 1);
  }

  static withDisplayAmount(amount, currencyCode) {
    const currency = this.findByCode(currencyCode) || this.findByCode(DEFAULT_BASE_CURRENCY);
    const code = currency?.code || DEFAULT_BASE_CURRENCY;

    return {
      amount: Number(amount || 0),
      displayAmount: this.convert(amount, DEFAULT_BASE_CURRENCY, code),
      displayCurrency: code,
      displaySymbol: currency?.symbol || code
    };
  }

  static async refreshRates() {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    const baseCurrency = DEFAULT_BASE_CURRENCY;
    const baseUrl = process.env.EXCHANGE_RATE_API_URL || DEFAULT_API_BASE_URL;
    const url = apiKey
      ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${baseCurrency}`
      : `${baseUrl}/${baseCurrency}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Exchange rate API responded with ${response.status}`);
    }

    const data = await response.json();
    const rates = data.conversion_rates || data.rates;
    if (!rates || typeof rates !== 'object') {
      throw new Error('Exchange rate API response did not include rates');
    }

    Object.entries(rates).forEach(([code, rate]) => {
      const existing = this.findByCode(code);
      this.upsert({
        code,
        name: existing?.name || code,
        symbol: existing?.symbol || code,
        exchangeRateFromUsd: Number(rate)
      });
    });

    return this.findAll();
  }
}

module.exports = Currency;
