"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, Clock, Loader2, Minus, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { OcrStatus } from "../types";

interface Props {
  status: OcrStatus;
  attempt?: number;
  maxAttempts?: number;
  error?: string | null;
}

export function OcrStatusBadge({ status, attempt, maxAttempts, error }: Props) {
  const t = useTranslations("documents");

  const visual = VISUAL[status];

  const tooltip = [
    t(`ocr_status_${status}`),
    status === "failed" && attempt !== undefined && maxAttempts !== undefined
      ? `Attempt ${attempt}/${maxAttempts}`
      : null,
    error,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge variant={visual.variant} className="gap-1 text-[10px]">
            <visual.Icon className={visual.iconClass} />
            <span className="hidden sm:inline">{t(`ocr_status_${status}`)}</span>
          </Badge>
        }
      />
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

const VISUAL: Record<
  OcrStatus,
  {
    Icon: typeof CheckCircle2;
    iconClass: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  pending: {
    Icon: Clock,
    iconClass: "h-3 w-3 text-muted-foreground",
    variant: "outline",
  },
  processing: {
    Icon: Loader2,
    iconClass: "h-3 w-3 animate-spin text-primary",
    variant: "secondary",
  },
  completed: {
    Icon: CheckCircle2,
    iconClass: "h-3 w-3 text-emerald-500",
    variant: "secondary",
  },
  failed: {
    Icon: XCircle,
    iconClass: "h-3 w-3 text-destructive",
    variant: "destructive",
  },
  skipped: {
    Icon: Minus,
    iconClass: "h-3 w-3 text-muted-foreground",
    variant: "outline",
  },
};
