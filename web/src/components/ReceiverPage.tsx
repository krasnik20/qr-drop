import { useEffect, useState } from "react";
import { Box, Button, Paper, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslate } from "../i18n";
import { RoomQrCode } from "./RoomQrCode";

export function ReceiverPage() {
  const { roomId = "" } = useParams();
  const navigate = useNavigate();
  const t = useTranslate();
  const [connected, setConnected] = useState(false);
  const hostUrl = `${location.origin}/host/${roomId}`;

  useEffect(() => {
    let active = true;
    const check = async () => {
      const response = await fetch(`/api/rooms/${roomId}/status`);
      const data = (await response.json()) as { hostOnline: boolean };
      if (active && data.hostOnline) {
        setConnected(true);
        navigate(`/${roomId}`, { replace: true });
      }
    };
    void check();
    const timer = window.setInterval(() => void check(), 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [navigate, roomId]);

  return (
    <Box className="page receiver-page">
      <Paper className="glass-card receiver-card">
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Typography variant="h4">{t("receiverTitle")}</Typography>
          <Typography color="text.secondary">
            {connected ? t("connecting") : t("scanToHost")}
          </Typography>
          <RoomQrCode
            value={hostUrl}
            size={260}
          />
          <Button onClick={() => navigate("/")}>
            {t("back")}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
