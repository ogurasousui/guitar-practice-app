# Guitar Practice

ギター練習用のWebアプリです。ドラムとベースの簡易バッキングを流しながら、短いギターフレーズのタブ譜を見て練習できます。

公開URL:

https://ogurasousui.github.io/guitar-practice-app/

## 現在できること

- ドラムとベースの簡易バッキング再生
- 再生と停止
- BPM変更
- 1から2小節のタブ譜表示
- 練習したいフレーズの選択
- PC幅とスマホ幅のレスポンシブ表示

## 技術構成

- Vite
- React
- TypeScript
- Web Audio API
- GitHub Pages

## 開発コマンド

依存関係のインストール:

```sh
npm ci
```

ローカル起動:

```sh
npm run dev
```

ビルド確認:

```sh
npm run build
```

## 開発フロー

`main` は公開用ブランチです。開発は作業ブランチで行い、PR経由で `main` にマージします。

詳細な開発ルールとCodexレビュー方針は [AGENTS.md](./AGENTS.md) を参照してください。

## GitHub Pages

`main` にマージされると、GitHub Actionsでビルドされ、GitHub Pagesへデプロイされます。
