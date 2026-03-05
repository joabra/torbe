import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "danger" | "sand";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 font-medium rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sand-400 disabled:opacity-50 disabled:pointer-events-none";
    const variants = {
      default: "bg-forest-700 hover:bg-forest-800 text-white shadow",
      outline: "border border-forest-700 text-forest-700 hover:bg-forest-50",
      ghost: "text-forest-700 hover:bg-forest-50",
      danger: "bg-red-600 hover:bg-red-700 text-white shadow",
      sand: "bg-sand-400 hover:bg-sand-500 text-forest-900 shadow font-semibold",
    };
    const sizes = {
      sm: "px-4 py-1.5 text-sm",
      md: "px-6 py-2.5 text-sm",
      lg: "px-8 py-3 text-base",
    };
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
