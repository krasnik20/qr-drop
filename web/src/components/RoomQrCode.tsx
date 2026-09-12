import { ContentCopy } from "@mui/icons-material";
import {
  Box,
  IconButton,
  Snackbar,
  Tooltip,
} from "@mui/material";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { useTranslate } from "../i18n";

export function RoomQrCode({
  value,
  size = 180,
}: {
  value: string;
  size?: number;
}) {
  const t = useTranslate();
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
  }

  return (
    <>
      <Box className="qr-column-content">
        <Box className="qr-wrap">
          <QRCodeSVG
            value={value}
            size={size}
            bgColor="#ffffff"
            fgColor="#111426"
          />
        </Box>
        <Box
          className="invite-url copyable"
          onClick={() => void copyLink()}
          role="button"
          tabIndex={0}
        >
          {value}
          <Tooltip title={t("copy")}>
            <IconButton
              size="small"
              color="primary"
              onClick={(event) => {
                event.stopPropagation();
                void copyLink();
              }}
            >
              <ContentCopy fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Snackbar
        open={copied}
        autoHideDuration={1800}
        onClose={() => setCopied(false)}
        message={t("copied")}
      />
    </>
  );
}
