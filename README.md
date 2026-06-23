# 花粉滅殺スリッパー

King of Slipper 外伝ミニゲームとして作った、縦スクロール弾幕シューティングのMVPです。

## 概要

- プレイヤーはスリッパを操り、花粉の雑魚敵と一面ボス「スギノミコト」を撃破します。
- PCとスマホの両方で遊べます。
- 画像素材なしでも動くように、Canvas図形とCSS/テキスト演出で構成しています。
- 後から `assets/characters/` に立ち絵画像を置くだけで会話演出を差し替えられます。

## 操作

PC:

- 移動: 矢印キー / WASD
- 低速移動: Shift
- ショット: Z / Space
- スペルカード: X
- 会話送り: クリック / タップ / Z
- 会話スキップ: Enter

スマホ:

- 移動: 画面ドラッグ
- ショット: 自動
- 低速移動: 右下の `低速` ボタン
- スペルカード: 右下の `SPELL` ボタン

## 実装内容

- 一面道中
- ボス「スギノミコト」
- ビジュアルノベル風会話システム
- 主人公スペルカード「マスタースリッパ」
- ボススペルカード進行
- 更新情報パネル
- `version.json` によるアップデート情報管理
- `sw.js` によるService Workerキャッシュ更新

## ファイル構成

```text
index.html
style.css
game.js
version.json
sw.js
assets/
  characters/
    .gitkeep
```

## 更新管理

サイトトップの更新パネルは `version.json` を読み込みます。

バージョン更新時は次を変更してください。

1. `version.json` の `version` と `updates`
2. `sw.js` の `CACHE_VERSION`

Service Worker対応環境では、更新検知後に「更新して再読込」ボタンで新しいキャッシュを適用できます。

## ローカル実行

静的ファイルなので `index.html` を直接開いて動作確認できます。

Service Worker更新機能まで確認する場合は、ローカルサーバーで起動してください。

```bash
python -m http.server 8000
```

その後、ブラウザで `http://localhost:8000/` を開きます。
