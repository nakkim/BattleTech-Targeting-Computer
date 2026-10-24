import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  /** Accessible name of the button and the dialog title. */
  title: string
  children: ReactNode
}

/** Small "i" button that opens a modal dialog with explanatory content. */
export function InfoButton({ title, children }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <>
      <button type="button" className="info-button" aria-label={title} title={title} onClick={() => setOpen(true)}>
        i
      </button>
      {createPortal(
        <dialog
          ref={ref}
          className="info-dialog"
          onClose={() => setOpen(false)}
          onClick={(e) => {
            // A click on the backdrop targets the dialog element itself.
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <header className="info-dialog-header">
            <h2>{title}</h2>
            <button type="button" className="ghost small" onClick={() => setOpen(false)} aria-label="Close">
              ✕
            </button>
          </header>
          <div className="info-dialog-body">{open && children}</div>
        </dialog>,
        document.body,
      )}
    </>
  )
}
