import { useEffect } from 'react'
import { TabBar } from './components/TabBar'
import { useAuth } from './lib/auth'
import { DataProvider, useData } from './lib/data'
import { useRegisterMember } from './lib/people'
import { useMyGameTurns } from './lib/gameTurns'
import { usePrefs } from './lib/prefs'
import { routeTab, useRoute } from './lib/router'
import { Calendar } from './screens/Calendar'
import { CodigoScreen } from './screens/CodigoScreen'
import { Games } from './screens/Games'
import { GoScreen } from './screens/GoScreen'
import { Home } from './screens/Home'
import { JaipurScreen } from './screens/JaipurScreen'
import { RecipeDetail } from './screens/RecipeDetail'
import { RecipeEditor } from './screens/RecipeEditor'
import { Recipes } from './screens/Recipes'
import { Settings } from './screens/Settings'
import { ShoppingList } from './screens/ShoppingList'
import { NoAccess, SignIn } from './screens/SignIn'

export function useThemeEffect() {
  const { theme } = usePrefs()
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.dataset.theme = theme

    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#121413' : '#f6f4ef')
    }
    apply()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}

const Spinner = () => (
  <div className="boot-screen">
    <div className="spinner" aria-label="Cargando" />
  </div>
)

export function Shell() {
  const { state } = useAuth()
  if (state.status === 'loading') return <Spinner />
  if (state.status === 'signed-out') return <SignIn />
  return (
    <DataProvider>
      <Main />
    </DataProvider>
  )
}

function Main() {
  const route = useRoute()
  const { items, ready, sync } = useData()
  useRegisterMember()
  const gameTurns = useMyGameTurns()
  const pending = items.filter((i) => !i.checked).length
  const hideTabs = route.name === 'recipe-new' || route.name === 'recipe-edit'

  if (sync === 'denied') return <NoAccess />

  let screen
  if (!ready) screen = <Spinner />
  else
    switch (route.name) {
      case 'list':
        screen = <ShoppingList />
        break
      case 'recipes':
        screen = <Recipes />
        break
      case 'recipe':
        screen = <RecipeDetail id={route.id} />
        break
      case 'recipe-new':
        screen = <RecipeEditor aiFocus={route.ai} />
        break
      case 'recipe-edit':
        screen = <RecipeEditor key={route.id} id={route.id} />
        break
      case 'calendar':
        screen = <Calendar initialDate={route.date} />
        break
      case 'games':
        screen = <Games />
        break
      case 'game':
        screen = route.game === 'go' ? <GoScreen /> : route.game === 'jaipur' ? <JaipurScreen /> : <CodigoScreen />
        break
      case 'settings':
        screen = <Settings />
        break
      default:
        screen = <Home />
    }

  return (
    <div className={`app ${hideTabs ? 'no-tabs' : ''}`}>
      <div className="screen" key={route.name + ('id' in route ? route.id : '') + ('game' in route ? route.game : '')}>
        {screen}
      </div>
      {!hideTabs && <TabBar active={routeTab(route)} badge={pending} gameTurn={gameTurns.pending.length > 0} />}
    </div>
  )
}
