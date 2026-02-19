import { systemInfo } from "../../../utils";
import ShortcutItem from "../ShortcutItem";

export default function ShortcutsTab() {
  const cmdOrCtrl = systemInfo.isAppleDevice ? "Cmd" : "Ctrl";

  return (
    <>
      <ShortcutItem
        name="快速匯出"
        description="儲存所有任務並下載為 JSON 檔案"
        keys={[cmdOrCtrl, "S"]}
      />
      <ShortcutItem name="快速搜尋" description="聚焦搜尋輸入框" keys={[cmdOrCtrl, "/"]} />
      <ShortcutItem name="列印任務" description="列印目前的任務清單" keys={[cmdOrCtrl, "P"]} />
      <ShortcutItem
        name="切換主題"
        description="在淺色與深色模式之間切換"
        keys={[cmdOrCtrl, "Shift", "L"]}
      />
      {/* <ShortcutItem
        name="Toggle Sidebar"
        description="Open or close the sidebar"
        keys={[cmdOrCtrl, "B"]}
      /> */}
    </>
  );
}
