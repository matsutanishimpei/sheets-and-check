# Seats & Check API仕様

実装は `packages/backend/src/index.ts` です。JSON requestはZodで検証されます。Teacher保護APIは `Authorization: Bearer <TEACHER_JWT>`、Student relayは `Authorization: Bearer <STUDENT_SUPABASE_JWT>` が必要です。JWTやKeyの実値をログ・Issue・資料へ貼らないでください。

## 一覧

| Method | Path | 認証 |
| --- | --- | --- |
| GET | `/api/hello` | なし |
| GET | `/api/rooms/:id` | なし |
| POST | `/api/rooms/:id/student-token` | なし |
| POST | `/api/rooms/:id/student-event` | Student JWT |
| POST | `/api/auth/teacher/login` | なし |
| GET | `/api/rooms` | Teacher JWT |
| POST | `/api/rooms` | Teacher JWT |
| PUT | `/api/rooms/:id` | Teacher JWT |
| PATCH | `/api/rooms/:id/status` | Teacher JWT |
| DELETE | `/api/rooms/:id` | Teacher JWT |
| GET | `/api/teachers` | Teacher JWT |
| POST | `/api/teachers` | Teacher JWT |
| DELETE | `/api/teachers/:id` | Teacher JWT |

## 共通エラー

- Zod validation failure: `400`
- Teacher JWTなし・無効・期限切れ: `401 { "error": "Unauthorized", "code": "AUTH-T-01" }`
- 想定外のAPI内部障害: `500`。productionでは元例外をレスポンスへ含めず、Worker logへ残します。
- Room POST/PUTは64 KiBを超える本文を `413` で拒否します。

## Public API

### `GET /api/hello`

`200`: `{ "message": "Hello Hono!" }`

### `GET /api/rooms/:id`

Roomの公開参加情報を返します。認証はありません。

`200`:

```json
{
  "id": "<room-uuid>",
  "name": "講義室A",
  "grid": [{ "x": 1, "y": 1, "type": "student" }],
  "isActive": true
}
```

`404`: Roomなし。`500`: Repository障害。Supabase URL/keyは返しません。

### `POST /api/rooms/:id/student-token`

Request:

```json
{ "studentId": "STU001", "name": "学生 太郎" }
```

`studentId` は5〜15文字の英数字、`name` は1〜100文字です。Room受付中なら、6時間有効のStudent Realtime JWTを返します。

`200`:

```json
{
  "supabaseToken": "<student-jwt>",
  "studentId": "STU001",
  "name": "学生 太郎",
  "roomId": "<room-uuid>"
}
```

`400`: 入力不正。`403`: Room受付停止。`404`: Roomなし。`500`: JWT設定・内部障害。このチェックインは強い本人確認ではありません。ただし発行後のRoom境界とrelay本人情報はJWT claimで固定されます。

### `POST /api/rooms/:id/student-event`

Student回答専用の認証付きHTTP relayです。StudentはTeacher Inboxへ直接Broadcastしません。

Request header: `Authorization: Bearer <STUDENT_SUPABASE_JWT>`

```json
{ "seatId": "1,1", "status": "ok", "comment": "理解できました" }
```

`status` は `ok` / `ng` / `none`、`comment` は任意で最大1000文字です。余分なfieldを拒否するため、本文の `studentId`、`studentName`、Teacher制御eventは受理されません。WorkerはJWTの `roomId` をpathと照合し、`studentId` と `name` をclaimから取得して `room:<roomId>:teacher` へREST Broadcastします。

`200`: `{ "success": true }`

- `400`: 本文不正・余分な本人情報
- `401`: JWTなし、無効、期限切れ、別Room、claim不正
- `403`: Roomなしまたは受付停止（存在有無を区別しません）
- `502 { "error": "Student event could not be delivered", "code": "RT-RELAY-01" }`: Supabase relay通信・非2xx
- `503 { "error": "Student event could not be delivered", "code": "CFG-SB-01" }`: WorkerのSupabase relay設定不足
- `500`: その他の内部障害

Supabaseの非2xx本文はユーザーへ返しません。

### `POST /api/auth/teacher/login`

Request:

```json
{ "username": "teacher_name", "password": "<password>" }
```

`200`:

```json
{
  "token": "<24-hour-app-jwt>",
  "supabaseToken": "<12-hour-realtime-jwt>",
  "teacher": { "id": "<teacher-uuid>", "username": "teacher_name" }
}
```

`400`: 入力不正。`401`: 資格情報不一致。`429`: isolate内の失敗回数制限。`500`: production Secret未設定等。代表的な認証障害は `AUTH-T-01` を返しますが、資格情報の成否理由やSecret名・値は返しません。

## Teacher認証必須API

### `GET /api/rooms`

`200`: `{ "rooms": [ ... ] }`。一覧ではgridを省略します。`500`: Repository障害。

### `POST /api/rooms`

```json
{
  "name": "講義室A",
  "grid": [{ "x": 1, "y": 1, "type": "student" }],
  "isActive": true
}
```

`201`: UUIDを付与したRoom。`400`: validation（Supabase接続fieldを含む余分なfieldも拒否）。`413`: 本文超過。`500`: Repository障害。

### `PUT /api/rooms/:id`

Request validationはPOSTと同じです。`200`: 更新済みRoom。`400`: validation。`404`: Roomなし。`413`: 本文超過。`500`: Repository障害。

### `PATCH /api/rooms/:id/status`

Request: `{ "isActive": false }`。`200`: `{ "id": "<room-uuid>", "isActive": false }`。`400`: 入力不正。`404`: Roomなし。`500`: Repository障害。

### `DELETE /api/rooms/:id`

`200`: `{ "success": true, "id": "<room-uuid>" }`。`404`: Roomなし。`500`: Repository障害。

### `GET /api/teachers`

`200`: `{ "teachers": [{ "id", "username", "createdAt", "lastLoginAt" }] }`。password hashはRepository契約上返しません。`500`: Repository障害。

### `POST /api/teachers`

RequestはTeacher loginと同じschemaです。`201`: `{ "success": true, "teacher": { "id", "username" } }`。`400`: 入力不正またはusername重複。`500`: Repository障害。

### `DELETE /api/teachers/:id`

`200`: `{ "success": true, "id": "<teacher-uuid>" }`。`400`: ログイン中の自分自身の削除。`500`: Repository障害。
