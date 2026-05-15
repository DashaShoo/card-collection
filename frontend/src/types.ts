export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Card {
  id: number;
  name: string;
  rarity: Rarity;
  imageUrl: string;
  isOwner: boolean;
  count: number;
  firstObtainedAt: string | null;
}

export interface Collections {
  [collectionName: string]: Card[];
}

export interface DailyStatus {
  canClaim: boolean;
  nextClaimAt: string | null;
}

export interface ProfileStats {
  username: string;
  email: string;
  totalCards: number;
  uniqueCards: number;
  totalCardsInGame: number;
  completedCollections: number;
  totalCollections: number;
  createdAt: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
}
