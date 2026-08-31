export type CardType = "Avatar" | "Magic" | "Construct" | "Life" | "Token" | string;

export type Card = {
  name: string;
  type: CardType;
  soi: number;
  print: string;
  rare: string;
  mainEffect?: string;
  cost?: number;
  gem?: number;
  power?: number;
  symbol?: string;
  color?: string;
  dropRate?: string;
  creator?: string;
  subtype?: string;
  favorText?: string;
  hashtagText?: string;
  ex?: string;
  customLimit?: number;
  gemColor?: string;
};

export type Person = {
  id: string;
  name: string;
  createdAt: string;
};

export type Box = {
  id: string;
  name: string;
  rows: number;
  notes: string;
  ownerId: string | null;
  createdAt: string;
};

export type Placement = {
  id: string;
  boxId: string;
  row: number;
  print: string;
  rare: string;
  quantity: number;
  notes: string;
  addedAt: string;
};

export type CatalogMeta = {
  syncedAt: string | null;
  count: number;
  lastAdded: number;
  lastNewCards: Array<{ name: string; print: string; rare: string }>;
};

export type StoreData = {
  meta: CatalogMeta;
  people: Person[];
  boxes: Box[];
  placements: Placement[];
};

export type LocatedCard = Placement & {
  card: Card;
  box: Box;
  ownerName: string | null;
};

export function cardKey(print: string, rare: string) {
  return `${print}::${rare}`;
}
