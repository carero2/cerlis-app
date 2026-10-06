import { paths, switchTab, type Tab } from '../lib/router'
import { Icon, type IconName } from './Icon'

const TABS: { id: Tab; label: string; icon: IconName; path: string }[] = [
  { id: 'home', label: 'Inicio', icon: 'home', path: paths.home },
  { id: 'list', label: 'Compra', icon: 'cart', path: paths.list },
  { id: 'recipes', label: 'Recetas', icon: 'book', path: paths.recipes },
  { id: 'calendar', label: 'Calendario', icon: 'calendar', path: paths.calendar },
  { id: 'games', label: 'Juegos', icon: 'go', path: paths.games },
  { id: 'settings', label: 'Ajustes', icon: 'gear', path: paths.settings },
]

export function TabBar({ active, badge, gameTurn }: { active: Tab; badge?: number; gameTurn?: boolean }) {
  return (
    <nav className="tabbar" aria-label="Secciones">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={`tab tab-${t.id} ${active === t.id ? 'is-active' : ''}`}
          aria-current={active === t.id ? 'page' : undefined}
          onClick={() => (active === t.id ? window.scrollTo({ top: 0, behavior: 'smooth' }) : switchTab(t.path))}
        >
          <span className="tab-icon">
            <Icon name={t.icon} size={25} />
            {t.id === 'list' && !!badge && <span className="tab-badge">{badge > 99 ? '99+' : badge}</span>}
            {t.id === 'games' && gameTurn && <span className="tab-dot" aria-label="Te toca" />}
          </span>
          <span className="tab-label">{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
