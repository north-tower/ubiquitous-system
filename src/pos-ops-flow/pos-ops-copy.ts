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
    `Reply with a number. Type *reset* to start over.`
  );
}
