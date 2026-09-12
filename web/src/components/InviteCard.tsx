import { Group, RestartAlt } from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  Paper,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslate } from "../i18n";
import { StatusChip } from "./StatusChip";
import { clearHostRoom } from "../storage";
import { RoomQrCode } from "./RoomQrCode";

type InviteCardProps = {
  roomId: string | null;
  status: string;
  guests: number;
};

export function InviteCard({
  roomId,
  status,
  guests,
}: InviteCardProps) {
  const navigate = useNavigate();
  const t = useTranslate();
  const invite = roomId ? `${location.origin}/${roomId}` : "";

  function resetRoom() {
    clearHostRoom();
    navigate("/");
  }

  return (
    <>
      <Paper className="glass-card invite-card">
        <Box className="qr-column">
          <StatusChip status={status} />
          <RoomQrCode value={invite || "qr-drop"} />
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
      </Paper>
    </>
  );
}
