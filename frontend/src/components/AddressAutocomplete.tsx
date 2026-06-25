/**
 * AddressAutocomplete
 *
 * Wraps Address Line 1 in a Google Places Autocomplete.
 * When a suggestion is selected, onSelect is called with
 * parsed { address1, city, state, zip, country } parts so
 * the parent can auto-fill all address sub-fields.
 *
 * Fix: callbacks are stored in refs so the place_changed listener
 * always calls the LATEST onChange/onSelect — eliminating the
 * "double-click to autofill" stale-closure bug.
 */

import { useEffect, useRef } from 'react'

const MAPS_API_KEY = 'AIzaSyAPLjQbJk0h0BJi2rBN_eF96NpE3jV7Hgo'
const SCRIPT_ID   = 'google-maps-places-script'

export interface ParsedAddress {
  address1: string   // street number + route
  city:     string
  state:    string   // short name, e.g. "NY"
  zip:      string
  country:  string   // short name, e.g. "US"
}

interface Props {
  value:        string
  onChange:     (val: string) => void
  onSelect:     (addr: ParsedAddress) => void
  className?:   string
  placeholder?: string
  style?:       React.CSSProperties
}

declare const google: any

// ── Load the Google Maps script once across all instances ──────────────────────
function loadMapsScript(): Promise<void> {
  if (typeof google !== 'undefined' && google.maps?.places) {
    return Promise.resolve()
  }
  if (document.getElementById(SCRIPT_ID)) {
    return new Promise(resolve => {
      const check = setInterval(() => {
        if (typeof google !== 'undefined' && google.maps?.places) {
          clearInterval(check)
          resolve()
        }
      }, 80)
    })
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id    = SCRIPT_ID
    script.src   = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=places`
    script.async = true
    script.defer = true
    script.onload  = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Maps script'))
    document.head.appendChild(script)
  })
}

// ── Parse a PlaceResult into our shape ────────────────────────────────────────
function parsePlaceResult(place: any): ParsedAddress {
  const get = (type: string, nameType: 'long_name' | 'short_name' = 'long_name') =>
    place.address_components?.find((c: any) => c.types.includes(type))?.[nameType] ?? ''

  const streetNumber = get('street_number')
  const route        = get('route')

  return {
    address1: [streetNumber, route].filter(Boolean).join(' '),
    city:     get('locality') || get('sublocality_level_1') || get('administrative_area_level_2'),
    state:    get('administrative_area_level_1', 'short_name'),
    zip:      get('postal_code'),
    country:  get('country', 'short_name'),
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AddressAutocomplete({
  value, onChange, onSelect, className, placeholder, style,
}: Props) {
  const inputRef        = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)

  // ── KEY FIX: store the latest callbacks in refs ──────────────────────────────
  // The place_changed listener is created once and closed over these refs,
  // so it always calls the current onChange/onSelect even after re-renders.
  // This prevents the stale-closure "double-click" bug.
  const onChangeRef = useRef(onChange)
  const onSelectRef = useRef(onSelect)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])

  // ── Initialize Autocomplete exactly once ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    loadMapsScript()
      .then(() => {
        if (cancelled || !inputRef.current || autocompleteRef.current) return

        const ac = new google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          componentRestrictions: { country: [] },
          fields: ['address_components', 'formatted_address'],
        })
        autocompleteRef.current = ac

        ac.addListener('place_changed', () => {
          const place = ac.getPlace()
          if (!place.address_components) {
            console.warn('[AddressAutocomplete] No address_components:', place)
            return
          }
          const parsed = parsePlaceResult(place)
          // Always calls the LATEST callbacks via refs — single click now works
          onChangeRef.current(parsed.address1 || place.formatted_address || '')
          onSelectRef.current(parsed)
        })
      })
      .catch(err => console.warn('[AddressAutocomplete]', err))

    return () => {
      cancelled = true
      if (autocompleteRef.current) {
        try { google.maps.event.clearInstanceListeners(autocompleteRef.current) } catch (_) {}
        autocompleteRef.current = null
      }
    }
  }, []) // ← empty deps: Autocomplete instance created once; callbacks live in refs

  return (
    <div style={{ position: 'relative' }}>
      <style>{`
        .pac-container { z-index: 100000 !important; }
      `}</style>
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        className={className}
        placeholder={placeholder}
        style={style}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      <span style={{
        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
        fontSize: 9, color: 'var(--text-muted)', pointerEvents: 'none',
        letterSpacing: '0.04em', fontWeight: 500, opacity: 0.7,
      }}>
        📍
      </span>
    </div>
  )
}
