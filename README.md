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
- 起動時は `npm start` で `dist/` を配信します。
- `https://hue360.herokuapp.com/` へのアクセスは `https://www.hue360.me/` へ恒久的にリダイレクトします。

```bash
git push heroku main
```

公開先:

- [https://hue360.herokuapp.com/](https://hue360.herokuapp.com/)

## Releases

現在の GitHub Releases 方針:

- `v0.14.0`: 旧 Ruby / Sinatra ベースの基準版
- `v1.0.0`: Node 化以降の現行統合版

## トーンと彩度

- 同じ半径のリングではOKLCHの明るさLを揃えることを基本にし、明部の彩度Cは鮮やかさを優先します。基準トーンのLが0.65以上では、全生成色相に共通して使えるCから、各色相がsRGB内で使えるCまでの差を90%戻します。
- 純色に近い明るい外周では、赤・青・黄の彩度をさらに引き出します。色相を保ち、基準Lから赤は最大−0.04、青は最大−0.045、黄は最大＋0.14の範囲で、より高いCを使える明るさを探します。黄色を重点的に明るくし、3色付近の彩度は色域上限へ近づけます。補正は近隣色相や内側のリングへ滑らかに弱め、最内周ではゼロにします。明度0で最も強く、明度4〜9では補正しないため、暗部の均質化と明度下限は保たれます。
- 暗部では青などの彩度が突出しないよう、Lが0.45以下の復元後Cを共通Cの1.5倍までに抑えます。Lが0.45〜0.65の間では、この制限を滑らかに緩めます。特定の色相だけを補正せず、明るさと色相を保ったままリング内の彩度差を減らします。
- Color SpaceのMunsell／RGB／RGB+は、色相配列と基準の明るさを選びます。基準Lは固定20色の平均から求めるため、Hue Stepで基準の明るさは変わりません。彩度の共通基準は生成する色相集合に依存するため、Hue Stepを変えると鮮やかさが多少変わる場合があります。
- RGBの中間色相は従来と同じHSB補間を基準にし、Munsell／RGB+はOKLCHの色相を補間します。画面上の角度をそのままOKLCHの色相には使いません。
- 外周は色相別のsRGB上限を基準にし、内側へ要求彩度を単調に下げます。最内周の要求値は各色相の外周上限の12%とし、各リングの色域とひとつ外側の彩度で制限して逆転を防ぎます。明度0の最内周には純白を避ける明るさの余裕を残します。
- 明度9の終点は黒ではなく、外周L=0.36・最内周L=0.30の暗色です。各リングの基準の最明色とこの暗色の間をLで9等分して、10段階の明度を作ります。赤・青・黄の明部には上述の補正を加えるため、その部分のL間隔は等間隔ではありませんが、段階を下げると各色は暗くなります。これらの値と彩度の復元率は視覚調整用の設計値です。左の白黒チップは明度段階の選択とShiftクリックによる背景色指定を兼ね、黒いチップを選んでも色相環は黒一色になりません。
- 各リングの基準Lは表示可能な中立グレーのHEXを基準にします。純色付近の補正と色域探索後、色付きHEXへの丸めは最後に行い、画面・選択色・印刷に同じHEXを使います。CSSのグレースケール表示を一致させる処理ではありません。
- 従来方式との切り替えや彩度復元の操作項目はありません。20色相の外周も含め、固定色の表示HEXとは異なります。
- 最終的な8bit HEXの丸めによる差は残ります。明るさを揃えても彩度は色相ごとに異なります。またOKLabは知覚の近似なので、背景や観察環境を含む見た目の完全一致を保証するものではありません。

共通彩度と色相別の彩度復元の考え方はauto-color-paletteを参考にしています。HUE360では暗部の突出した彩度に上限を設け、明部の鮮やかさと両立させています。色変換には既存のCuloriを使用しています。

## Munsell Notation Source

- `public/js/resources/fixed-color-resources.js` の `munsell` 配列に付けている notation コメントは、Munsell Color の notation 一覧を基準にしています。
- 参照元:
  - [Munsell Color - List of Colors by Notation Name](https://munsell.com/faqs/list-of-colors-by-notation-name/)
- `munsell` 配列の `HEX` 値は、Munsell が公式に配布している `sRGB` / `HEX` 値ではありません。
- このアプリでは、notation を起点に RIT Munsell Color Science Lab の renotation data (`scripts/data/munsell-renotation-real.dat`) から `CIE x y Y` を引き、`XYZ` へ変換したうえで illuminant C から D65 へ Bradford 順応し、最後に `sRGB` / `HEX` へ変換した結果を固定値として採用しています。
- 参照元:
  - [RIT Munsell Renotation Data](https://www.rit-mcsl.org/MunsellRenotation/)
- 固定 `HEX` 値は上記変換結果を色相配列・基準トーンの入力として保持したもので、ランタイムでは notation から再計算していません。表示色にはトーンの均質化を適用するため、固定 `HEX` とは異なり、元の Munsell notation の再現値ではありません。
- 再生成が必要な場合は次を実行します。

```bash
npm run generate:munsell
```

- 変換ロジックは `public/js/core/munsell-renotation.js`、固定リソース更新スクリプトは `scripts/generate-munsell-fixed-colors.js` にあります。
