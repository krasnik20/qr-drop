import { Download } from "@mui/icons-material";
import {
  Box,
  CircularProgress,
  IconButton,
  Link,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslate } from "../i18n";
import type { ChatMessage } from "../storage";
import { FileIcon } from "./FileIcon";
import { FilePreviewDialog } from "./FilePreviewDialog";
import { fileCategory, prettySize, type FileMessage } from "./fileTypes";

type ChatFeedProps = {
  messages: ChatMessage[];
  mine?: boolean;
  onFileRequest?: (id: string) => void;
  fileProgress?: Record<string, number>;
  filesDisabled?: boolean;
};

export function ChatFeed({
  messages,
  mine,
  onFileRequest,
  fileProgress,
  filesDisabled = false,
}: ChatFeedProps) {
  const t = useTranslate();
  if (!messages.length) {
    return (
      <Paper className="glass-card empty">
        <Typography color="text.secondary">
          {mine ? t("emptyHost") : t("emptyGuest")}
        </Typography>
      </Paper>
    );
  }
  return (
    <Stack className="feed" spacing={1.5}>
      {messages.map((message) => (
        <Paper
          key={message.id}
          className={`message ${mine ? "mine" : ""}`}
        >
          <Typography
            className="message-time"
            variant="caption"
            color="text.secondary"
          >
            {new Date(message.at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </Typography>
          {message.kind === "text" ? (
            <Typography>{renderText(message.text)}</Typography>
          ) : (
            <FileBubble
              message={message}
              onRequest={onFileRequest}
              progress={fileProgress?.[message.id]}
              disabled={filesDisabled}
            />
          )}
        </Paper>
      ))}
    </Stack>
  );
}

function renderText(text: string) {
  return text
    .split(/(https?:\/\/[^\s]+|www\.[^\s]+)/g)
    .map((part, index) => {
      const match = part.match(/^(.*?)([.,!?;:)]*)$/);
      const candidate = match?.[1] ?? part;
      const punctuation = match?.[2] ?? "";

      if (!/^https?:\/\//i.test(candidate) && !/^www\./i.test(candidate)) {
        return <span key={index}>{part}</span>;
      }

      const href = /^www\./i.test(candidate) ? `https://${candidate}` : candidate;

      return (
        <span key={index}>
          <Link
            href={href}
            target="_blank"
            rel="noreferrer"
          >
            {candidate}
          </Link>
          {punctuation}
        </span>
      );
  });
}

function FileBubble({
  message,
  onRequest,
  progress,
  disabled,
}: {
  message: FileMessage;
  onRequest?: (id: string) => void;
  progress?: number;
  disabled: boolean;
}) {
  const t = useTranslate();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [previewRequested, setPreviewRequested] = useState(false);
  const [unavailableNotice, setUnavailableNotice] = useState(false);

  useEffect(() => {
    if (!message.objectUrl) return;

    if (downloading) {
      const link = document.createElement("a");
      link.href = message.objectUrl;
      link.download = message.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setDownloading(false);
    }

    if (previewRequested) setPreviewRequested(false);
  }, [
    downloading,
    message.name,
    message.objectUrl,
    previewRequested,
  ]);

  useEffect(() => {
    if (!unavailableNotice) return;
    const timeout = window.setTimeout(() => setUnavailableNotice(false), 2600);
    return () => window.clearTimeout(timeout);
  }, [unavailableNotice]);

  function requestFile(mode: "preview" | "download") {
    if (!onRequest || disabled || downloading || previewRequested) return;
    if (mode === "download") setDownloading(true);
    if (mode === "preview") setPreviewRequested(true);
    onRequest(message.id);
  }

  function openFile() {
    setPreviewOpen(true);
    if (
      !disabled &&
      !message.objectUrl &&
      fileCategory(message) !== "other"
    ) {
      requestFile("preview");
    }
  }

  return (
    <Tooltip
      title={t("hostUnavailable")}
      open={unavailableNotice}
      onClose={() => setUnavailableNotice(false)}
      disableFocusListener
      disableHoverListener
      disableTouchListener
    >
      <Box
        className="file-bubble"
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
        role="button"
        tabIndex={0}
        onClick={openFile}
      >
      <FileIcon category={fileCategory(message)} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography noWrap>{message.name}</Typography>
        <Typography
          variant="caption"
          color="text.secondary"
        >
          {prettySize(message.size)}
        </Typography>
      </Box>

      {message.objectUrl ? (
        <Tooltip title={t("download")}>
          <IconButton
            size="small"
            component="a"
            href={message.objectUrl}
            download={message.name}
            onClick={(event) => event.stopPropagation()}
          >
            <Download />
          </IconButton>
        </Tooltip>
      ) : (
        <Tooltip
          title={disabled ? t("hostUnavailable") : downloading ? t("downloading") : t("download")}
        >
          <span
            onClick={(event) => {
              if (!disabled) return;
              event.stopPropagation();
              setUnavailableNotice(true);
            }}
          >
            {downloading ? (
              <Box sx={{ position: "relative", display: "inline-flex" }}>
                <CircularProgress
                  size={24}
                  thickness={5}
                  variant={progress !== undefined ? "determinate" : "indeterminate"}
                  value={progress}
                />
              </Box>
            ) : (
              <IconButton
                size="small"
                disabled={disabled}
                onClick={(event) => {
                  event.stopPropagation();
                  requestFile("download");
                }}
              >
                <Download />
              </IconButton>
            )}
          </span>
        </Tooltip>
      )}

        <FilePreviewDialog
          file={previewOpen ? message : null}
          onClose={() => setPreviewOpen(false)}
          progress={progress}
          unavailable={disabled && !message.objectUrl}
          downloading={downloading}
          onDownload={() => requestFile("download")}
        />
      </Box>
    </Tooltip>
  );
}
