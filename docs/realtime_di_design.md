# Realtime DIに関する将来検討メモ

この文書は将来の抽象化案であり、現行実装を説明する設計書ではありません。現在は `useTeacherRealtime.ts`、`useStudentRealtime.ts`、`realtimeChannel.ts` とWorker relayが実装上の正です。

将来Realtime providerを抽象化する場合も、次のSecurity contractをインターフェースの外へ追い出してはいけません。

- 本番はWorker管理の単一Supabase Project
- custom JWTとPrivate Channel認可
- Teacher制御用 `room:<roomId>` とTeacher Inbox `room:<roomId>:teacher` の分離
- Student回答は認証付きWorker relayのみで、本文の本人情報を信用しない
- mainとInboxを両方必要とするTeacher online判定
- status/error callback、retry、Channel/timer/unmount cleanup
- Credentialを含まない安定した診断code

Pusher、自前WebSocket、別Projectなどへの移行は未実装であり、現在利用可能な機能として説明しません。移行する場合はRLS相当のRoom境界とrelay認証を設計・テストしてから、この文書を具体化してください。
