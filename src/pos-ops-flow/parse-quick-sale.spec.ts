import { parseQuickSale } from './parse-quick-sale';

describe('parseQuickSale', () => {
  // ── Cash sales ────────────────────────────────────────────────────────────

  it('parses "bread 50" → cash, qty 1', () => {
    const result = parseQuickSale('bread 50');
    expect(result).toMatchObject({
      productQuery: 'bread',
      unitPrice: 50,
      quantity: 1,
      saleType: 'cash',
      customerQuery: null,
    });
  });

  it('parses "2 sugar 120" → qty 2, cash', () => {
    const result = parseQuickSale('2 sugar 120');
    expect(result).toMatchObject({
      productQuery: 'sugar',
      unitPrice: 120,
      quantity: 2,
      saleType: 'cash',
    });
  });

  it('parses "blue pen 30 x5" → qty 5, cash', () => {
    const result = parseQuickSale('blue pen 30 x5');
    expect(result).toMatchObject({
      productQuery: 'blue pen',
      unitPrice: 30,
      quantity: 5,
      saleType: 'cash',
    });
  });

  it('parses "maize flour 200" with multi-word product', () => {
    const result = parseQuickSale('maize flour 200');
    expect(result).toMatchObject({
      productQuery: 'maize flour',
      unitPrice: 200,
      quantity: 1,
      saleType: 'cash',
    });
  });

  it('parses "3x cooking oil 180" (leading qty with x)', () => {
    const result = parseQuickSale('3x cooking oil 180');
    expect(result).toMatchObject({
      productQuery: 'cooking oil',
      unitPrice: 180,
      quantity: 3,
      saleType: 'cash',
    });
  });

  it('parses decimal price "mineral water 45.50"', () => {
    const result = parseQuickSale('mineral water 45.50');
    expect(result).toMatchObject({
      productQuery: 'mineral water',
      unitPrice: 45.5,
      quantity: 1,
    });
  });

  // ── Credit sales ──────────────────────────────────────────────────────────

  it('parses "bread 50 credit john" → credit, customer=john', () => {
    const result = parseQuickSale('bread 50 credit john');
    expect(result).toMatchObject({
      productQuery: 'bread',
      unitPrice: 50,
      quantity: 1,
      saleType: 'credit',
      customerQuery: 'john',
    });
  });

  it('parses "3 sugar 120 credit jane wambui" → qty 3, credit, full name', () => {
    const result = parseQuickSale('3 sugar 120 credit jane wambui');
    expect(result).toMatchObject({
      productQuery: 'sugar',
      unitPrice: 120,
      quantity: 3,
      saleType: 'credit',
      customerQuery: 'jane wambui',
    });
  });

  it('parses "milk 80 x2 credit kamau" → qty 2, credit', () => {
    const result = parseQuickSale('milk 80 x2 credit kamau');
    expect(result).toMatchObject({
      productQuery: 'milk',
      unitPrice: 80,
      quantity: 2,
      saleType: 'credit',
      customerQuery: 'kamau',
    });
  });

  it('parses "on account" as credit keyword', () => {
    const result = parseQuickSale('bread 50 on account john');
    expect(result?.saleType).toBe('credit');
    expect(result?.customerQuery).toBe('john');
  });

  // ── Should return null ─────────────────────────────────────────────────────

  it('returns null for plain menu reply "1"', () => {
    expect(parseQuickSale('1')).toBeNull();
  });

  it('returns null for "reset"', () => {
    expect(parseQuickSale('reset')).toBeNull();
  });

  it('returns null for text with no numbers', () => {
    expect(parseQuickSale('just some words')).toBeNull();
  });

  it('returns null for credit sale with no customer name', () => {
    expect(parseQuickSale('bread 50 credit')).toBeNull();
  });

  it('returns null when product name is too short after parsing', () => {
    // "a 50" — product name is only 1 char
    expect(parseQuickSale('a 50')).toBeNull();
  });
});
