import { Tv, Upload } from "@mui/icons-material";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslate } from "../i18n";

export function ModeSelect() {
  const navigate = useNavigate();
  const t = useTranslate();

  return (
    <Box className="page mode-page">
      <Stack
        className="mode-content"
        spacing={3}
      >
        <Box className="hero">
          <Typography variant="h1">{t("title")}</Typography>
          <Typography className="lede">{t("chooseMode")}</Typography>
        </Box>
        <Paper className="glass-card mode-card">
          <Stack
            direction="column"
            spacing={2}
          >
            <Typography variant="h5">{t("howUse")}</Typography>
            <Button
              className="mode-button mode-host-button"
              startIcon={<Upload />}
              onClick={() => navigate("/host")}
            >
              {t("hostMode")}
            </Button>
            <Button
              className="mode-button mode-receiver-button"
              startIcon={<Tv />}
              onClick={async () => {
                const response = await fetch("/api/rooms/pair", {
                  method: "POST",
                });
                const data = (await response.json()) as { room: string };
                navigate(`/receive/${data.room}`);
              }}
            >
              {t("receiverMode")}
            </Button>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
