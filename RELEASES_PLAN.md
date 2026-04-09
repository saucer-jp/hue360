# GitHub Releases Plan

## 目的

Heroku の release 履歴をそのまま GitHub Releases に写すのではなく、意味のある変更単位ごとに再整理して GitHub 上の公開履歴として管理する。

## 前提

- GitHub にはまだ tag / Release が存在しない
- Heroku の `v14` は 2016年2月18日の Ruby / Sinatra ベースの旧版
- 2026年4月8日以降に Node 化、フロントエンド整理、UI 改善が連続して実施されている
- Heroku `v15` は誤デプロイ、`v16` は rollback のため GitHub Releases の主役にはしない

## リリースの切り方

### 1. `legacy-v14`

- 対応コミット: `056876c`
- 位置づけ: 旧 Ruby / Sinatra 版の最終基準
- 用途: 2026年以降の再構築前の基準点として残す

### 2. `node-restoration`

- 対応コミット: `b7f5649`
- 含める内容:
  - `204cba1` v14 app の Node static hosting 化
  - `b7f5649` main への統合
- 位置づけ: 現行アプリの再出発点
- Heroku 対応: `v17`

### 3. `frontend-modernization`

- 対応コミット: `e1e9444`
- 含める内容:
  - `be919dd` ES modules 化
  - `d371f1a` SCSS 依存除去
  - `db26734` YUI 依存除去
  - `b012432` 色相環描画最適化
  - `e9b1758` バージョン表記除去
  - `e1e9444` コピーライト表記除去
- 位置づけ: 保守性改善フェーズ
- Heroku 対応: `v18` から `v21`

### 4. `slider-and-color-tuning`

- 対応コミット: `625e769`
- 含める内容:
  - `45dbbe9` Hue / Chroma スライダ化
  - `a528c81` 最薄 Chroma の白飛び抑制
  - `f30d0fb` デフォルト値変更
  - `625e769` Brightness チップでも背景色設定可能に
- 位置づけ: 現在の最新 UI / 色調整版
- Heroku 対応: `v22` から `v24`

## Releases に含めないもの

- Heroku `v15`: package.json の誤デプロイ
- Heroku `v16`: `v14` への rollback

これらは GitHub Releases として独立させず、必要なら補足メモにのみ残す。

## Release ノートの構成

各 Release は次の 4 セクションで統一する。

1. Summary
2. Added / Changed / Removed
3. Deployment note
4. Commit range

## Heroku 対応表

- Heroku `v14`: legacy baseline
- Heroku `v15`: 誤デプロイ、採用しない
- Heroku `v16`: rollback、採用しない
- Heroku `v17`: node-restoration
- Heroku `v18` から `v21`: frontend-modernization
- Heroku `v22` から `v24`: slider-and-color-tuning

## 実施ステップ

1. retroactive tag を 4 本作成する
2. 各 tag を元に GitHub Releases を作成する
3. `v15` / `v16` は Release 化しない
4. `625e769` を current release として扱う
5. 今後は意味のある変更単位ごとに tag + Release を切る運用へ移行する

## 備考

Heroku の release 番号はデプロイ履歴としては有用だが、そのまま GitHub Releases に持ち込むと運用上のノイズが大きい。そのため、GitHub Releases 側ではユーザーや開発者が読みやすい変更単位を優先する。
