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
  customerId?: string;
  customerLabel?: string;
  pendingProducts?: PosListedProduct[];
  pendingCustomers?: PosListedCustomer[];
  idempotencyKey?: string;
  amount?: number;
  payMethod?: 'cash' | 'mpesa';
  flowKind?: 'sale' | 'credit' | 'pay';
};

export function cartTotal(cart: PosCartLine[] | undefined): number {
  if (!cart?.length) return 0;
  return cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
}
