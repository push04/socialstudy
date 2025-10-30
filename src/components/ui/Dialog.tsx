import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

/**
 * A modal dialog built on top of Radix UI. It renders an overlay and
 * centers its content in the viewport. The `open` and `onOpenChange`
 * props control visibility from the parent. The title is displayed
 * alongside a close button. Children are rendered in the body.
 */
export function Modal({ open, onOpenChange, title, children }: { open: boolean, onOpenChange: (o:boolean)=>void, title: string, children: React.ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(640px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/15 bg-[var(--card)] p-4 shadow-glass">
          <div className="mb-2 flex items-center justify-between">
            <Dialog.Title className="text-lg font-bold">{title}</Dialog.Title>
            <button onClick={()=>onOpenChange(false)} className="rounded-lg border border-white/10 p-1"><X size={16}/></button>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}