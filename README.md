# 📝 Todo App — Firebase 增強版

<p align="center"><i>基於 <a href="https://github.com/maciekt07/TodoApp">maciekt07/TodoApp</a> 的 fork，新增 Firebase Email 認證、Firestore 跨裝置即時同步，以及正體中文介面。</i></p>

![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/wangsc2024/TodoApp?color=%23b624ff)
![GitHub created at](https://img.shields.io/github/created-at/wangsc2024/TodoApp?color=%23b624ff)
![GitHub last commit](https://img.shields.io/github/last-commit/wangsc2024/TodoApp?color=%23b624ff)

## 💻 技術棧

<ul style="display: flex; flex-direction: column; gap:10px;">
  <li style="vertical-align: middle;">
    <img src="https://go-skill-icons.vercel.app/api/icons?i=react" alt="react" width="24" style="vertical-align: middle; margin-right: 4px;" /> React 19
  </li>
  <li style="vertical-align: middle;">
    <img src="https://go-skill-icons.vercel.app/api/icons?i=typescript" alt="typescript" width="20" style="vertical-align: middle; margin-right: 4px;" /> TypeScript
  </li>
  <li style="vertical-align: middle;">
    <img src="https://go-skill-icons.vercel.app/api/icons?i=vite" alt="vite" width="24" style="vertical-align: middle; margin-right: 4px;" /> Vite
  </li>
  <li style="vertical-align: middle;">
    <img src="https://go-skill-icons.vercel.app/api/icons?i=vitest" alt="vitest" width="24" style="vertical-align: middle; margin-right: 4px;" /> Vitest
  </li>
  <li style="vertical-align: middle;">
    <img src="https://go-skill-icons.vercel.app/api/icons?i=firebase" alt="firebase" width="24" style="vertical-align: middle; margin-right: 4px;" /> Firebase (Auth + Firestore)
  </li>
  <li style="vertical-align: middle;">
    <img src="https://go-skill-icons.vercel.app/api/icons?i=emotion" alt="emotion" width="24" style="vertical-align: middle; margin-right: 4px;" /> Emotion
  </li>
  <li style="vertical-align: middle;">
    <img src="https://go-skill-icons.vercel.app/api/icons?i=mui" alt="mui" width="24" style="vertical-align: middle; margin-right: 4px;" /> Material UI (MUI)
  </li>
</ul>

## ⚡ 功能特色

### 🔐 Firebase Email 認證

透過 Firebase Authentication 提供安全的帳號系統：

- 電子郵件註冊 / 登入
- 忘記密碼 / 密碼重設郵件
- 訪客模式（無需登入即可使用）
- 正體中文介面

### ☁️ Firestore 跨裝置即時同步

登入後自動將任務同步至雲端，支援多裝置即時更新：

- 首次登入自動合併本地與雲端資料
- Diff-based 增量寫入，搭配 1.5 秒 debounce 減少請求
- Real-time listeners 即時接收其他裝置的變更
- Persistent local cache + multi-tab 支援（PWA 離線可用）

### 🔗 透過連結或 QR Code 分享任務

輕鬆將任務分享給他人，支援連結與 QR Code 兩種方式。

### 🤖 AI Emoji 建議

使用 Chrome 內建的 `window.LanguageModel` API（由 Gemini Nano 驅動），根據任務名稱推薦合適的 Emoji。

> ⚠️ 需要 Chrome Canary 128+ 並安裝 Gemini Nano 模型

### 🔄 P2P 裝置同步 (WebRTC)

透過 WebRTC 點對點連線安全同步資料。裝置間透過 QR Code 配對，資料直接在裝置間傳輸，無需經過雲端伺服器。

- 任務與分類依最近編輯或刪除自動合併
- 設定等其他資料可選擇同步來源裝置

### 🎨 色彩主題與深色模式

提供多種色彩主題選擇，支援淺色/深色模式切換。

### 🗣️ 任務朗讀

使用瀏覽器原生 `SpeechSynthesis` API 朗讀任務內容，可選擇不同語音。

### 📥 匯入/匯出任務

將任務匯出為 JSON 檔案備份，或從 JSON 檔案匯入還原。[範例匯入檔案](example-import.json)

### 📴 漸進式網路應用 (PWA)

可安裝至裝置，支援離線使用，具備原生應用般的捷徑與應用徽章功能。

### ⌨️ 鍵盤快捷鍵

| 快捷鍵                         | 功能                |
| ------------------------------ | ------------------- |
| `Ctrl+S` / `Cmd+S`             | 快速匯出任務為 JSON |
| `Ctrl+Shift+L` / `Cmd+Shift+L` | 切換深色模式        |

### 📱 自訂啟動畫面

自動產生適用於各種 iOS/iPadOS 裝置的啟動畫面，支援淺色與深色模式。

產生啟動畫面：

```bash
npm run generate-splash
```

## 👨‍💻 安裝與使用

1. Clone 專案：

```bash
git clone https://github.com/wangsc2024/TodoApp.git
```

2. 進入專案目錄：

```bash
cd TodoApp
```

3. 安裝相依套件：

```bash
npm install
```

4. 設定 Firebase 環境變數：

```bash
cp .env.example .env
# 編輯 .env，填入你的 Firebase 專案設定
```

> [!NOTE] > `.env.example` 包含所需的環境變數範本。你需要在 [Firebase Console](https://console.firebase.google.com/) 建立專案，取得 API Key、Project ID 等設定值。

5. 啟動開發伺服器：

```bash
npm run dev
```

應用程式將在 [http://localhost:5173/](http://localhost:5173/) 運行。

> [!TIP]
> 行動裝置測試請使用 `npm run dev:host`，可在區域網路以 HTTPS 預覽（相機功能需要 HTTPS），終端機會顯示 QR Code 方便掃描。如需在開發模式啟用 PWA 功能，請參閱 [vite.config.ts](vite.config.ts)。

### Firestore 安全規則

專案包含 `firestore.rules` 檔案，確保每位使用者只能存取自己的資料。請透過 Firebase CLI 部署：

```bash
firebase deploy --only firestore:rules
```

## 📷 截圖

<img src="https://raw.githubusercontent.com/maciekt07/TodoApp/main/screenshots/ss1.png" width="300px" />
<img src="https://raw.githubusercontent.com/maciekt07/TodoApp/main/screenshots/ss2.png" width="300px" />
<img src="https://raw.githubusercontent.com/maciekt07/TodoApp/main/screenshots/ss3.png" width="300px" />

<img src="https://raw.githubusercontent.com/maciekt07/TodoApp/main/screenshots/sspc1.png" width="650px" />

## Credits

原始專案由 [maciekt07](https://github.com/maciekt07) 開發，採用 [MIT 授權](LICENSE)。

Fork 增強功能（Firebase 認證、Firestore 同步、正體中文介面）由 [wangsc2024](https://github.com/wangsc2024) 開發。
