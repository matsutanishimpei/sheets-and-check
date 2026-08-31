import { IRoomRepository, RoomLayout } from './RoomRepository';

export class InMemoryRoomRepository implements IRoomRepository {
  constructor(public roomsTable: RoomLayout[] = []) {}

  async listAll(): Promise<Omit<RoomLayout, 'grid'>[]> {
    return this.roomsTable.map(r => ({
      id: r.id,
      name: r.name,
      isActive: r.isActive,
    }));
  }

  async findById(id: string): Promise<RoomLayout | null> {
    const r = this.roomsTable.find(r => r.id === id);
    return r ? { ...r } : null;
  }

  async create(room: RoomLayout): Promise<void> {
    this.roomsTable.push({ ...room });
  }

  async update(id: string, room: Omit<RoomLayout, 'id'>): Promise<void> {
    const idx = this.roomsTable.findIndex(r => r.id === id);
    if (idx !== -1) {
      this.roomsTable[idx] = {
        id,
        ...room,
      };
    }
  }

  async updateStatus(id: string, isActive: boolean): Promise<void> {
    const idx = this.roomsTable.findIndex(r => r.id === id);
    if (idx !== -1) {
      this.roomsTable[idx].isActive = isActive;
    }
  }

  async delete(id: string): Promise<void> {
    this.roomsTable = this.roomsTable.filter(r => r.id !== id);
  }

  async exists(id: string): Promise<boolean> {
    return this.roomsTable.some(r => r.id === id);
  }
}
