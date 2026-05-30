const { getPool } = require('../config/database');

const DEFAULT_BASE_CURRENCY = process.env.BASE_CURRENCY || 'USD';
const DEFAULT_API_BASE_URL = 'https://api.exchangerate-api.com/v4/latest';

class Currency {
  static normalizeCode(code) {
    return String(code || DEFAULT_BASE_CURRENCY).trim().toUpperCase();
  }

  static async findAll() {
    const pool = getPool();
    const result = await pool.query(`
      SELECT code, name, symbol, exchange_rate_to_usd as "exchangeRateToUsd",
             exchange_rate_from_usd as "exchangeRateFromUsd", last_updated as "lastUpdated"
      FROM currencies
      ORDER BY code
    `);

    return result.rows;
  }

  static async findByCode(code) {
    const pool = getPool();
    const result = await pool.query(`
      SELECT code, name, symbol, exchange_rate_to_usd as "exchangeRateToUsd",
             exchange_rate_from_usd as "exchangeRateFromUsd", last_updated as "lastUpdated"
      FROM currencies
      WHERE code = $1
    `, [this.normalizeCode(code)]);

    if (result.rows.length > 0) {
      return result.rows[0];
    }
    return null;
  }

  static async upsert({ code, name, symbol, exchangeRateFromUsd, exchangeRateToUsd }) {
    const pool = getPool();
    const normalizedCode = this.normalizeCode(code);
    const fromUsd = Number(exchangeRateFromUsd);
    const toUsd = Number(exchangeRateToUsd || (fromUsd ? 1 / fromUsd : 1));

    const result = await pool.query(`
      INSERT INTO currencies (code, name, symbol, exchange_rate_to_usd, exchange_rate_from_usd, last_updated)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT(code) DO UPDATE SET
        name = EXCLUDED.name,
        symbol = EXCLUDED.symbol,
        exchange_rate_to_usd = EXCLUDED.exchange_rate_to_usd,
        exchange_rate_from_usd = EXCLUDED.exchange_rate_from_usd,
        last_updated = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      normalizedCode,
      name || normalizedCode,
      symbol || normalizedCode,
      toUsd,
      fromUsd
    ]);

    return this.findByCode(normalizedCode);
  }

  static async convert(amount, fromCode = DEFAULT_BASE_CURRENCY, toCode = DEFAULT_BASE_CURRENCY) {
    const value = Number(amount || 0);
    const from = await this.findByCode(fromCode);
    const to = await this.findByCode(toCode);

    if (!from || !to) {
      return value;
    }

    const usdAmount = value * Number(from.exchangeRateToUsd || 1);
    return usdAmount * Number(to.exchangeRateFromUsd || 1);
  }

  static async withDisplayAmount(amount, currencyCode) {
    const currency = await this.findByCode(currencyCode) || await this.findByCode(DEFAULT_BASE_CURRENCY);
    const code = currency?.code || DEFAULT_BASE_CURRENCY;

    return {
      amount: Number(amount || 0),
      displayAmount: await this.convert(amount, DEFAULT_BASE_CURRENCY, code),
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

    for (const [code, rate] of Object.entries(rates)) {
      const existing = await this.findByCode(code);
      await this.upsert({
        code,
        name: existing?.name || code,
        symbol: existing?.symbol || code,
        exchangeRateFromUsd: Number(rate)
      });
    }

    return this.findAll();
  }
}

module.exports = Currency;
