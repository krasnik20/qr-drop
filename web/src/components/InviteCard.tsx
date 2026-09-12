import { QRCodeSVG } from "qrcode.react";
import { ContentCopy, Group, RestartAlt } from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Tooltip,
} from "@mui/material";
import { useState } from "react";
import { useTranslate } from "../i18n";
import { StatusChip } from "./StatusChip";
import { clearHostRoom } from "../storage";

type InviteCardProps = {
  roomId: string | null;
  status: string;
  guests: number;
};

function resetRoom() {
  clearHostRoom();
  location.reload();
}

export function InviteCard({
  roomId,
  status,
  guests,
}: InviteCardProps) {
  const t = useTranslate();
  const [copied, setCopied] = useState(false);
  const invite = roomId ? `${location.origin}/${roomId}` : "";

  async function copyInvite() {
    if (!invite) return;
    await navigator.clipboard.writeText(invite);
    setCopied(true);
  }

  return (
    <>
      <Paper className="glass-card invite-card">
        <Box className="qr-column">
          <StatusChip status={status} />
          <Box className="qr-wrap">
            <QRCodeSVG
              value={invite || "qr-drop"}
              size={180}
              bgColor="#ffffff"
              fgColor="#111426"
            />
          </Box>
        </Box>
        <Stack className="invite-content" sx={{ flex: 1, minWidth: 0 }}>
          <Box
            className="invite-url"
            onClick={() => void copyInvite()}
            role="button"
            tabIndex={0}
          >
            {invite || t("creating")}
            <Tooltip title={t("copy")}>
              <IconButton
                size="small"
                color="primary"
                onClick={(event) => {
                  event.stopPropagation();
                  void copyInvite();
                }}
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Box className="room-meta">
            <Box className="room-actions">
              <Chip
                className="liquid-control"
                icon={<Group />}
                label={guests}
                size="small"
              />
              <Button
                className="liquid-control new-room-button"
                color="inherit"
                size="small"
                startIcon={<RestartAlt />}
                onClick={resetRoom}
              >
                {t("newRoom")}
              </Button>
            </Box>
          </Box>
        </Stack>
      </Paper>
      <Snackbar
        open={copied}
        autoHideDuration={1800}
        onClose={() => setCopied(false)}
        message={t("copied")}
      />
    </>
  );
}
