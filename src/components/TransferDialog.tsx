import { useEffect, useRef, useState } from 'react'
import { addToLance, decodeLance, encodeLance, lanceLink } from '../state/transfer'
import type { LanceState } from '../state/unit'
import { Dialog } from './InfoDialog'

interface Props {
  lance: LanceState
  /** A code or link to load, e.g. from the link the app was opened with. */
  incoming?: string
  onLoad: (lance: LanceState) => void
  onClose: () => void
}

const describe = (lance: LanceState): string => {
  const n = lance.units.length
  return `${n} ’Mech${n === 1 ? '' : 's'} (${lance.units.map((u) => u.attacker.name || 'Unnamed').join(', ')}), turn ${lance.turn}`
}

/** Move a lance between devices: copy it as a code or link, or paste one to load its lance. */
export const TransferDialog = ({ lance, incoming = '', onLoad, onClose }: Props) => {
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState<{ what: 'code' | 'link'; ok: boolean } | null>(null)
  const [pasted, setPasted] = useState(incoming)
  const [shared, setShared] = useState<LanceState | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let current = true
    encodeLance(lance).then((c) => current && setCode(c))
    return () => {
      current = false
    }
  }, [lance])

  const latest = useRef(incoming)
  // A lance from the link the app was opened with: read it as if pasted.
  useEffect(() => {
    if (!incoming) return
    decodeLance(incoming)
      .then((l) => latest.current === incoming && setShared(l))
      .catch(() => latest.current === incoming && setError(true))
  }, [incoming])

  const paste = (text: string) => {
    latest.current = text
    setPasted(text)
    setShared(null)
    setError(false)
    if (!text.trim()) return
    decodeLance(text)
      .then((l) => latest.current === text && setShared(l))
      .catch(() => latest.current === text && setError(true))
  }

  const copy = async (what: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(what === 'code' ? code : lanceLink(code, location.href))
      setCopied({ what, ok: true })
    } catch {
      // Without clipboard access the code can still be selected and copied from the field.
      setCopied({ what, ok: false })
    }
  }

  const load = (next: LanceState) => {
    onLoad(next)
    onClose()
  }

  return (
    <Dialog title="Transfer lance" open onClose={onClose} className="share-dialog">
      <section className="share-section">
        <h3>Copy this lance</h3>
        <p className="muted small-text">
          {describe(lance)}: every ’Mech with its damage, heat and rolls in progress. Open the link on the other device, or paste the code into this dialog there.{' '}
          {code && `${code.length.toLocaleString()} characters.`}
        </p>
        <textarea className="share-code" readOnly value={code} rows={3} aria-label="Lance code" onFocus={(e) => e.currentTarget.select()} />
        <div className="share-actions">
          <button type="button" onClick={() => copy('link')} disabled={!code} title="A link that opens the app with this lance">
            Copy link
          </button>
          <button type="button" className="ghost" onClick={() => copy('code')} disabled={!code} title="The code alone, to paste into this dialog">
            Copy code
          </button>
          {copied?.ok && <span className="summary-status summary-ok">{copied.what === 'link' ? 'Link copied' : 'Code copied'}</span>}
          {copied && !copied.ok && <span className="summary-status summary-warn">Could not copy: select the code and copy it</span>}
        </div>
      </section>
      <section className="share-section">
        <h3>Load a lance</h3>
        <textarea className="share-code" value={pasted} rows={3} placeholder="Paste a lance code (btc1:…) or link" aria-label="Paste a lance code or link" onChange={(e) => paste(e.target.value)} />
        {error && <p className="msg-error">Not a lance code or link. Check that all of it was copied.</p>}
        {shared && (
          <>
            <p className="msg-ok">{describe(shared)}</p>
            <div className="share-actions">
              <button type="button" className="danger" onClick={() => load({ ...shared })} title="Your current lance is replaced">
                Replace lance
              </button>
              <button type="button" onClick={() => load(addToLance(lance, shared))} title="These ’Mechs join your lance; your turn stays">
                Add to lance
              </button>
            </div>
          </>
        )}
      </section>
    </Dialog>
  )
}
