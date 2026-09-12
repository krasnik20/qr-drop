import { Add } from "@mui/icons-material";
import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslate } from "../i18n";

export function StartRoomButton() {
  const navigate = useNavigate();
  const t = useTranslate();

  return (
    <Button
      className="start-room-button"
      color="inherit"
      size="small"
      startIcon={<Add />}
      onClick={() => navigate("/")}
    >
      {t("startRoom")}
    </Button>
  );
}
