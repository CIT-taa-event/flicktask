# Task本部 管理者向け引継ぎ書

体育会本部のタスク管理アプリ「Task本部」を、作った人がいなくても動かし続け、直していくための文書です。
**このリポジトリは公開されています。パスワード・合言葉・鍵の値はここに書かないでください**（幹部の非公開の引継ぎ資料で管理）。

- アプリ: https://flicktask.junjun-tama.workers.dev
- 技術的な詳細（構成・開発・デプロイのコマンド）: [README.md](../README.md)

---

## 1. まず知っておくこと（3行）

1. アプリは **Cloudflare** という会社のサーバーで、24時間勝手に動いています。普段の管理作業はありません。
2. 毎日・毎週の自動処理（着手目安日で進行中へ、月曜の LINE まとめ）も、サーバーが勝手にやります。
3. 管理者が手を動かすのは「**何か壊れたとき**」「**機能を変えたいとき**」「**年度替わり**」だけです。

## 2. どこに何があるか

すべて **幹部の管理用の共有Googleアカウント** で入れるようにしてあります。
大学の組織アカウントは Search Console などが使えないため、管理には組織の制限がない方の共有アカウントを使っています（どちらのアカウントかは非公開の引継ぎ資料に記載）。
アプリへのログイン自体は、普段の共有アカウントで構いません。

| サービス | 何をしているか | 入り口 |
|---|---|---|
| Cloudflare | アプリ本体・データベース（D1）・自動処理・各種の鍵 | https://dash.cloudflare.com → Workers & Pages → `flicktask` |
| Google Cloud | 「Googleでログイン」の設定（OAuth クライアント） | https://console.cloud.google.com → プロジェクト番号 886333017912 → Google Auth Platform |
| Google Search Console | ログイン設定に必要な「サイトの持ち主」の証明 | https://search.google.com/search-console → `https://flicktask.junjun-tama.workers.dev/` |
| GitHub | プログラムの保管場所（このリポジトリ） | https://github.com/CIT-taa-event/flicktask （組織 `CIT-taa-event` の持ち主は管理用アカウント） |
| LINE Developers / Official Account Manager | LINE ボット「タスク本部」 | https://developers.line.biz/console/ ・ https://manager.line.biz/ |

アプリの URL（`junjun-tama.workers.dev`）は作った人の名前が入っていますが、**変えないでください**。
変えると Google のログイン設定・LINE の Webhook・カレンダー連携の登録を全部やり直すことになります。

### サーバーに登録してある鍵（値はここに書かない）

Cloudflare の `flicktask` → 設定 → 変数とシークレット に入っています。

| 名前 | 何の鍵か | 作り直す場所 |
|---|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Googleでログイン | Google Cloud → Google Auth Platform → クライアント |
| `LINE_CHANNEL_SECRET` | LINE からの通知が本物かの確認 | LINE Developers → チャネル基本設定 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE へ送る許可 | LINE Developers → Messaging API設定 |

鍵の登録・入れ替えは、PC のターミナルで `npx.cmd wrangler secret put 名前` を実行して値を貼り付けます（[5章](#5-直したいとき後任のpcで)）。

## 3. 年度替わりにやること

- [ ] 終わったイベントを「終了」にする（イベントの「編集」→ 一番下）。サイドバーの「過去資料」に年度ごとに入ります
- [ ] 新しいイベントは「＋ 新規」→「過去資料から作る」で去年のものを選ぶと、準備タスクと当日の動きを引き継げます
- [ ] イベント担当（人）は毎年変わるので、各イベントの「編集」で入れ直す
- [ ] 幹部の LINE グループが新しくなったら、ボットを招待して「LINE連携」から連携し直す
- [ ] 共有Googleアカウントのパスワードを変えたら、非公開の引継ぎ資料も更新
- [ ] 念のため、アカウントメニュー →「データを書き出す」で1年分のバックアップを保存（共有ドライブなど）

## 4. 困ったとき

| 症状 | まず確認すること | 直し方 |
|---|---|---|
| アプリが開かない・真っ白 | 別のスマホやPCでも同じか / https://www.cloudflarestatus.com に障害が出ていないか | Cloudflare 側の障害なら待つ。続くなら Cloudflare の `flicktask` → ログ（Observability）を見る |
| 「Googleでログイン」で失敗する | Google Cloud のクライアントが消えていないか、Search Console の確認が外れていないか | クライアントを作り直したら鍵2つを入れ替える（2章） |
| LINE ボットが返事しない | LINE Developers の「Messaging API設定」で Webhook の「検証」が成功するか | 失敗するなら `LINE_CHANNEL_SECRET` が違う。アクセストークンを再発行したら `LINE_CHANNEL_ACCESS_TOKEN` を入れ替える |
| 月曜の LINE まとめが来ない | その週に締切も予定もないと送りません。LINE公式アカウントの無料枠（月200通）が尽きていないか | 枠は「通知1回 × グループ人数」で減ります。翌月に戻ります |
| カレンダー連携に反映されない | Googleカレンダーは数時間おきにしか取りに来ません | 半日待つ。URL が漏れたら「カレンダー連携」→「URLを作り直す」 |
| データを間違って消した | 消した直後ならアプリの「元に戻す」 | Cloudflare D1 には過去の時点に戻す機能（Time Travel）があります。README のコマンドと Cloudflare のドキュメントを見ながら、慎重に |
| 有料の請求が来た | 基本はすべて無料プランの範囲で動いています | Cloudflare の「請求」でカードが登録されていないか確認 |

## 5. 直したいとき（後任のPCで）

機能を変えたり不具合を直したりするときは、PC に **Claude Code**（AI のプログラミング助手）を入れて、日本語で頼むのが一番早いです。
このリポジトリには、プログラムと一緒に動作確認用のテスト（`tests/`）が入っているので、直したあと壊れていないかを確かめられます。

### 最初の1回だけ（準備）

1. **Node.js**（LTS 版）をインストール … https://nodejs.org/
2. **Git** をインストール … https://git-scm.com/
3. **Claude Code** をインストール … https://claude.com/claude-code
4. このリポジトリを手元にコピー: `git clone https://github.com/CIT-taa-event/flicktask.git`
5. コピーしたフォルダで `npm install`
6. Cloudflare に共有アカウントでログイン: `npx.cmd wrangler login`（ブラウザで「許可」を押す）

Windows の PowerShell では `npx` が安全設定で止められることがあるので、`npx.cmd` と打ってください。

### 直すときの流れ

1. Claude Code をこのフォルダで開き、「〇〇を△△に変えて。README.md と docs/HANDOVER.md を読んでから」と頼む
2. 手元で動かして確認（`npm run dev` → ブラウザで http://localhost:5173 ）
3. テストを通す（`npm test`）
4. データベースの形を変えた場合だけ: `npm run db:migrate:remote`
5. 本番に反映: `npm run deploy`
6. 本番の確認テスト: `BASE_URL=https://flicktask.junjun-tama.workers.dev npx.cmd playwright test`
7. GitHub に保存: `git add -A` → `git commit -m "何を変えたか"` → `git push`

うまくいかなかったら、`npm run deploy` の前なら本番には影響しません。反映後に問題が出たら、Cloudflare の `flicktask` → デプロイ から1つ前の版に戻せます。

## 6. アプリでできること（覚え書き）

- **ホーム**: これからの流れ（全イベントの締切の流れ）／やること（イベントごとに折りたたみ。締切1か月以内と、着手目安日1週間以内の未着手）／直近の予定
- **イベント画面**: 準備（未着手・進行中・完了のボード、担当別タイムライン）／当日の動き（当日モード）／予定／メモ（昨年の申し送りが横に出る）
- **着手目安日**: その日になると、未着手のタスクは自動で進行中へ（その日に手で戻したものはそのまま）
- **カレンダー**: 日付をタップでその日の時間割。空いている時間や「終日」から、イベントに入らない予定も追加できる
- **LINE**: 「やること」「今週」、イベント名（一部でも可）で返事。毎週月曜10時に今週のまとめ
- **カレンダー連携**: Googleカレンダー / iPhone のカレンダーに本番・予定・締切を表示（ウィジェットにも出る）
- **過去資料**: 終了したイベントを年度ごとに保管。新しいイベントを作るときに引き継げる

## 7. 引継ぎの状況（2026年12月）

| 項目 | 状況 |
|---|---|
| Google Search Console に管理用アカウントの確認ファイル | 済（11/26） |
| Google Cloud のオーナーに管理用アカウント・ブランディングの連絡先 | 済（11/26） |
| Cloudflare に管理用アカウント（Super Administrator） | 済（11/26） |
| GitHub を組織 `CIT-taa-event` へ移動 | 済（11/26） |
| LINE 公式アカウント | 共有メールで作成済み |
| プライバシーポリシー・利用規約の連絡先を共有メールへ | 済（11/26） |
| 後任のPC準備と、後任だけでの更新・反映 | 未（12月中旬） |
| 作成者のアクセスを各サービスから外す | 未（12/31） |

## 8. 管理者の交代メモ

| 時期 | 管理者 | メモ |
|---|---|---|
| 〜2026年12月 | 初代（作成者） | 作成・運用開始 |
| 2027年1月〜 | （後任の名前を書く） | |
