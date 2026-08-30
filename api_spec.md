# Seats & Check — API 仕様書 (API Specification)

本プロジェクトにおける、Hono (Backend / Cloudflare Workers) で提供されている REST API および Hono RPC 連携用の仕様書です。
API 通信は `@my-app/shared` の Zod スキーマによる型安全なバリデーションが適用されており、フロントエンドからは Hono RPC クライアント (`hc`) を介して完全に型安全な状態で呼び出すことができます。

---

## 🏗️ 共通仕様

### ベース URL
* **ローカル開発環境**: `http://127.0.0.1:8787`
* **本番環境 (Cloudflare Workers)**: `https://[WORKER_NAME].[SUBDOMAIN].workers.dev`

### 認証方式
教員向けの保護されたエンドポイントは、リクエストヘッダーに **Bearer トークン** を付与する必要があります。
```http
Authorization: Bearer <TEACHER_JWT_TOKEN>
```

---

## 📂 API エンドポイント一覧

| メソッド | パス | 保護 | 説明 |
| :--- | :--- | :---: | :--- |
| **GET** | `/api/hello` | 🟢 | API ヘルスチェック |
| **GET** | `/api/rooms` | 🔴 | 登録されている全教室の一覧を取得 |
| **GET** | `/api/rooms/:id` | 🟢 | 指定された教室のグリッド・レイアウト設定を取得 |
| **POST** | `/api/rooms` | 🔴 | 新しい教室レイアウトを新規登録 (UUIDを自動生成) |
| **PUT** | `/api/rooms/:id` | 🔴 | 既存の教室レイアウト・接続設定を上書き更新 |
| **PATCH** | `/api/rooms/:id/status` | 🔴 | 教室のチェックイン受付状態 (Open/Closed) のトグル |
| **DELETE** | `/api/rooms/:id` | 🔴 | 教室情報をデータベースから物理削除 |
| **POST** | `/api/auth/teacher/login` | 🟢 | 教員アカウントの認証 (ログイン) および JWT の発行 |
| **POST** | `/api/rooms/:id/student-token` | 🟢 | 学生用のリアルタイム接続検証 JWT トークンの発行 |
| **POST** | `/api/rooms/:id/student-event` | 🟡 | 学生JWTを検証して回答をTeacher専用Topicへ中継 |
| **GET** | `/api/teachers` | 🔴 | 登録されている教員アカウントの一覧を取得 |
| **POST** | `/api/teachers` | 🔴 | 新規教員アカウントを登録 (パスワード自動ハッシュ化) |
| **DELETE** | `/api/teachers/:id` | 🔴 | 指定された教員アカウントの削除 (自分自身は削除不可) |

> 🔴 = Teacher JWT必須 / 🟡 = Student Supabase JWT必須 / 🟢 = パブリックアクセス

---

## 🛰️ 各エンドポイント詳細

### 1. ヘルスチェック
API サーバーが正常に稼働しているかを確認します。

* **メソッド**: `GET`
* **パス**: `/api/hello`
* **レスポンス**: `200 OK`
  ```json
  {
    "message": "Hello Hono!"
  }
  ```

---

### 2. 教室一覧取得
登録されている教室（UUID と教室名、Supabase URL等）のリストを返します。

* **メソッド**: `GET`
* **パス**: `/api/rooms`
* **ヘッダー**: `Authorization: Bearer <TEACHER_JWT_TOKEN>`
* **レスポンス**: `200 OK`
  ```json
  {
    "rooms": [
      {
        "id": "045415f5-abb5-4c8b-ac50-4a5979547ba3",
        "name": "203講義室 (水曜2限)",
        "supabaseUrl": "https://fdqjupakrmaubxwaapbn.supabase.co",
        "supabaseAnonKey": "eyJhbGciOi..."
      }
    ]
  }
  ```

---

### 3. 教室レイアウト取得
指定された教室のレイアウト、ドラッグ＆ドロップ用グリッド情報、接続情報を取得します。

* **メソッド**: `GET`
* **パス**: `/api/rooms/:id`
* **レスポンス**: `200 OK`
  ```json
  {
    "id": "045415f5-abb5-4c8b-ac50-4a5979547ba3",
    "name": "203講義室 (水曜2限)",
    "grid": [
      { "id": "cell-1", "x": 0, "y": 0, "type": "student", "label": "A-1" }
    ],
    "isActive": true,
    "supabaseUrl": "https://fdqjupakrmaubxwaapbn.supabase.co",
    "supabaseAnonKey": "eyJhbGciOi..."
  }
  ```
* **エラー**: `404 Not Found` (指定された教室が存在しない)

---

### 4. 教室レイアウト新規登録
新しい教室を登録します。教室 ID (UUIDv4) はバックエンド側で自動生成されます。

* **メソッド**: `POST`
* **パス**: `/api/rooms`
* **ヘッダー**: `Authorization: Bearer <TEACHER_JWT_TOKEN>`
* **バリデーションスキーマ**: `SaveRoomLayoutInputSchema` (Zod)
* **リクエストボディ**:
  ```json
  {
    "name": "304講義室",
    "grid": [],
    "supabaseUrl": "https://your-supabase.supabase.co",
    "supabaseAnonKey": "your-anon-key",
    "isActive": true
  }
  ```
* **レスポンス**: `201 Created`
  ```json
  {
    "id": "bc86298a-8a8b-4b13-8eb0-f925c48b262a",
    "name": "304講義室",
    "grid": [],
    "isActive": true,
    "supabaseUrl": "https://your-supabase.supabase.co",
    "supabaseAnonKey": "your-anon-key"
  }
  ```

---

### 5. 教室レイアウト上書き更新
既存の教室のグリッド配置、Supabase 設定情報などを上書き更新します。

* **メソッド**: `PUT`
* **パス**: `/api/rooms/:id`
* **ヘッダー**: `Authorization: Bearer <TEACHER_JWT_TOKEN>`
* **バリデーションスキーマ**: `SaveRoomLayoutInputSchema` (Zod)
* **リクエストボディ**: (POST 形式と同様)
* **レスポンス**: `200 OK` (更新されたデータモデル)
* **エラー**: `404 Not Found` (対象の部屋が存在しない)

---

### 6. 受付状態 (Open/Closed) のトグル
教室の着席・チェックインを受け付けるかどうかの状態を軽量に変更します。

* **メソッド**: `PATCH`
* **パス**: `/api/rooms/:id/status`
* **ヘッダー**: `Authorization: Bearer <TEACHER_JWT_TOKEN>`
* **リクエストボディ**:
  ```json
  {
    "isActive": false
  }
  ```
* **レスポンス**: `200 OK`
  ```json
  {
    "id": "bc86298a-8a8b-4b13-8eb0-f925c48b262a",
    "isActive": false
  }
  ```

---

### 7. 教室削除
教室を物理的にデータベースから削除します。

* **メソッド**: `DELETE`
* **パス**: `/api/rooms/:id`
* **ヘッダー**: `Authorization: Bearer <TEACHER_JWT_TOKEN>`
* **レスポンス**: `200 OK`
  ```json
  {
    "success": true,
    "id": "bc86298a-8a8b-4b13-8eb0-f925c48b262a"
  }
  ```
---

### 8. 教員ログイン
教員のログインを認証し、アプリ管理用のセッション JWT および Supabase Realtime 購読を認可するためのセキュリティトークンを返します。

* **メソッド**: `POST`
* **パス**: `/api/auth/teacher/login`
* **バリデーションスキーマ**: `TeacherLoginInputSchema` (Zod)
* **リクエストボディ**:
  ```json
  {
    "username": "teacher_admin",
    "password": "adminpassword123"
  }
  ```
* **レスポンス**: `200 OK`
  ```json
  {
    "token": "eyJhbGciOi...", // アプリケーション管理用 JWT トークン (有効期間24時間)
    "supabaseToken": "eyJhbGciOi...", // Supabase 認証用カスタムクレームトークン
    "teacher": {
      "id": "teacher-default-uuid",
      "username": "teacher_admin"
    }
  }
  ```
* **エラー**: `401 Unauthorized` (ユーザー名またはパスワードが正しくない場合)

---

### 9. 学生チェックイン用リアルタイム認証
学生が該当教室に接続する際、安全に Supabase Realtime に購読を認可するための署名トークンを取得します。

* **メソッド**: `POST`
* **パス**: `/api/rooms/:id/student-token`
* **リクエストボディ**:
  ```json
  {
    "studentId": "24JZ0101",
    "name": "電電 太郎"
  }
  ```
* **レスポンス**: `200 OK`
  ```json
  {
    "supabaseToken": "eyJhbGciOi...",
    "studentId": "24JZ0101",
    "name": "電電 太郎",
    "roomId": "bc86298a-8a8b-4b13-8eb0-f925c48b262a"
  }
  ```
* **エラー**: `403 Forbidden` (`isActive === false` のRoom)

---

### 9.5 学生回答中継
学生用JWTを検証し、本文の本人情報を信用せずJWT claimの `studentId` / `name` を付与して `student_to_teacher` を中継します。

* **メソッド**: `POST`
* **パス**: `/api/rooms/:id/student-event`
* **ヘッダー**: `Authorization: Bearer <STUDENT_SUPABASE_JWT>`
* **本文**: `seatId`, `status`, 任意の `comment` のみ。`studentId` と氏名はJWT claimから決定され、本文へ含めると拒否されます。
* **エラー**: `401` (無効JWT・別Room), `403` (Room closed), `400` (余分な本人情報やTeacherイベント)

---

### 10. 教員アカウント一覧
現在登録されている全教員の情報を返します。ログイン中のパスワードハッシュはセキュアに秘匿されます。

* **メソッド**: `GET`
* **パス**: `/api/teachers`
* **ヘッダー**: `Authorization: Bearer <TEACHER_JWT_TOKEN>`
* **レスポンス**: `200 OK`
  ```json
  {
    "teachers": [
      {
        "id": "teacher-default-uuid",
        "username": "teacher_admin",
        "createdAt": "2026-05-12 15:00:00"
      }
    ]
  }
  ```

---

### 11. 新規教員アカウント登録
管理権限を持つ他の教員アカウントを新しく追加します。パスワードは自動的に `bcryptjs` (Cost Factor: 10) でハッシュ化されて永続化されます。

* **メソッド**: `POST`
* **パス**: `/api/teachers`
* **ヘッダー**: `Authorization: Bearer <TEACHER_JWT_TOKEN>`
* **バリデーションスキーマ**: `TeacherLoginInputSchema` (Zod)
* **リクエストボディ**:
  ```json
  {
    "username": "yamada_sensei",
    "password": "yamadaSecurePassword789"
  }
  ```
* **レスポンス**: `201 Created`
  ```json
  {
    "success": true,
    "teacher": {
      "id": "f89d3a7e-ca83-4902-8fc2-a89b6f4e1d3c",
      "username": "yamada_sensei"
    }
  }
  ```
* **エラー**: `400 Bad Request` (ユーザー名がすでに重複して登録されている場合)

---

### 12. 教員アカウント削除
指定された教員アカウントを削除します。ただし、セキュリティ事故を防止するため、**現在ログイン中の自分自身のアカウントを削除しようとした場合は拒否されます。**

* **メソッド**: `DELETE`
* **パス**: `/api/teachers/:id`
* **ヘッダー**: `Authorization: Bearer <TEACHER_JWT_TOKEN>`
* **レスポンス**: `200 OK`
  ```json
  {
    "success": true,
    "id": "f89d3a7e-ca83-4902-8fc2-a89b6f4e1d3c"
  }
  ```
* **エラー**: `400 Bad Request` (自分自身の削除を試みた場合)
