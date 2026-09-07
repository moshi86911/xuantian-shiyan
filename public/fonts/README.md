# 字体说明

放置字体文件：
- kaiti.woff2 - 楷体（正文）
- xingkai.woff2 - 行楷（标题）

## 免费中文字体下载

- [Noto Serif SC](https://fonts.google.com/noto/specimen/Noto+Serif+SC) - Google Fonts 上的开源中文衬线字体
- [思源宋体](https://github.com/StellarCN/scp_zh) - 中文字体开源项目

下载后将 woff2 文件放在此目录。

## 字体加载

在 `index.html` 的 `<head>` 中添加：

```html
<style>
@font-face {
  font-family: 'KaiTiCustom';
  src: url('/fonts/kaiti.woff2') format('woff2');
  font-display: swap;
}
</style>
```

或在 `src/main.ts` 中加载。
