import { FileText, Image as ImageIcon, FileSpreadsheet, File } from "lucide-react";
import { isImageType } from "@/core/storage/types";

type F = { id: string; contentType: string; filename: string } | null | undefined;

/** Small icon for a document row; shows an actual thumbnail for images. */
export function DocumentThumb({ file }: { file: F }) {
  if (!file) return <File className="text-ink-3" />;
  if (isImageType(file.contentType) && file.contentType !== "image/heic" && file.contentType !== "image/heif") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/api/files/${file.id}`} alt="" className="size-10 rounded-xl object-cover" loading="lazy" />;
  }
  if (file.contentType === "application/pdf") return <FileText className="text-accent" />;
  if (file.contentType.includes("sheet") || file.contentType.includes("excel") || file.contentType === "text/csv") return <FileSpreadsheet />;
  if (isImageType(file.contentType)) return <ImageIcon />;
  return <FileText />;
}
