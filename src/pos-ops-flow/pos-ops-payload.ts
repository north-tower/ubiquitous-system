export type PosCartLine = {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
};

export type PosListedProduct = {
  id: string;
  name: string;
  price: number;
  stock: number | null;
  sku: string | null;
};

export type PosListedCustomer = {
  id: string;
  label: string;
  creditBalance: number;
  creditLimit: number;
};

export type PosOpsPayload = {
  staffName?: string;
  storeName?: string;
  cart?: PosCartLine[];
  saleType?: 'cash' | 'credit';
  /** The actual payment method for non-credit sales: cash | mpesa | card */
  cashMethod?: 'cash' | 'mpesa' | 'card';
  customerId?: string;
  customerLabel?: string;
  pendingProducts?: PosListedProduct[];
  pendingCustomers?: PosListedCustomer[];
  idempotencyKey?: string;
  amount?: number;
  payMethod?: 'cash' | 'mpesa';
  flowKind?: 'sale' | 'credit' | 'pay';
  // Quick-sale fast path
  quickUnitPrice?: number;
  quickQuantity?: number;
  quickCustomerQuery?: string;
};

export function cartTotal(cart: PosCartLine[] | undefined): number {
  if (!cart?.length) return 0;
  return cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
}
