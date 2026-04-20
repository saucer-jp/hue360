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
- `munsell` 配列の `HEX` 値は、Munsell が公式に配布している `sRGB` / `HEX` 値ではありません。
- このアプリでは、notation を起点に RIT Munsell Color Science Lab の renotation data (`scripts/data/munsell-renotation-real.dat`) から `CIE x y Y` を引き、`XYZ` へ変換したうえで illuminant C から D65 へ Bradford 順応し、最後に `sRGB` / `HEX` へ変換した結果を固定値として採用しています。
- 参照元:
  - [RIT Munsell Renotation Data](https://www.rit-mcsl.org/MunsellRenotation/)
- `HEX` 値は上記変換結果をそのままアプリの代表色として固定したもので、ランタイムでは notation から再計算していません。
- 再生成が必要な場合は次を実行します。

```bash
npm run generate:munsell
```

- 変換ロジックは `public/js/core/munsell-renotation.js`、固定リソース更新スクリプトは `scripts/generate-munsell-fixed-colors.js` にあります。
