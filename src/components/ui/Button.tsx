import { Slot } from "@radix-ui/react-slot";
import { cn } from "../../lib/utils";
import { ReactNode } from "react";

/**
 * A versatile button component. Supports different visual variants,
 * sizes, optional loading spinners, and icons. When `asChild` is true
 * the button is rendered as the child component (e.g. for use with
 * `<Link asChild>`). Loading state disables interaction and dims
 * the button.
 */
type Size = "sm" | "md" | "lg";
type Variant = "primary" | "outline" | "ghost" | "danger";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

const sizeMap: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-[15px]",
  lg: "h-11 px-5 text-[15px]",
};

export function Button({
  asChild,
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  className,
  children,
  ...props
}: Props) {
  const Comp: any = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150",
        sizeMap[size],
        variant === "primary" && "bg-cyan-600 text-white hover:bg-cyan-500 active:bg-cyan-700 shadow-sm hover:shadow",
        variant === "outline" && "bg-transparent border border-white/20 text-white hover:bg-white/10 hover:border-white/30",
        variant === "ghost" && "bg-transparent text-white/80 hover:bg-white/10 hover:text-white",
        variant === "danger" && "bg-transparent border border-danger text-danger hover:bg-danger hover:text-white",
        loading && "opacity-60 pointer-events-none cursor-not-allowed",
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {leftIcon ? <span className="inline-flex items-center">{leftIcon}</span> : null}
      <span>{children}</span>
      {rightIcon ? <span className="inline-flex items-center">{rightIcon}</span> : null}
      {loading ? (
        <span className="relative inline-flex">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
            <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
          </svg>
        </span>
      ) : null}
    </Comp>
  );
}