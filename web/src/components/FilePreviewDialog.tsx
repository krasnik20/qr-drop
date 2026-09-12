import { useEffect, useState } from "react";
import { Close, Download } from "@mui/icons-material";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTranslate } from "../i18n";
import { FileIcon } from "./FileIcon";
import { fileCategory, prettySize, type FileMessage } from "./fileTypes";

export function FilePreviewDialog({
  file,
  onClose,
  progress,
  unavailable = false,
  downloading = false,
  onDownload,
}: {
  file: FileMessage | null;
  onClose: () => void;
  progress?: number;
  unavailable?: boolean;
  downloading?: boolean;
  onDownload?: () => void;
}) {
  const t = useTranslate();
  const [open, setOpen] = useState(Boolean(file));
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (file) {
      setOpen(true);
      setClosing(false);
    }
  }, [file]);

  function requestClose() {
    if (closing) return;
    setClosing(true);
    setOpen(false);
    window.setTimeout(onClose, 220);
  }

  if (!file) return null;
  const category = fileCategory(file);
  const extension = file.name.includes(".")
    ? file.name.split(".").pop()!.toUpperCase()
    : "—";
  return (
    <Dialog
      open={open}
      onClose={requestClose}
      fullWidth
      maxWidth="sm"
      className={closing ? "closing" : ""}
    >
      <DialogTitle className="preview-title">
        <Box
          className="preview-file-title"
          sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}
        >
          <FileIcon category={category} />
          <Typography noWrap>{file.name}</Typography>
        </Box>
        <IconButton
          aria-label={t("close")}
          onClick={requestClose}
          size="small"
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {file.objectUrl && category === "image" && (
          <img
            className="preview-media"
            src={file.objectUrl}
            alt={file.name}
          />
        )}
        {file.objectUrl && category === "audio" && (
          <audio
            className="preview-media"
            src={file.objectUrl}
            controls
          />
        )}
        {file.objectUrl && category === "video" && (
          <VideoPreview src={file.objectUrl} />
        )}
        {category === "other" && (
          <Stack
            spacing={1}
            className="file-details"
          >
            <Typography>
              <b>{t("filename")}:</b> {file.name}
            </Typography>
            <Typography>
              <b>{t("extension")}:</b> {extension}
            </Typography>
            <Typography>
              <b>{t("size")}:</b> {prettySize(file.size)}
            </Typography>
          </Stack>
        )}
        {!file.objectUrl && category !== "other" && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
            }}
          >
            {!unavailable && (
              <CircularProgress
                variant={progress !== undefined ? "determinate" : "indeterminate"}
                value={progress}
              />
            )}
            <Typography color="text.secondary">
              {t("file")}: {file.name} · {prettySize(file.size)}
            </Typography>
          </Box>
        )}
        {unavailable && (
          <Typography
            color="error"
            align="center"
            sx={{ mt: 2 }}
          >
            {t("hostUnavailable")}
          </Typography>
        )}
      </DialogContent>
      {(file.objectUrl || category === "other") && (
        <DialogActions>
          {file.objectUrl ? (
            <Button
              component="a"
              href={file.objectUrl}
              download={file.name}
              startIcon={<Download />}
              variant="contained"
            >
              {t("download")}
            </Button>
          ) : (
            <Tooltip
              title={unavailable ? t("hostUnavailable") : t("download")}
            >
              <span>
                <Button
                  disabled={unavailable || downloading}
                  onClick={onDownload}
                  startIcon={
                    downloading ? <CircularProgress size={18} /> : <Download />
                  }
                  variant="contained"
                >
                  {downloading ? t("downloading") : t("download")}
                </Button>
              </span>
            </Tooltip>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
}

function VideoPreview({ src }: { src: string }) {
  return <video className="preview-media" src={src} controls />;
}
