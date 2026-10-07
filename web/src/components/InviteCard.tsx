import { DeleteSweep, ExpandLess, ExpandMore, Group, RestartAlt } from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Tooltip,
} from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslate } from "../i18n";
import { clearHostRoom } from "../storage";
import { RoomQrCode } from "./RoomQrCode";
import { StatusChip } from "./StatusChip";

type InviteCardProps = {
  roomId: string | null;
  status: string;
  guests: number;
  onClearChat: () => void;
};

const COLLAPSED_KEY = "qr-drop-qr-collapsed";

export function InviteCard({
  roomId,
  status,
  guests,
  onClearChat,
}: InviteCardProps) {
  const navigate = useNavigate();
  const t = useTranslate();
  const [collapsed, setCollapsed] = useState(
    () => sessionStorage.getItem(COLLAPSED_KEY) === "1",
  );
  const invite = roomId ? `${location.origin}/${roomId}` : "";

  function resetRoom() {
    clearHostRoom();
    navigate("/");
  }

  function toggleCollapsed() {
    setCollapsed((previous) => {
      sessionStorage.setItem(COLLAPSED_KEY, previous ? "0" : "1");
      return !previous;
    });
  }

  return (
    <Paper className="glass-card invite-card">
      <Box className="invite-top">
        <StatusChip status={status} />
        <Tooltip title={t(collapsed ? "qrExpand" : "qrCollapse")}>
          <IconButton
            className="invite-collapse"
            size="small"
            onClick={toggleCollapsed}
            aria-label={t(collapsed ? "qrExpand" : "qrCollapse")}
          >
            {collapsed ? <ExpandMore /> : <ExpandLess />}
          </IconButton>
        </Tooltip>
      </Box>
      {!collapsed && <RoomQrCode value={invite || "qr-drop"} />}
      <Box className="room-actions">
        <Chip
          className="liquid-control"
          icon={<Group />}
          label={guests}
          size="small"
        />
        <Tooltip title={t("clearChat")}>
          <IconButton
            className="liquid-control clear-chat-button"
            color="inherit"
            size="small"
            onClick={onClearChat}
          >
            <DeleteSweep fontSize="small" />
          </IconButton>
        </Tooltip>
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
    </Paper>
  );
}
