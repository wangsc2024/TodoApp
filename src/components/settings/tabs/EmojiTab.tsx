import { Emoji, EmojiStyle } from "emoji-picker-react";
import CustomRadioGroup from "../CustomRadioGroup";
import { SectionDescription, SectionHeading } from "../settings.styled";
import { useOnlineStatus } from "../../../hooks/useOnlineStatus";
import { useContext, useEffect, useState } from "react";
import { UserContext } from "../../../contexts/UserContext";
import { DeleteRounded, WifiOffRounded } from "@mui/icons-material";
import { Alert, AlertTitle, Button } from "@mui/material";
import CustomSwitch from "../CustomSwitch";
import { showToast } from "../../../utils";
import type { OptionItem } from "../settingsTypes";
import { OPTION_ICON_SIZE } from "../settingsConstants";

const emojiStyles: OptionItem<EmojiStyle>[] = [
  { label: "Apple", value: EmojiStyle.APPLE },
  { label: "Facebook", value: EmojiStyle.FACEBOOK },
  { label: "Discord", value: EmojiStyle.TWITTER },
  { label: "Google", value: EmojiStyle.GOOGLE },
  { label: "原生", value: EmojiStyle.NATIVE },
].map(({ label, value }) => ({
  label,
  value,
  icon: <Emoji emojiStyle={value} unified="1f60e" size={OPTION_ICON_SIZE} />,
}));

const offlineDisabledEmojiStyles = emojiStyles
  .map((option) => option.value)
  .filter((value) => value !== EmojiStyle.NATIVE);

export default function EmojiTab() {
  const { user, setUser } = useContext(UserContext);
  const [emojiStyleValue, setEmojiStyleValue] = useState<EmojiStyle>(user.emojisStyle);
  const [hasEmojiData, setHasEmojiData] = useState<boolean>(
    !!localStorage.getItem("epr_suggested"),
  );

  const isOnline = useOnlineStatus();
  // update local state when user settings change (e.g. after P2P sync)
  useEffect(() => {
    setEmojiStyleValue(user.emojisStyle);
  }, [user.darkmode, user.emojisStyle]);

  return (
    <>
      <SectionHeading>表情符號樣式</SectionHeading>
      <CustomRadioGroup
        options={emojiStyles}
        value={emojiStyleValue}
        onChange={(val) => {
          setEmojiStyleValue(val);
          setUser((prevUser) => ({
            ...prevUser,
            emojisStyle: val,
          }));
        }}
        disabledOptions={isOnline ? [] : offlineDisabledEmojiStyles}
      />

      {!isOnline && (
        <Alert severity="warning" sx={{ mt: "8px" }} icon={<WifiOffRounded />}>
          <AlertTitle>離線模式</AlertTitle>
          您目前處於離線狀態。非原生表情符號樣式可能無法載入。
        </Alert>
      )}
      <CustomSwitch
        settingKey="simpleEmojiPicker"
        header="簡易表情符號選擇器"
        text="僅顯示最近使用的表情符號，加快載入速度。"
        disabled={!hasEmojiData}
        disabledReason="沒有最近使用的表情符號。"
      />
      <SectionHeading>表情符號資料</SectionHeading>
      <SectionDescription>清除最近使用的表情符號資料</SectionDescription>
      <Button
        variant="contained"
        color="error"
        onClick={() => {
          localStorage.removeItem("epr_suggested");
          showToast("已清除表情符號資料。");
          setHasEmojiData(false);
          if (user.settings.simpleEmojiPicker) {
            setUser((prev) => ({
              ...prev,
              settings: { ...prev.settings, simpleEmojiPicker: false },
            }));
          }
        }}
      >
        <DeleteRounded /> &nbsp; 清除表情符號資料
      </Button>
    </>
  );
}
