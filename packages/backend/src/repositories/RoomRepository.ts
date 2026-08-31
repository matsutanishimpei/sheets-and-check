import { GridItem } from '@my-app/shared';

export interface RoomLayout {
  id: string;
  name: string;
  grid: GridItem[];
  isActive: boolean;
}

export interface IRoomRepository {
  listAll(): Promise<Omit<RoomLayout, 'grid'>[]>;
  findById(id: string): Promise<RoomLayout | null>;
  create(room: RoomLayout): Promise<void>;
  update(id: string, room: Omit<RoomLayout, 'id'>): Promise<void>;
  updateStatus(id: string, isActive: boolean): Promise<void>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}
