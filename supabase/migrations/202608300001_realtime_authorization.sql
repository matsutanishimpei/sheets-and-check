-- Realtime Authorization for private Broadcast channels.
-- Apply this migration in the single Supabase project configured by the Worker.
-- Students receive teacher events only on room:<roomId> and cannot broadcast directly.
-- Student responses are verified and relayed by the Worker to room:<roomId>:teacher.

drop policy if exists "seat_check_receive_authorized_broadcasts" on realtime.messages;
drop policy if exists "seat_check_teacher_send_broadcasts" on realtime.messages;

create policy "seat_check_receive_authorized_broadcasts"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and (
    (
      coalesce(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'user_role' = 'teacher'
      and (select realtime.topic()) like 'room:%'
    )
    or
    (
      coalesce(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'user_role' = 'student'
      and (select realtime.topic()) =
        'room:' || (coalesce(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'roomId')
    )
  )
);

create policy "seat_check_teacher_send_broadcasts"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension = 'broadcast'
  and coalesce(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'user_role' = 'teacher'
  and (select realtime.topic()) like 'room:%'
  and (select realtime.topic()) not like '%:teacher'
);

-- Realtime Settings > Allow public access must also be disabled in the Dashboard.
