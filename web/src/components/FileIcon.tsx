import { Audiotrack, Description, Image, Movie } from "@mui/icons-material";
import type { FileCategory } from "./fileTypes";

export function FileIcon({ category }: { category: FileCategory }) {
  const Icon = category === "image" ? Image : category === "audio" ? Audiotrack : category === "video" ? Movie : Description;
  return <Icon fontSize="small" />;
}
