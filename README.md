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
npm start
```

テスト実行:

```bash
npm test
```

## Deployment

Heroku へデプロイする場合:

```bash
git push heroku main
```

公開先:

- [https://hue360.herokuapp.com/](https://hue360.herokuapp.com/)

## Releases

現在の GitHub Releases 方針:

- `v0.14.0`: 旧 Ruby / Sinatra ベースの基準版
- `v1.0.0`: Node 化以降の現行統合版
