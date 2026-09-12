import { Chip } from "@mui/material";
import { useTranslate, type TranslationKey } from "../i18n";

export function StatusChip({ status }: { status: string }) {
  const t = useTranslate();
  const isTranslationKey = (value: string): value is TranslationKey =>
    [
      "connecting",
      "roomOpen",
      "channel",
      "waitingChannel",
      "waitingHost",
      "hostLeft",
      "hostBack",
      "hostTaken",
    ].includes(value);
  const label = isTranslationKey(status) ? t(status) : status;
  const isOpen = status === "roomOpen" || status === "channel";

  return (
    <Chip
      className={`status-chip ${isOpen ? "status-open" : "status-pending"}`}
      label={label}
      size="small"
    />
  );
}
