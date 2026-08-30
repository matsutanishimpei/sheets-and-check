# Realtime Authorization setup

コード側はSupabase RealtimeへカスタムJWTを `realtime.setAuth()` で設定し、すべてのChannelを `private: true` で作成します。次の外部設定が終わるまでは、Realtime Authorizationの導入は完了していません。

## 必須の外部作業

1. Workerが利用するSupabase ProjectのSQL EditorまたはMigrationパイプラインで [`supabase/migrations/202608300001_realtime_authorization.sql`](../supabase/migrations/202608300001_realtime_authorization.sql) を適用する。
2. Supabase Dashboardの **Realtime Settings** で **Allow public access** を無効にする。
3. Cloudflare Worker Secretへ次を設定する。値はコミットしない。
   - `JWT_SECRET`: 十分に長いアプリ認証用ランダム値
   - `SUPABASE_JWT_SECRET`: 対象ProjectのJWT検証Secretと一致する値
   - `SUPABASE_URL`: 対象ProjectのHTTPS URL
   - `SUPABASE_SERVICE_ROLE_KEY`: 学生イベント中継専用のサーバー側キー
   - `INITIAL_TEACHER_USERNAME` / `INITIAL_TEACHER_PASSWORD`: Teacherが0件の初回だけ必要。既知の開発値は禁止
4. `ALLOWED_ORIGINS` を正式なPages Originのカンマ区切りにする。Preview URLを包括許可しない。
5. 各Roomへ保存するSupabase URLをWorkerの `SUPABASE_URL` と一致させる。

`SUPABASE_SERVICE_ROLE_KEY` はブラウザへ返さず、Worker Secretだけに保存してください。

## 権限モデル

| Principal | Topic | Receive | Send |
|---|---|---|---|
| Student | `room:<JWT roomId>` | Teacher制御イベント | 直接送信不可 |
| Student | 他Room / `room:<id>:teacher` | 不可 | 不可 |
| Teacher | `room:<roomId>` | 可 | Teacher制御イベント |
| Teacher | `room:<roomId>:teacher` | Student回答 | 不要 |
| Worker service role | `room:<roomId>:teacher` | 不要 | `student_to_teacher` のみ |

学生回答は `POST /api/rooms/:id/student-event` が学生JWTを検証し、`studentId` と氏名をclaimから付与してTeacher専用Topicへ中継します。学生は `realtime.messages` のINSERT権限を持たないため、`teacher_reset` 等を直接送れません。

自動テストでは、同一 `CF-Connecting-IP` から50件の有効な学生JWTをほぼ同時に回答中継APIへ送り、全件が429なしで受理されること、送信先Topicが同一Roomに固定されること、各イベントの学生ID・氏名がJWT claim由来であることを確認します。実Supabaseへの到達とTeacherブラウザでの受信は、次の手動検証も必要です。

## 手動検証

自動テストはJWT境界、Private Channel生成順序、claim由来の本人情報、他Room拒否、学生のTeacherイベント混入拒否を検証します。外部ProjectへPolicy適用後、次も確認してください。

1. TeacherでRoomを開き、Studentが同じRoomへチェックインして回答できる。
2. Teacherの `teacher_reset`、`student_evicted`、`teacher_lock_state`、`room_layout_updated` をStudentが受信できる。
3. Student JWTで他Roomおよび `room:<id>:teacher` のjoinが拒否される。
4. Student JWTによるRealtimeの直接Broadcast INSERTが拒否される。
5. Teacher JWTでTeacher制御イベントが送信できる。
6. 無効・期限切れJWTでPrivate Channel joinが拒否される。

Realtimeは権限をChannel join時に評価・キャッシュします。Policyやclaimを変えた場合はChannelを再接続して検証してください。
