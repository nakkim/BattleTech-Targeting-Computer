import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface DialogProps {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
  /** Buttons shown below the content. */
  footer?: ReactNode
  className?: string
}

/** Modal dialog rendered into the document body. Closes on Escape and on a backdrop click. */
export const Dialog = ({ title, open, onClose, children, footer, className = '' }: DialogProps) => {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return createPortal(
    <dialog
      ref={ref}
      className={`info-dialog ${className}`}
      onClose={onClose}
      onClick={(e) => {
        // A click on the backdrop targets the dialog element itself.
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <header className="info-dialog-header">
        <h2>{title}</h2>
        <button type="button" className="ghost small" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </header>
      <div className="info-dialog-body">{open && children}</div>
      {footer && <footer className="info-dialog-footer">{footer}</footer>}
    </dialog>,
    document.body,
  )
}

interface Props {
  /** Accessible name of the button and the dialog title. */
  title: string
  children: ReactNode
}

/** Small "i" button that opens a modal dialog with explanatory content. */
export const InfoButton = ({ title, children }: Props) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" className="info-button" aria-label={title} title={title} onClick={() => setOpen(true)}>
        i
      </button>
      <Dialog title={title} open={open} onClose={() => setOpen(false)}>
        {children}
      </Dialog>
    </>
  )
}
