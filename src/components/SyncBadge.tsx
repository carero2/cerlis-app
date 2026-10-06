import type { SyncState } from '../lib/types'

const LABELS: Record<SyncState, string> = {
  local: 'Solo en este dispositivo',
  connecting: 'Conectando…',
  online: 'Sincronizado',
  offline: 'Sin conexión · se guardará luego',
  error: 'Error de sincronización',
  denied: 'Sin acceso',
}

export function SyncBadge({ state }: { state: SyncState }) {
  return (
    <span className={`sync-badge sync-${state}`}>
      <span className="sync-dot" />
      {LABELS[state]}
    </span>
  )
}
