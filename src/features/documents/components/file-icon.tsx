import {
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  Presentation,
  type LucideIcon,
} from "lucide-react";
import { classifyDocumentType } from "@/lib/files/constants";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
  pdf: FileType,
  image: FileImage,
  word: FileText,
  spreadsheet: FileSpreadsheet,
  presentation: Presentation,
  text: FileText,
  csv: FileSpreadsheet,
  other: FileText,
};

const COLOR_MAP: Record<string, string> = {
  pdf: "text-red-500",
  image: "text-emerald-500",
  word: "text-blue-500",
  spreadsheet: "text-green-600",
  presentation: "text-amber-500",
  text: "text-slate-500",
  csv: "text-green-600",
  other: "text-slate-500",
};

export function FileIcon({
  mime,
  className,
}: {
  mime: string | null | undefined;
  className?: string;
}) {
  const kind = mime ? classifyDocumentType(mime) : "other";
  const Icon = ICON_MAP[kind] ?? FileText;
  const color = COLOR_MAP[kind] ?? "text-slate-500";
  return <Icon className={cn("h-5 w-5", color, className)} />;
}
