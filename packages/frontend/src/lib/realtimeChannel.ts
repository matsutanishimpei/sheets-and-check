import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

/** Apply the custom JWT before joining an authorization-enabled private channel. */
export async function createAuthorizedPrivateChannel(
  client: SupabaseClient,
  accessToken: string,
  topic: string,
): Promise<RealtimeChannel> {
  if (!accessToken) throw new Error('Realtime access token is missing');
  await client.realtime.setAuth(accessToken);
  return client.channel(topic, {
    config: { private: true, broadcast: { self: true } },
  });
}
