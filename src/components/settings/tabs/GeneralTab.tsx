import { systemInfo } from "../../../utils";
import CustomSwitch from "../CustomSwitch";

export default function GeneralTab() {
  return (
    <>
      <CustomSwitch
        settingKey="enableCategories"
        header="啟用分類"
        text="啟用分類來整理您的任務。"
      />
      <CustomSwitch
        settingKey="appBadge"
        header="應用徽章"
        text="在 PWA 圖示上顯示徽章，標示未完成的任務數量。"
        disabled={!systemInfo.isPWA || !("setAppBadge" in navigator)}
        disabledReason="此功能需要將應用安裝為 PWA，且瀏覽器須支援此功能。"
      />
      <CustomSwitch
        settingKey="doneToBottom"
        header="將已完成的任務移至底部"
        text="將已完成的任務移至清單底部，讓進行中的任務更加醒目。"
      />
      <CustomSwitch
        settingKey="showProgressBar"
        header="顯示進度條"
        text="在螢幕頂部顯示進度條，以視覺化呈現任務完成進度。"
      />
    </>
  );
}
