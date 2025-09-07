import * as React from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline";
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


