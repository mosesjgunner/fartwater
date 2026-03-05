export const FRTWTR_MINT = '4KqswqciRBGp3MEQnaP8JUDwX8hVVMhsD8BU6jYupump';
export const FRTWTR_DECIMALS = 6;
export const MERCH_TREASURY_WALLET = 'GJpVrqvvDJyKWGeWAKTj4QSfyPX7ii3PDWMRNtVAiFZN';
export const HOLDER_REWARD_DAYS = 90;

export const MERCH_ITEMS = {
  hat: {
    key: 'hat',
    name: 'FRTWTR Hat',
    description: 'Classic cap with embroidered FRTWTR mark.',
    priceFrtwtr: 25000,
  },
  bottle: {
    key: 'bottle',
    name: 'Hydration Bottle',
    description: 'Chrome bottle for high-volume trench hydration.',
    priceFrtwtr: 18000,
  },
  album: {
    key: 'album',
    name: 'Season 1 Album',
    description: 'Collector drop with preorder unlock.',
    priceFrtwtr: 30000,
  },
} as const;

export type MerchItemKey = keyof typeof MERCH_ITEMS;

export function isMerchItemKey(value: string): value is MerchItemKey {
  return value in MERCH_ITEMS;
}

export function frtwtrToRawAmount(amount: number) {
  return BigInt(Math.round(amount * 10 ** FRTWTR_DECIMALS));
}
