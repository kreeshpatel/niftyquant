import { useRef, useCallback } from 'react'

export function useFlash() {
  const ref = useRef(null)
  const prevValue = useRef(null)

  const flash = useCallback((newValue) => {
    if (!ref.current || prevValue.current === null) {
      prevValue.current = newValue
      return
    }
    const el = ref.current
    const prev = prevValue.current
    prevValue.current = newValue
    if (newValue === prev) return

    el.classList.remove('flash-gain', 'flash-loss')
    void el.offsetWidth
    el.classList.add(newValue > prev ? 'flash-gain' : 'flash-loss')
    setTimeout(() => el?.classList.remove('flash-gain', 'flash-loss'), 650)
  }, [])

  return { ref, flash }
}
