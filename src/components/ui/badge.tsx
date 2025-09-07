// Badge primitive for small status labels.
// Badge primitive for small status labels.
import * as React from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps {
  variant?: "default" | "secondary" | "outline";
  className?: string;
  children?: React.ReactNode;
  // Allow passthrough DOM attributes without relying on React's HTML types in shims
  [key: string]: any;
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const classes = cn(
    "badge",
    variant === "secondary" && "badge--secondary",
    variant === "outline" && "badge--outline",
    className
  );
  return <div className={classes} {...props} />;
}

export { Badge };


