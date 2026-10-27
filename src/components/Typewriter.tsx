import { useEffect, useState } from 'react'

interface Props {
  text: string
  /** Milliseconds per character. */
  speed?: number
  /** Milliseconds before the first character. */
  delay?: number
}

const prefersReducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Types the text out once, character by character, with a caret that keeps blinking.
 * The untyped rest is laid out but invisible, so the line never reflows.
 * Shows the whole text at once when the user prefers reduced motion.
 */
export const Typewriter = ({ text, speed = 35, delay = 300 }: Props) => {
  const [typed, setTyped] = useState(() => (prefersReducedMotion() ? text.length : 0))

  useEffect(() => {
    if (typed >= text.length) return
    const timer = setTimeout(() => setTyped(typed + 1), typed === 0 ? delay : speed)
    return () => clearTimeout(timer)
  }, [typed, text, speed, delay])

  return (
    <span className="typewriter" aria-label={text}>
      <span aria-hidden="true">{text.slice(0, typed)}</span>
      <span className="typewriter-caret" aria-hidden="true" />
      <span className="typewriter-rest" aria-hidden="true">
        {text.slice(typed)}
      </span>
    </span>
  )
}
