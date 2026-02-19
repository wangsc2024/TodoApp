import { Box, Divider, FormGroup, FormLabel, Link, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import baner from "../../../assets/baner.webp";
import { Inventory2Rounded } from "@mui/icons-material";
import { systemInfo } from "../../../utils";

export default function AboutTab() {
  const [storageUsage, setStorageUsage] = useState<number | undefined>(undefined);

  useEffect(() => {
    const getStorageUsage = async () => {
      const storageUsage = await navigator.storage.estimate();
      setStorageUsage(storageUsage.usage);
    };
    getStorageUsage();
  }, []);

  return (
    <>
      <Typography variant="body1" sx={{ mb: 2 }}>
        📝 一款功能豐富的待辦事項應用，支援 Firebase 認證、Firestore
        跨裝置即時同步、連結分享任務、WebRTC P2P 同步、主題自訂及 PWA 離線使用。
      </Typography>
      <img src={baner} style={{ width: "100%", height: "auto" }} alt="Todo App Screenshot" />
      <Typography variant="caption" sx={{ display: "block", mt: 2 }}>
        原始專案由{" "}
        <Link href="https://github.com/maciekt07" target="_blank" rel="noopener noreferrer">
          maciekt07
        </Link>{" "}
        開發
        <br />
        Fork 增強（Firebase 認證、Firestore 同步、中文介面）由{" "}
        <Link href="https://github.com/wangsc2024" target="_blank" rel="noopener noreferrer">
          wangsc2024
        </Link>{" "}
        開發
        <br />
        <Link
          href="https://github.com/wangsc2024/TodoApp"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub 專案
        </Link>
      </Typography>
      {storageUsage !== undefined && storageUsage !== 0 && (
        <>
          <Divider sx={{ my: 1 }} />
          <FormGroup>
            <FormLabel sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Inventory2Rounded sx={{ fontSize: "18px" }} />
              儲存空間使用量
            </FormLabel>
            <Box sx={{ mt: "2px" }}>
              {storageUsage ? `${(storageUsage / 1024 / 1024).toFixed(2)} MB` : "0 MB"}
              {systemInfo.os === "iOS" && " / 50 MB"}
            </Box>
          </FormGroup>
        </>
      )}
    </>
  );
}
