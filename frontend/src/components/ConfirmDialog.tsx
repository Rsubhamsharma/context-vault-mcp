export type ConfirmDialogIntent = "default" | "danger";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  intent = "default",
  onCancel,
  onConfirm
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  intent?: ConfirmDialogIntent;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="confirmDialogOverlay" role="presentation" onMouseDown={onCancel}>
      <section
        className={`confirmDialog ${intent}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-dialog-title">{title}</h2>
        <p>{description}</p>
        <footer>
          <button className="ghostButton" type="button" onClick={onCancel}>{cancelLabel}</button>
          <button className={`actionButton ${intent === "danger" ? "dangerConfirmButton" : ""}`} type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}
