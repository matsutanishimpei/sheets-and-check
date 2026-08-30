import { describe, expect, it, vi } from 'vitest';
import { createAuthorizedPrivateChannel } from './realtimeChannel';

describe('createAuthorizedPrivateChannel', () => {
  it('sets the JWT before creating a private channel with the unchanged room topic', async () => {
    const order: string[] = [];
    const channel = { subscribe: vi.fn() };
    const client = {
      realtime: { setAuth: vi.fn(async (token: string) => { order.push(`auth:${token}`); }) },
      channel: vi.fn((topic: string) => { order.push(`channel:${topic}`); return channel; }),
    } as any;

    const result = await createAuthorizedPrivateChannel(client, 'custom-jwt', 'room:room-1');

    expect(order).toEqual(['auth:custom-jwt', 'channel:room:room-1']);
    expect(client.channel).toHaveBeenCalledWith('room:room-1', {
      config: { private: true, broadcast: { self: true } },
    });
    expect(result).toBe(channel);
  });

  it('refuses to create a private channel without a token', async () => {
    await expect(createAuthorizedPrivateChannel({} as any, '', 'room:room-1')).rejects.toThrow('missing');
  });
});
