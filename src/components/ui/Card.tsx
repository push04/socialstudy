import { cn } from "../../lib/utils";

/**
 * A basic card wrapper that applies consistent padding, rounding,
 * translucent background and a glass-like shadow. Accepts custom
 * class names for additional styling. Animates in with a pop effect.
 */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card animate-pop", className)} {...props} />;
}