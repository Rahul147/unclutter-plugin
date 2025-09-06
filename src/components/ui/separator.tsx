import * as React from "react";
import { cn } from "../../lib/utils";

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = "horizontal", ...props }, ref) => (
    <div
      ref={ref}
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "separator",
        orientation === "vertical" && "separator--vertical",
        className
      )}
      {...props}
    />
  )
);
Separator.displayName = "Separator";

export { Separator };


