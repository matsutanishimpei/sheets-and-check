import { eq } from 'drizzle-orm';
import { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { IRoomRepository, RoomLayout } from './RoomRepository';
import * as schema from '../db/schema';

export class DrizzleRoomRepository implements IRoomRepository {
  constructor(private db: BaseSQLiteDatabase<any, any, any, any>) {}

  async listAll(): Promise<Omit<RoomLayout, 'grid'>[]> {
    const results = await this.db
      .select({
        id: schema.rooms.id,
        name: schema.rooms.name,
        isActive: schema.rooms.isActive,
      })
      .from(schema.rooms)
      .all();

    return results.map((r: { id: string; name: string; isActive: number | null }) => ({
      id: r.id,
      name: r.name,
      isActive: r.isActive !== 0,
    }));
  }

  async findById(id: string): Promise<RoomLayout | null> {
    const results = await this.db
      .select({
        id: schema.rooms.id,
        name: schema.rooms.name,
        layoutData: schema.rooms.layoutData,
        isActive: schema.rooms.isActive,
      })
      .from(schema.rooms)
      .where(eq(schema.rooms.id, id))
      .all();

    const r = results[0];
    if (!r) return null;

    return {
      id: r.id,
      name: r.name,
      grid: JSON.parse(r.layoutData || '[]'),
      isActive: r.isActive !== 0,
    };
  }

  async create(room: RoomLayout): Promise<void> {
    await this.db
      .insert(schema.rooms)
      .values({
        id: room.id,
        name: room.name,
        layoutData: JSON.stringify(room.grid),
        isActive: room.isActive ? 1 : 0,
      })
      .run();
  }

  async update(id: string, room: Omit<RoomLayout, 'id'>): Promise<void> {
    await this.db
      .update(schema.rooms)
      .set({
        name: room.name,
        layoutData: JSON.stringify(room.grid),
        isActive: room.isActive ? 1 : 0,
      })
      .where(eq(schema.rooms.id, id))
      .run();
  }

  async updateStatus(id: string, isActive: boolean): Promise<void> {
    await this.db
      .update(schema.rooms)
      .set({
        isActive: isActive ? 1 : 0,
      })
      .where(eq(schema.rooms.id, id))
      .run();
  }

  async delete(id: string): Promise<void> {
    await this.db
      .delete(schema.rooms)
      .where(eq(schema.rooms.id, id))
      .run();
  }

  async exists(id: string): Promise<boolean> {
    const results = await this.db
      .select({ id: schema.rooms.id })
      .from(schema.rooms)
      .where(eq(schema.rooms.id, id))
      .all();
    return results.length > 0;
  }
}
