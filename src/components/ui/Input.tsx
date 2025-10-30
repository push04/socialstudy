import { cn } from "../../lib/utils";

/**
 * Form inputs styled to match the dark/light theme. Supports both
 * standard input fields and textareas. Additional classes can be
 * passed via the `className` prop.
 */
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("input", props.className)} {...props} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("textarea", props.className)} {...props} />;
}