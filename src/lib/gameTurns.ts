import { useMyCodigoTurn } from './codigoGame'
import { useMyGoTurn } from './goGame'
import { useMyJaipurTurn } from './jaipurGame'

/** Juegos en los que le toca hacer algo a quien usa este móvil. */
export function useMyGameTurns() {
  const turns = { go: useMyGoTurn(), jaipur: useMyJaipurTurn(), codigo: useMyCodigoTurn() }
  const pending = (Object.keys(turns) as (keyof typeof turns)[]).filter((k) => turns[k])
  return { ...turns, pending }
}
