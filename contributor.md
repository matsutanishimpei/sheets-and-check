# 開発者・貢献者ガイド

## 環境

Node.js `20.x` とnpm workspacesを使用します。依存関係はリポジトリルートでlockfileどおりに導入します。

```bash
npm ci
npm run build
npm run typecheck
npm run test
git diff --check
```

`packages/shared` はZod schemaと共通型、`packages/backend` はHono/Cloudflare Workers/D1、`packages/frontend` はReact/Viteです。D1 schema変更は `packages/backend/migrations` に追加します。

## Security / Realtime invariants

- productionはWorker管理の単一Supabase Projectを使用する。Teacher・Roomごとの自由なProject持込みへ戻さない。
- Room POST/PUTとStudent relayは共通のURL正規化（trim、末尾 `/` をすべて除去）を使い、Worker `SUPABASE_URL` と一致させる。
- Teacher/Studentは `realtime.setAuth(customJwt)` 後、`private: true` のChannelへjoinする。
- Teacher制御eventは `room:<roomId>`。Student回答は直接Broadcastせず、認証付き `/api/rooms/:id/student-event` から `room:<roomId>:teacher` へrelayする。
- Student本文中の本人情報は信用せず、JWT claimの `studentId` / `name` を使う。
- Teacher正常状態はnetwork online、main `SUBSCRIBED`、Inbox `SUBSCRIBED` の論理積。
- retry timerを重複させず、失敗Channelをremoveし、再作成したChannelにもstatus callbackを渡し、unmount後にretryしない。
- Student回答・履歴をD1へ新規保存しない。最新回答はTeacherブラウザのメモリだけで扱う。

例外としてStudent回答relayは設計上標準 `fetch` を使用します。その他のBackend API呼出しは原則 `src/lib/hc.ts` のHono RPC clientを使います。

## エラーとログ

ユーザー向けレスポンスは一般化し、必要な場合だけ安定したcodeを付けます。内部原因は適切なログへ記録します。

- Frontend Realtime: Browser Console、`RT-T-*` / `RT-S-*`
- Worker relay/config/auth: Cloudflare Worker logs、`RT-RELAY-01` / `CFG-SB-01` / `AUTH-T-01`
- CI/deploy/keep-alive: GitHub Actions

JWT、Authorization header、password、Secret、service role/anon/publishable key本体、Cookieをログへ出してはいけません。Student氏名・IDも接続診断ログには不要です。詳細とcode一覧は [`docs/troubleshooting.md`](./docs/troubleshooting.md) を参照してください。

## 本番変更

`main` へのpushでdeploy workflowが動きます。merge前に [`docs/realtime_authorization_setup.md`](./docs/realtime_authorization_setup.md) の外部設定とデプロイ前チェックリストを完了し、[`リモートデプロイ設定ガイド.md`](./リモートデプロイ設定ガイド.md) を確認してください。Secret実値をcommitしないでください。
