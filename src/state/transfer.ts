import { newId } from './defaults'
import { normalizeLance, type LanceState } from './unit'

/** Marks a lance code and its format, so later formats can still read old codes. */
const PREFIX = 'btc1:'

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromBase64Url = (text: string): Uint8Array<ArrayBuffer> => {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

const pipe = async (bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> => {
  const out = new Blob([bytes]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

/** The lance as a code to copy: JSON, compressed, as plain text, e.g. "btc1:7Vtbb9…". */
export const encodeLance = async (lance: LanceState): Promise<string> => {
  const json = new TextEncoder().encode(JSON.stringify(lance))
  return PREFIX + toBase64Url(await pipe(json, new CompressionStream('deflate-raw')))
}

/** Part of a link that carries a lance: …/#lance=<code without its prefix>. */
const LINK_KEY = '#lance='

/** A link that opens the app with the lance, e.g. https://…/BattleTech-Targeting-Computer/#lance=7Vtbb9…. */
export const lanceLink = (code: string, base: string): string => `${base.split('#')[0]}${LINK_KEY}${code.slice(PREFIX.length)}`

/** The lance code in a link, or null when the link carries none. */
export const codeFromLink = (link: string): string | null => {
  const at = link.indexOf(LINK_KEY)
  return at < 0 ? null : PREFIX + link.slice(at + LINK_KEY.length).trim()
}

/** Read a lance code, or a link carrying one, back. Throws when the text is neither. */
export const decodeLance = async (code: string): Promise<LanceState> => {
  const text = codeFromLink(code) ?? code.trim()
  if (!text.startsWith(PREFIX)) throw new Error('Not a lance code')
  const json = new TextDecoder().decode(await pipe(fromBase64Url(text.slice(PREFIX.length)), new DecompressionStream('deflate-raw')))
  const lance: unknown = JSON.parse(json)
  if (!lance || typeof lance !== 'object' || !Array.isArray((lance as LanceState).units) || (lance as LanceState).units.length === 0) {
    throw new Error('Not a lance code')
  }
  // Fill in fields of codes from older versions, as for saved lances.
  return normalizeLance(lance as LanceState)
}

/** The shared 'Mechs added to a lance, with new ids so they cannot clash with the ones there. */
export const addToLance = (lance: LanceState, shared: LanceState): LanceState => ({
  ...lance,
  units: [...lance.units, ...shared.units.map((u) => ({ ...u, id: newId('u') }))],
})
