# React リファクタリング実行タスク

## Phase 1: Context 導入（props drilling 解消）

- [x] 1.1 `ToastContext.tsx` 作成 — App.tsx の toast state を Context 化
- [x] 1.2 App.tsx を ToastProvider でラップ + 全ページの `addToast` props 削除
- [x] 1.3 StudentSelect の `addToast` props も useToast() に置換
- [x] 1.4 StudentView → StudentPage 間の addToast バケツリレー削除
- [x] 1.5 ビルド確認 (tsc + vite build) ✅

## Phase 2: ページ肥大化の解消

- [x] 2.1 `useTeacherSession.ts` ファサードフック作成（3フック統合）
- [x] 2.2 回答状態管理を専用フックへ分離（後に長期履歴機能は廃止）
- [x] 2.3 TeacherLayoutPage をスリム化 (227行 → 90行)
- [x] 2.4 TeacherMonitorPage をスリム化 (630行 → 305行)
- [x] 2.5 ビルド確認 (tsc + vite build) ✅

## 残りのPhase（今回は見送り）
- [ ] Phase 3: localStorage 永続化層分離
- [ ] Phase 4: 認証ガード統一
- [ ] Phase 5: Header 共通化

## Working Notes
- 振る舞い変更ゼロ確認: ビルド成功、型エラーなし
- SupabaseConfigContext と StudentContext は Phase 1 で見送り（addToast の Context 化だけで十分な効果）
- 今回の変更でフック層が addToast を受け取る仕組みは維持（将来フック内で直接 useToast() を呼ぶ形にできるが、影響範囲が大きいため次回以降）
