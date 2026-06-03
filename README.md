# 人孔圖資互動地圖

這是由 `人孔圖資清單OK.csv` 轉出的靜態互動地圖。入口檔案是 `index.html`，可直接部署到 GitHub Pages、Vercel、Netlify，或任何靜態網站主機。

## 本機使用

直接開啟 `index.html` 就可以使用地圖。資料已嵌入頁面，不需要另外啟動資料庫。

若要用新的 CSV 重新產生資料，請安裝 Node.js 後在此資料夾執行：

```powershell
node .\scripts\rebuild-from-csv.mjs "C:\Users\abccm\OneDrive\桌面\人孔圖資清單OK.csv"
```

腳本會自動辨識 UTF-8 或 Big5 編碼，並將 TWD97 / TM2 121 座標轉為 WGS84 經緯度。

## 圖層

- 人孔點位：由 `人孔圖資清單OK.csv` 轉出並嵌入 `index.html`。
- OpenStreetMap：底圖。
- `農田水利灌排渠道系統查詢`：來自 `https://www.iacloud.ia.gov.tw/servergate/sgsgate.ashx/WMS/canal_public`，layer 名稱為 `canal_public`。

控制面板中的「臺北市雨水人孔查詢」與「農田水利灌排渠道系統查詢」可以同時勾選；同時勾選時會在人孔點位上疊加灌排渠道 WMS。

勾選「農田水利灌排渠道系統查詢」時，可在地圖上點選位置，以 WMS `GetFeatureInfo` 查詢單一渠道細項。
查詢結果會在地圖 popup 顯示「管理處」、「渠道名」、「屬性」欄位。

農田水利灌排渠道系統分類依據「農田水利署灌排渠道系統圖(WMS)載入操作流程及代碼名稱對照表_20240305v2」：

- 管理處別：宜蘭、北基、桃園、石門、新竹、苗栗、臺中、南投、彰化、雲林、嘉南、高雄、屏東、臺東、花蓮、七星、瑠公管理處。
- 渠道屬性：灌溉專用渠道、下游具引灌需求、下游不具引灌需求。
- 管理處別：放在農田水利查詢的第一個選項。
- 渠道名稱、渠道屬性：由 `渠道名稱.xlsx` 明細彙整為下拉選單；選取管理處別後，只顯示該管理處的渠道名稱與渠道屬性。

設定農田水利分類後按「查詢」，地圖會自動縮放到符合條件的渠道範圍；再點選地圖上的渠道查看符合分類的細項。

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
