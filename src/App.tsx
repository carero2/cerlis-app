import { useEffect } from 'react'
import { TabBar } from './components/TabBar'
import { useData, useNeedsHousehold } from './lib/data'
import { usePrefs } from './lib/prefs'
import { routeTab, useRoute } from './lib/router'
import { Home } from './screens/Home'
import { RecipeDetail } from './screens/RecipeDetail'
import { RecipeEditor } from './screens/RecipeEditor'
import { Recipes } from './screens/Recipes'
import { Settings } from './screens/Settings'
import { ShoppingList } from './screens/ShoppingList'
import { Welcome } from './screens/Welcome'

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

export function Shell() {
  const needsHousehold = useNeedsHousehold()
  if (needsHousehold) return <Welcome />
  return <Main />
}

function Main() {
  const route = useRoute()
  const { items, ready } = useData()
  const pending = items.filter((i) => !i.checked).length
  const hideTabs = route.name === 'recipe-new' || route.name === 'recipe-edit'

  let screen
  if (!ready) screen = <div className="boot-screen"><div className="spinner" aria-label="Cargando" /></div>
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
        screen = <RecipeEditor />
        break
      case 'recipe-edit':
        screen = <RecipeEditor key={route.id} id={route.id} />
        break
      case 'settings':
        screen = <Settings />
        break
      default:
        screen = <Home />
    }

  return (
    <div className={`app ${hideTabs ? 'no-tabs' : ''}`}>
      <div className="screen" key={route.name + ('id' in route ? route.id : '')}>
        {screen}
      </div>
      {!hideTabs && <TabBar active={routeTab(route)} badge={pending} />}
    </div>
  )
}
