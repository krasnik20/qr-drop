import type { ChatMessage } from "../storage";

export type FileMessage = Extract<ChatMessage, { kind: "file" }>;
export type FileCategory = "image" | "audio" | "video" | "other";

export function fileCategory(file: Pick<FileMessage, "mime">): FileCategory {
  if (file.mime.startsWith("image/")) return "image";
  if (file.mime.startsWith("audio/")) return "audio";
  if (file.mime.startsWith("video/")) return "video";
  return "other";
}

export function prettySize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
