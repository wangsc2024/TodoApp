import { useContext, useState } from "react";
import CustomRadioGroup from "../CustomRadioGroup";
import {
  SectionDescription,
  SectionHeading,
  StyledMenuItem,
  StyledSelect,
} from "../settings.styled";
import { UserContext } from "../../../contexts/UserContext";
import {
  BrightnessAutoRounded,
  DarkModeRounded,
  ExpandMoreRounded,
  LightModeRounded,
  MotionPhotosAutoRounded,
  MotionPhotosOffRounded,
  PersonalVideoRounded,
} from "@mui/icons-material";
import type { DarkModeOptions, ReduceMotionOption } from "../../../types/user";
import { SelectChangeEvent } from "@mui/material";
import { OPTION_ICON_SIZE } from "../settingsConstants";
import type { OptionItem } from "../settingsTypes";
import CustomSwitch from "../CustomSwitch";
import { useSystemTheme } from "../../../hooks/useSystemTheme";
import { Themes } from "../../../theme/createTheme";
import { ColorElement } from "../../../styles";

const darkModeOptions: OptionItem<DarkModeOptions>[] = [
  {
    label: "自動",
    value: "auto",
    icon: <BrightnessAutoRounded sx={{ fontSize: OPTION_ICON_SIZE }} />,
  },
  {
    label: "系統",
    value: "system",
    icon: <PersonalVideoRounded sx={{ fontSize: OPTION_ICON_SIZE }} />,
  },
  {
    label: "淺色",
    value: "light",
    icon: <LightModeRounded sx={{ fontSize: OPTION_ICON_SIZE }} />,
  },
  {
    label: "深色",
    value: "dark",
    icon: <DarkModeRounded sx={{ fontSize: OPTION_ICON_SIZE }} />,
  },
];

const reduceMotionOptions: OptionItem<ReduceMotionOption>[] = [
  {
    label: "系統",
    value: "system",
    icon: <PersonalVideoRounded sx={{ fontSize: OPTION_ICON_SIZE }} />,
  },
  {
    label: "總是",
    value: "on",
    icon: <MotionPhotosOffRounded sx={{ fontSize: OPTION_ICON_SIZE }} />,
  },
  {
    label: "從不",
    value: "off",
    icon: <MotionPhotosAutoRounded sx={{ fontSize: OPTION_ICON_SIZE }} />,
  },
];

export default function AppearanceTab() {
  const { user, setUser } = useContext(UserContext);
  const [darkModeValue, setDarkModeValue] = useState<DarkModeOptions>(() => user.darkmode);
  const [reduceMotionValue, setReduceMotionValue] = useState<ReduceMotionOption>(
    () => user.settings.reduceMotion,
  );
  const systemTheme = useSystemTheme();

  const disableTransitions = () => {
    // if (!prefersReducedMotion) return;
    const root = document.documentElement; // <html>
    root.classList.add("no-transition");

    requestAnimationFrame(() => {
      root.classList.remove("no-transition");
    });
  };

  const handleAppThemeChange = (event: SelectChangeEvent<unknown>) => {
    disableTransitions();
    const selectedTheme = event.target.value as string;
    setUser((prevUser) => ({
      ...prevUser,
      theme: selectedTheme,
    }));
  };

  return (
    <>
      <SectionHeading>深色模式選項</SectionHeading>
      <CustomRadioGroup
        options={darkModeOptions}
        value={darkModeValue}
        onChange={(val) => {
          disableTransitions();
          setDarkModeValue(val);
          setUser((prevUser) => ({
            ...prevUser,
            darkmode: val,
          }));
        }}
      />
      <SectionHeading>主題選擇</SectionHeading>
      <StyledSelect
        value={user.theme}
        onChange={handleAppThemeChange}
        IconComponent={ExpandMoreRounded}
      >
        <StyledMenuItem value="system">
          <PersonalVideoRounded />
          &nbsp; 系統 ({systemTheme === "dark" ? Themes[0].name : Themes[1].name})
        </StyledMenuItem>
        {Themes.map((theme) => (
          <StyledMenuItem key={theme.name} value={theme.name}>
            <ColorElement
              tabIndex={-1}
              clr={theme.MuiTheme.palette.primary.main}
              secondClr={theme.MuiTheme.palette.secondary.main}
              aria-label={`Change theme - ${theme.name}`}
              size="24px"
              disableHover
            />
            &nbsp;
            {theme.name}
          </StyledMenuItem>
        ))}
      </StyledSelect>
      <SectionHeading>減少動畫選項</SectionHeading>
      <SectionDescription>減少動畫與過場效果，提供更穩定的使用體驗。</SectionDescription>
      <CustomRadioGroup
        options={reduceMotionOptions}
        value={reduceMotionValue}
        onChange={(val) => {
          setReduceMotionValue(val);
          setUser((prevUser) => ({
            ...prevUser,
            settings: {
              ...prevUser.settings,
              reduceMotion: val,
            },
          }));
        }}
      />
      <CustomSwitch
        settingKey="enableGlow"
        header="啟用發光效果"
        text="為任務添加柔和光暈，提升可見度。"
      />
    </>
  );
}
