import { useCallback, useRef, useState } from 'react'

const MAX_LOGS = 200

// Console lines from the preview, capped so a chatty loop cannot grow memory forever.
export default function useConsoleLogs() {
  const [logs, setLogs] = useState([])
  const nextId = useRef(0)
  const addLog = useCallback((entry) => {
    const item = { ...entry, id: ++nextId.current }
    setLogs((current) => [...current.slice(1 - MAX_LOGS), item])
  }, [])
  const clearLogs = useCallback(() => setLogs([]), [])
  return { logs, addLog, clearLogs }
}
