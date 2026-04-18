# HUE/360

HUE/360 は、色相環ベースで配色を確認・調整できるシンプルな Web アプリです。

AI エージェント向けの作業ルールは [AGENTS.md](/Users/saucerjp/works/saucer/develop/hue360/hue360/AGENTS.md) を参照してください。

## Development

依存関係をインストール:

```bash
npm install
```

ローカル起動:

```bash
npm run dev
```

テスト実行:

```bash
npm test
```

本番ビルド確認:

```bash
npm run build
```

Vite は開発サーバーとビルドを担う基盤で、アプリ自体は引き続きシンプルなフロントエンド構成です。

## Deployment

Heroku へデプロイする場合:

- デプロイ時に `heroku-postbuild` で `npm run build` を実行し、`dist/` を生成します。
- 起動時は `npm start` で `dist/` を静的配信します。

```bash
git push heroku main
```

公開先:

- [https://hue360.herokuapp.com/](https://hue360.herokuapp.com/)

## Releases

現在の GitHub Releases 方針:

- `v0.14.0`: 旧 Ruby / Sinatra ベースの基準版
- `v1.0.0`: Node 化以降の現行統合版

## Munsell Notation Source

- `public/js/resources/fixed-color-resources.js` の `munsell` 配列に付けている notation コメントは、Munsell Color の notation 一覧を基準にしています。
- 参照元:
  - [Munsell Color - List of Colors by Notation Name](https://munsell.com/faqs/list-of-colors-by-notation-name/)
- 配列中の `HEX` 値は上記 notation に対応するアプリ表示用の近似値であり、参照元が公式に提供する `sRGB` / `HEX` 値そのものではありません。
