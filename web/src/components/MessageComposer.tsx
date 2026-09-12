import { FormEvent, useEffect, useRef, useState } from "react";
import { AttachFile, OpenInFull, Send } from "@mui/icons-material";
import { Box, IconButton, InputAdornment, TextField, Tooltip } from "@mui/material";
import { useTranslate } from "../i18n";

type MessageComposerProps = {
  onSend: (text: string) => void;
  onFiles: (files: FileList | File[]) => void;
  disabled?: boolean;
};

export function MessageComposer({
  onSend,
  onFiles,
  disabled = false,
}: MessageComposerProps) {
  const t = useTranslate();
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const onFilesRef = useRef(onFiles);
  onFilesRef.current = onFiles;

  useEffect(() => {
    const onDragOver = (event: DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer?.types.includes("Files")) setDragging(true);
    };
    const onDrop = (event: DragEvent) => {
      event.preventDefault();
      setDragging(false);
      if (!disabled && event.dataTransfer?.files.length) {
        onFilesRef.current(event.dataTransfer.files);
      }
    };
    const onDragLeave = (event: DragEvent) => {
      if (!event.relatedTarget) setDragging(false);
    };
    const onDragEnd = () => setDragging(false);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragend", onDragEnd);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragend", onDragEnd);
    };
  }, [disabled]);

  return (
    <>
      {dragging && !disabled && (
        <Box className="global-drop-zone">{t("drop")}</Box>
      )}
      <Box className={`composer ${expanded ? "expanded" : ""}`}>
        <form
          className="composer-form"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            if (disabled) return;
            onSend(draft.trim());
            setDraft("");
          }}
        >
          <Tooltip title={t("attach")}>
            <IconButton
              className="attach-button"
              component="label"
              color="secondary"
              disabled={disabled}
            >
              <AttachFile />
              <input
                hidden
                type="file"
                multiple
                disabled={disabled}
                onChange={(event) => {
                  if (event.target.files) onFiles(event.target.files);
                }}
              />
            </IconButton>
          </Tooltip>
          <Box className="message-field-wrap">
            <TextField
              className="message-field"
              fullWidth
              multiline
              minRows={1}
              maxRows={expanded ? undefined : 10}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t("write")}
              disabled={disabled}
              slotProps={{
                input: {
                  endAdornment: draft.split("\n").length > 10 ? (
                    <InputAdornment
                      position="end"
                      className="message-actions"
                    >
                      <Tooltip title={t("expand")}>
                        <IconButton
                          size="small"
                          type="button"
                          onClick={() => setExpanded((value) => !value)}
                        >
                          <OpenInFull fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ) : undefined,
                },
              }}
            />
            <Tooltip title={draft.trim() ? t("send") : ""}>
              <span
                className={`send-button-wrap ${
                  draft.trim() ? "is-visible" : ""
                }`}
              >
                <IconButton
                  className="send-button"
                  color="primary"
                  type="submit"
                  disabled={disabled}
                  tabIndex={draft.trim() ? 0 : -1}
                  aria-hidden={!draft.trim()}
                >
                  <Send />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </form>
      </Box>
    </>
  );
}
