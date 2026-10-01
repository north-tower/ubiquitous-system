/**
 * parse-quick-sale.ts
 *
 * Parses a single-line "quick sale" message so staff can record a sale without
 * going through the step-by-step menu.
 *
 * Accepted formats (all case-insensitive, order of qty/price flexible):
 *
 *   <product> <price>                   → cash sale, qty 1
 *   <product> <price> x<qty>            → cash sale, arbitrary qty
 *   <qty> <product> <price>             → cash sale
 *   <qty>x <product> <price>            → cash sale
 *   <product> <price> credit <customer> → credit sale
 *   <qty> <product> <price> credit <customer>
 *   <product> <price> x<qty> credit <customer>
 *
 * Examples:
 *   "bread 50"                          → product=bread, price=50, qty=1, cash
 *   "2 blue pen 30"                     → product=blue pen, price=30, qty=2, cash
 *   "maize flour 200 x3"               → product=maize flour, price=200, qty=3, cash
 *   "bread 50 credit john"             → product=bread, price=50, qty=1, credit, customer=john
 *   "3 sugar 120 credit jane wambui"   → product=sugar, price=120, qty=3, credit, customer=jane wambui
 *
 * Returns null if the message does not look like a quick sale (e.g. plain menu
 * replies like "1" or "reset").
 */

export type QuickSale = {
  productQuery: string;
  unitPrice: number;
  quantity: number;
  saleType: 'cash' | 'credit';
  customerQuery: string | null;
};

// Matches an optional leading quantity: "3 " or "3x " at start of string
const LEADING_QTY = /^(\d+)x?\s+/i;

// Matches a trailing "x<qty>" before optional credit clause: " x3" or " x 3"
const TRAILING_QTY = /\s+x\s*(\d+)(?:\s|$)/i;

// Matches a price — a bare number that is NOT immediately followed by letters
// (so we don't eat the start of a word like "200ml")
const PRICE_RE = /\b(\d+(?:\.\d{1,2})?)\b(?!\s*[a-zA-Z])/;

// Credit keyword + optional customer name
const CREDIT_RE = /\b(credit|on\s+account)\s*(.*)/i;

export function parseQuickSale(text: string): QuickSale | null {
  const raw = text.trim();

  // Bail out on very short inputs — likely a menu number reply
  if (raw.length < 4) return null;

  // Must contain at least one number to be a quick sale
  if (!/\d/.test(raw)) return null;

  let remaining = raw;
  let quantity = 1;
  let saleType: 'cash' | 'credit' = 'cash';
  let customerQuery: string | null = null;

  // 1. Strip credit clause from the end
  const creditMatch = CREDIT_RE.exec(remaining);
  if (creditMatch) {
    saleType = 'credit';
    customerQuery = creditMatch[2].trim() || null;
    remaining = remaining.slice(0, creditMatch.index).trim();
  }

  // 2. Strip leading quantity: "3 bread 50" or "3x bread 50"
  const leadingMatch = LEADING_QTY.exec(remaining);
  if (leadingMatch) {
    const candidate = parseInt(leadingMatch[1], 10);
    // Only treat it as a qty if it's reasonable (1-9999) and the rest still has a price
    const rest = remaining.slice(leadingMatch[0].length);
    if (candidate >= 1 && candidate <= 9999 && PRICE_RE.test(rest)) {
      quantity = candidate;
      remaining = rest;
    }
  }

  // 3. Strip trailing "x<qty>": "bread 50 x3"
  const trailingMatch = TRAILING_QTY.exec(remaining);
  if (trailingMatch) {
    const candidate = parseInt(trailingMatch[1], 10);
    if (candidate >= 1 && candidate <= 9999) {
      quantity = candidate;
      remaining =
        remaining.slice(0, trailingMatch.index) +
        remaining.slice(trailingMatch.index + trailingMatch[0].length);
      remaining = remaining.trim();
    }
  }

  // 4. Find the price — the last bare number in the remaining string
  //    We find ALL price candidates and take the last one so "blue pen 2 200"
  //    correctly picks 200 as the price and leaves "blue pen 2" as the name.
  const allNumbers = [...remaining.matchAll(/\b(\d+(?:\.\d{1,2})?)\b/g)];
  if (allNumbers.length === 0) return null;

  const priceMatch = allNumbers[allNumbers.length - 1];
  const unitPrice = parseFloat(priceMatch[1]);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) return null;

  // 5. Product name is everything before the price match
  const priceIndex = priceMatch.index ?? 0;
  const productQuery = remaining.slice(0, priceIndex).trim();

  // Product name must be at least 2 characters
  if (productQuery.length < 2) return null;

  // 6. Credit sale must have a customer query (staff must provide a name)
  if (saleType === 'credit' && !customerQuery) return null;

  return { productQuery, unitPrice, quantity, saleType, customerQuery };
}
