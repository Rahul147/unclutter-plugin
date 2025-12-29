// Minimal button primitive used across the UI. Keep surface area stable.
import React from "react";

import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost" | "outline";
  size?: "sm" | "default" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const classes = cn(
      "btn",
      variant === "secondary" && "btn--secondary",
      variant === "ghost" && "btn--ghost",
      variant === "outline" && "btn--outline",
      size === "sm" && "btn--sm",
      size === "lg" && "btn--lg",
      size === "icon" && "btn--icon",
      className
    );

    return <button className={classes} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button };

