# 人孔圖資互動地圖

這是由 `人孔圖資清單OK.csv` 轉出的靜態互動地圖。入口檔案是 `index.html`，可直接部署到 GitHub Pages、Vercel、Netlify，或任何靜態網站主機。

## GitHub Pages 部署

1. 在 GitHub 建立一個新的 repository，例如 `manhole-map`。
2. 上傳此資料夾內的 `index.html`、`.nojekyll` 和整個 `assets/` 資料夾到 repository 根目錄。
3. 進入 repository 的 `Settings` -> `Pages`。
4. `Build and deployment` 選擇 `Deploy from a branch`。
5. Branch 選擇 `main`，Folder 選擇 `/root`，按 `Save`。

部署完成後，網址會像：

```text
https://你的帳號.github.io/manhole-map/
```

## Google Cloud 部署

最簡單的方式是使用 Cloud Storage 靜態網站代管：

1. 建立一個 Cloud Storage bucket。
2. 上傳 `index.html` 和整個 `assets/` 資料夾。
3. 將 bucket 設為公開讀取。
4. 設定靜態網站入口頁為 `index.html`。
