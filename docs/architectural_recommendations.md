# 将来の設計候補と残存リスク

現行構成はHono/Vite/Zod、Cloudflare D1、単一Worker管理Supabase Projectです。Private Channel、Worker relay、production fail closed、retry/cleanup、診断codeは実装済みです。

将来候補は次に限定します。

- Teacher app JWTのlocalStorageからHttpOnly Cookieへの移行
- Worker isolate内Teacher login rate limitの分散化
- Supabase legacy anon/service role/JWT secretから新API key・Signing Keysへの計画的移行
- Student本人確認を必要とする運用での認証方式追加

いずれも今回の現行運用に必須ではありません。対応時も単一Project、Room境界、Student Worker relay、RLS、fail closedを維持してください。

Student回答はTeacherブラウザのメモリだけに保持します。回答履歴、CSV archive、独自ログDBは現在の機能ではありません。

本番運用前の手動作業は [`realtime_authorization_setup.md`](./realtime_authorization_setup.md)、障害対応は [`troubleshooting.md`](./troubleshooting.md) を参照してください。
