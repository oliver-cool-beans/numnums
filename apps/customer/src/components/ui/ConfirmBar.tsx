"use client";

export function ConfirmBar({
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Keep",
  busy = false,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <p className="flex-1 truncate text-sm text-[#3A2A1F]">{message}</p>
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="shrink-0 rounded-[10px] px-3 py-1.5 text-xs font-medium text-[#6F5B4B] transition-colors hover:bg-[#F5EDE6] disabled:opacity-50"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={busy}
        className="shrink-0 rounded-[10px] bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-all active:scale-[0.98] active:bg-red-600 disabled:opacity-60"
      >
        {busy ? "..." : confirmLabel}
      </button>
    </div>
  );
}
