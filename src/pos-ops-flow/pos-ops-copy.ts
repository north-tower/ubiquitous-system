export const UNAUTHORISED =
  'This number is not authorised for shop ops. Ask your admin to link your WhatsApp in Insightful POS.';

export const POS_NOT_CONFIGURED =
  'Shop ops are not configured yet. Set INSIGHTFUL_POS_BASE_URL and INSIGHTFUL_POS_API_KEY on the bot server.';

export function mainMenu(staffName: string, storeName: string): string {
  return (
    `Insightful POS — ${storeName}\n` +
    `Signed in as ${staffName}.\n\n` +
    `1  Record a sale\n` +
    `2  Customer credit balance\n` +
    `3  Pay on account\n\n` +
    `Or send a quick sale:\n` +
    `_product price_ e.g. *bread 50*\n` +
    `_qty product price_ e.g. *3 sugar 120*\n` +
    `_product price credit customer_ e.g. *bread 50 credit John*\n\n` +
    `Type *reset* to start over.`
  );
}

export function quickConfirmText(
  productName: string,
  unitPrice: number,
  quantity: number,
  saleType: 'cash' | 'credit',
  customerLabel?: string,
): string {
  const total = unitPrice * quantity;
  const line = `• ${productName} x${quantity} @ KES ${unitPrice}`;
  const custLine =
    saleType === 'credit' && customerLabel ? `\nCustomer: ${customerLabel}` : '';
  return (
    `Confirm sale?\n${line}\n` +
    `Type: ${saleType}${custLine}\nTotal: KES ${total}\n\n` +
    `1  Yes, confirm\n2  No, cancel`
  );
}
