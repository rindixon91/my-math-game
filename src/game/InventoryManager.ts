export enum ItemType {
  BSODA = 'BSODA',
  ZESTY_BAR = 'ZESTY_BAR',
  QUARTER = 'QUARTER',
  SCISSORS = 'SCISSORS',
  PRINCIPAL_KEYS = 'PRINCIPAL_KEYS',
  DOOR_LOCK = 'DOOR_LOCK',
}

export interface ItemMetadata {
  type: ItemType;
  name: string;
  shortName: string;
  description: string;
  accentColor: string;
}

export const ITEM_METADATA: Record<ItemType, ItemMetadata> = {
  [ItemType.BSODA]: {
    type: ItemType.BSODA,
    name: 'Air Tin BSoda',
    shortName: 'BSoda',
    description: 'Menyembur air soda yang menolak musuh ke belakang di sepanjang koridor',
    accentColor: '#2563eb',
  },
  [ItemType.ZESTY_BAR]: {
    type: ItemType.ZESTY_BAR,
    name: 'Bar Tenaga Zesty',
    shortName: 'Zesty',
    description: 'Memulihkan stamina kepada 100% dan memberi larian pantas seketika',
    accentColor: '#ea580c',
  },
  [ItemType.QUARTER]: {
    type: ItemType.QUARTER,
    name: 'Syiling 25¢',
    shortName: 'Syiling',
    description: 'Gunakan pada Mesin Layan Diri atau serahkan kepada Si Pembuli',
    accentColor: '#eab308',
  },
  [ItemType.SCISSORS]: {
    type: ItemType.SCISSORS,
    name: 'Gunting Keselamatan',
    shortName: 'Gunting',
    description: 'Memotong tali lompat Playtime serta-merta',
    accentColor: '#dc2626',
  },
  [ItemType.PRINCIPAL_KEYS]: {
    type: ItemType.PRINCIPAL_KEYS,
    name: 'Kunci Pengetua',
    shortName: 'Kunci',
    description: 'Membuka Bilik Tahanan atau pintu kawasan larangan lebih awal',
    accentColor: '#ca8a04',
  },
  [ItemType.DOOR_LOCK]: {
    type: ItemType.DOOR_LOCK,
    name: 'Mangga Pintu Kuning',
    shortName: 'Mangga',
    description: 'Mengunci pintu kembar kuning terdekat selama 12 saat',
    accentColor: '#facc15',
  },
};

export const MAX_INVENTORY_SLOTS = 4;

export class InventoryManager {
  private slots: (ItemType | null)[] = Array(MAX_INVENTORY_SLOTS).fill(null);
  private selectedSlot = 0;

  public getSlots(): readonly (ItemType | null)[] {
    return [...this.slots];
  }

  public getSelectedSlot(): number {
    return this.selectedSlot;
  }

  public setSelectedSlot(index: number): void {
    if (index >= 0 && index < MAX_INVENTORY_SLOTS) {
      this.selectedSlot = index;
    }
  }

  public hasSpace(): boolean {
    return this.slots.some((s) => s === null);
  }

  public countItems(): number {
    return this.slots.filter((s) => s !== null).length;
  }

  public addItem(item: ItemType): boolean {
    const emptyIdx = this.slots.findIndex((s) => s === null);
    if (emptyIdx === -1) {
      return false;
    }
    this.slots[emptyIdx] = item;
    return true;
  }

  public peekSlot(index: number): ItemType | null {
    if (index < 0 || index >= MAX_INVENTORY_SLOTS) return null;
    return this.slots[index];
  }

  public consumeSlot(index: number): ItemType | null {
    if (index < 0 || index >= MAX_INVENTORY_SLOTS) return null;
    const item = this.slots[index];
    this.slots[index] = null;
    return item;
  }

  public findFirstSlotOfType(type: ItemType): number {
    return this.slots.findIndex((s) => s === type);
  }

  /**
   * Used by It's a Bully: removes ALL currently collected usable items at once.
   * Returns the array of stolen items for UI/animation feedback.
   */
  public clearAllItems(): ItemType[] {
    const stolen: ItemType[] = [];
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i] !== null) {
        stolen.push(this.slots[i]!);
        this.slots[i] = null;
      }
    }
    return stolen;
  }

  public reset(): void {
    this.slots = Array(MAX_INVENTORY_SLOTS).fill(null);
    this.selectedSlot = 0;
  }
}
