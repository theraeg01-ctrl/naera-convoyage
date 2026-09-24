import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/utils/cn";

export const buttonVariants = cva(
  [
    "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-semibold",
    "transition-[background-color,color,box-shadow,transform,opacity] duration-150 active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-card",
        accent: "bg-accent text-accent-foreground hover:opacity-90",
        secondary: "border border-border bg-surface text-foreground hover:bg-surface-2 shadow-card",
        ghost: "text-foreground hover:bg-surface-2",
        subtle: "bg-surface-2 text-foreground hover:bg-surface-3",
        danger: "text-danger hover:bg-danger-soft",
      },
      size: {
        sm: "h-10 px-3.5 text-sm [&_svg]:size-4",
        md: "h-12 px-5 text-[15px] [&_svg]:size-[18px]",
        lg: "h-14 px-6 text-base [&_svg]:size-5",
        icon: "size-11 [&_svg]:size-5",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  block,
  type = "button",
  ...props
}: ComponentProps<"button"> & ButtonVariantProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size, block }), className)} {...props} />;
}

export function ButtonLink({
  className,
  variant,
  size,
  block,
  ...props
}: ComponentProps<typeof Link> & ButtonVariantProps) {
  return <Link className={cn(buttonVariants({ variant, size, block }), className)} {...props} />;
}
