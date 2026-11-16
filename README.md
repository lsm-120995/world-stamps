# 🌏 アースクイズ / Earth Quiz

地球儀を回して世界の国や名所を当てる、のんびり楽しむ地理クイズです。ブラウザだけで動きます。

A relaxed geography quiz played on a spinning globe. Runs in the browser. Available in Japanese, English, Simplified Chinese, Traditional Chinese and Korean.

## 遊べること

- **国をさがせ！**：国名を見て、地球儀の上でその国をタップ
- **この国はどこ？**：光っている国を4択で答える
- **首都クイズ**：首都名から国をタップ
- **都市・名所クイズ**：山や都市の場所をタップ（近ければ正解）
- **じゆうに見る**：地名つきの地図で、世界を自由に見てまわる
- **場所をしらべる**：日本の郵便番号や地名から、その場所の概要を表示
- **スタンプ帳**：正解した国（170）と名所（92）のスタンプを集める

言語は日本語・English・简体中文・繁體中文・한국어 から選べます。

## 手元で動かす

[Node.js](https://nodejs.org/) が入っていれば、次のコマンドで起動できます。

```bash
node serve.js
```

起動したら、ブラウザで `http://localhost:8080` を開きます。インターネット接続が必要です（地図データなどを読み込むため）。

## ファイルの構成

| ファイル | 内容 |
|---|---|
| `index.html` / `style.css` | 画面 |
| `game.js` | 地球儀・クイズ・スタンプ帳・検索の本体 |
| `countries.js` | 国のデータ（日本語名・首都・地域・難易度） |
| `places.js` | 都市・名所のデータ（位置・種類・難易度） |
| `names.js` | 国名・首都・名所名の翻訳（英・簡・繁・韓） |
| `lookup_notes.js` | 「場所をしらべる」で出すゲーム独自の豆知識（5言語） |
| `i18n.js` | 画面の文言の翻訳と、言語の切りかえ |
| `feedback.js` | ゲーム内の意見フォーム |
| `apps-script/Code.gs` | 意見をメールで届ける中継役（Google Apps Script に置いて使う） |
| `serve.js` | 手元で確認するための簡易サーバー |

## 意見・修正の送り方

翻訳の間違い、追加してほしい国や名所、不具合、新しい遊びのアイデアなど、なんでも歓迎です。日本語・英語・中国語・韓国語のどれで書いていただいてもかまいません。送り方は2つあります。

- **ゲームの中から送る**：メニューのいちばん下の「💬 意見・まちがいを送る」を押すと、その場で書いて送れます。登録やログインは不要です。内容は作者にメールで届き、公開はされません。
- **このリポジトリの Issues に書く**：スクリーンショットを付けたいときや、返事が欲しいときはこちらが便利です（GitHub のアカウントが必要です）。

いただいた意見は作者が確認し、取り入れるものを選んで、こちらで修正します。そのため、プログラムを直接書きかえた修正案（Pull Request）は受け付けていません。「どこを、どう直してほしいか」を言葉で教えてください。

意見を書くときは、次のことがあると助かります。

- どの言語で遊んでいたか
- どの画面・どのモードの話か
- 翻訳の間違いなら、今の表記と、正しいと思う表記

### 大事にしていること

- **のんびり楽しめること。** 急がせたり、間違いを責めたりする仕組みは入れません。
- **遊んでいる間はAIを使わないこと。** 利用料や登録なしで、誰のブラウザでも同じように動きます。
- **国境や地名で意見が分かれる場所は、中立に扱うこと。** 帰属に争いのある地域はクイズに出していません。

## 使っている外部のデータとサービス

このゲームは、次のものを読み込んで動いています。

| 用途 | 提供元 |
|---|---|
| 地球儀の描画 | [D3](https://d3js.org/)、[TopoJSON](https://github.com/topojson/topojson) |
| 国の形のデータ | [world-atlas](https://github.com/topojson/world-atlas)（もとは [Natural Earth](https://www.naturalearthdata.com/)） |
| 地名つきの地図の描画 | [MapLibre GL JS](https://maplibre.org/) |
| 地名つきの地図のデータ | [OpenFreeMap](https://openfreemap.org/) © [OpenMapTiles](https://openmaptiles.org/)、データは © [OpenStreetMap](https://www.openstreetmap.org/copyright) の協力者 |
| 場所の概要の文章 | [Wikipedia](https://www.wikipedia.org/)（CC BY-SA）、位置の補完に [Wikidata](https://www.wikidata.org/) |
| 郵便番号の検索 | [HeartRails Geo API](https://geoapi.heartrails.com/) |
| 文字の書体 | [M PLUS Rounded 1c](https://fonts.google.com/specimen/M+PLUS+Rounded+1c)（Google Fonts） |

「場所をしらべる」に入力した郵便番号と地名は、検索のために上の外部サービスへ送られます。

国名・首都・名所名の翻訳と画面の文言は、AI（Claude）が下書きしたものです。誤りを見つけたら、ぜひ教えてください。

## 利用について

このゲームは、どなたでも無料で遊べます。

プログラムとデータの著作権は作者にあります。ソースコードは公開していますが、複製・改変・再配布を認めるライセンスは付けていません。使いたい場合は Issues でご相談ください。

上の表にある外部のデータとサービスは、それぞれの提供元の条件に従います。
