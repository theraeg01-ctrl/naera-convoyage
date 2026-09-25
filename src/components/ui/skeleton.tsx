import type { ComponentProps } from "react";
import { cn } from "@/utils/cn";

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div aria-hidden className={cn("skeleton rounded-xl", className)} {...props} />;
}
