---
trigger: always_on
---

# Realtime Architecture Rules

ファイル名は過去の名称ですが、現行設計は「Teacherごとの分散Project」ではありません。本番ではWorkerが管理する単一Supabase Projectだけを使います。

## 必須境界

- FrontendのSupabase clientはPagesの `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` だけから生成し、Room APIやlocalStorageから接続情報を取得しない。
- Worker relayは固定の `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` を使い、URLはtrimして末尾 `/` を除去する。
- `realtime.setAuth(customJwt)` の後に `private: true` のChannelへjoinする。
- Teacher → Studentは `room:<roomId>` のTeacher制御event。
- Student → TeacherはStudent JWT付きHTTP relayだけ。Workerがclaim由来の本人情報を付け、`room:<roomId>:teacher` へ送る。Studentの直接INSERTを許可しない。
- Teacher onlineはnetwork、main、Inboxのすべてがonlineの場合だけ。
- Channel失敗はstatus/errorを安全なdiagnosticとして記録し、retry時もcallbackを明示し、旧Channel/timer/unmountをcleanupする。
- service role key、JWT、Authorization header、password、各種Secret/key本体をブラウザ、D1、ログへ露出しない。
- Student最新回答はTeacherメモリだけで扱い、診断目的を含め新規永続化しない。

外部Supabase設定は `docs/realtime_authorization_setup.md`、障害対応は `docs/troubleshooting.md` を正とします。
