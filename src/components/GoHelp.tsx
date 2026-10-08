import type { ReactNode } from 'react'
import { BLACK, EMPTY, WHITE, type Board } from '../lib/go'
import { GoBoard } from './GoBoard'
import { Sheet } from './Sheet'

/**
 * Diagrama a partir de texto: X = negra, O = blanca, . = vacío, y
 * cualquier otra letra o número es una marca sobre un cruce vacío.
 */
function Diagram({ rows, caption }: { rows: string[]; caption: string }) {
  const size = rows.length
  const board: Board = []
  const labels: Record<number, string> = {}
  rows.forEach((row, y) =>
    [...row.replace(/\s/g, '')].forEach((ch, x) => {
      const i = y * size + x
      if (ch === 'X') board[i] = BLACK
      else if (ch === 'O') board[i] = WHITE
      else {
        board[i] = EMPTY
        if (ch !== '.') labels[i] = ch
      }
    }),
  )
  return (
    <figure className="go-diagram">
      <GoBoard size={size} board={board} labels={labels} />
      <figcaption>{caption}</figcaption>
    </figure>
  )
}

function Rule({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="go-rule">
      <h4>
        <span className="go-rule-n">{n}</span>
        {title}
      </h4>
      {children}
    </section>
  )
}

/** Reglas del Go explicadas para quien no ha jugado nunca. */
export function GoHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Cómo se juega al Go" tone="wood">
      <div className="go-help">
        <p className="go-help-intro">
          El Go es un juego de estrategia para dos con reglas muy sencillas. En pocos minutos podéis empezar; dominarlo
          lleva toda la vida 😊
        </p>

        <Rule n={1} title="El objetivo">
          <p>
            Rodear más espacio del tablero que tu pareja. Uno juega con <b>negras</b> y otro con <b>blancas</b>; empiezan
            las negras y se alterna, una piedra por turno.
          </p>
          <p>
            Las piedras se colocan en los <b>cruces de las líneas</b> (no dentro de los cuadrados) y, una vez puestas, no
            se mueven.
          </p>
        </Rule>

        <Rule n={2} title="Las libertades">
          <p>
            Los cruces vacíos que tocan a una piedra en línea recta (arriba, abajo, izquierda y derecha) son sus{' '}
            <b>libertades</b>. Las diagonales no cuentan.
          </p>
          <Diagram rows={['.....', '..a..', '.aXa.', '..a..', '.....']} caption="Esta piedra negra tiene 4 libertades (a)." />
          <p>
            Las piedras del mismo color que se tocan en línea forman un <b>grupo</b> y comparten sus libertades: se
            salvan o caen juntas.
          </p>
        </Rule>

        <Rule n={3} title="Capturar">
          <p>
            Si rodeas una piedra o un grupo y le quitas <b>su última libertad</b>, lo capturas: se retira del tablero.
          </p>
          <Diagram rows={['.....', '..X..', '.XO1.', '..X..', '.....']} caption="Si negras juegan en 1, la blanca se queda sin libertades y queda capturada." />
        </Rule>

        <Rule n={4} title="Jugadas prohibidas">
          <p>
            <b>Suicidio:</b> no puedes poner una piedra donde se quedaría sin libertades… salvo que con esa jugada
            captures algo (entonces sí vale).
          </p>
          <Diagram rows={['.O...', 'O1O..', '.O...', '.....', '.....']} caption="Negras no pueden jugar en 1: estaría rodeada sin capturar nada." />
          <p>
            <b>Ko:</b> si capturas una sola piedra, tu pareja no puede recapturar justo en el siguiente turno si eso
            repite la posición. Tiene que jugar antes en otro sitio. Así se evitan bucles infinitos.
          </p>
          <Diagram rows={['.....', '.XO..', 'XO1O.', '.XO..', '.....']} caption="Negras capturan en 1. Blancas no pueden recapturar al instante: es ko." />
        </Rule>

        <Rule n={5} title="Grupos vivos: los dos ojos">
          <p>
            Un <b>ojo</b> es un hueco rodeado por tus piedras. Un grupo con <b>dos ojos separados</b> no se puede capturar
            nunca: el rival no puede jugar dentro de ninguno sin suicidarse. ¡Esa es la clave para que tus grupos vivan!
          </p>
          <Diagram rows={['.....', 'XXXXX', 'X.X.X', 'XXXXX', '.....']} caption="Este grupo negro tiene dos ojos: está vivo para siempre." />
        </Rule>

        <Rule n={6} title="El final y el recuento">
          <p>
            Cuando ninguno ve jugadas útiles, se <b>pasa</b>. Dos pases seguidos terminan la partida.
          </p>
          <p>
            Después, tocad las piedras <b>muertas</b> (las que están rodeadas y no podrían escapar) para marcarlas. La app
            cuenta los puntos de cada uno: <b>piedras en el tablero + territorio</b> (cruces vacíos rodeados solo por tus
            piedras).
          </p>
          <p>
            Las blancas reciben <b>7,5 puntos extra</b> (el <i>komi</i>) por empezar segundas. El medio punto evita
            empates. También puedes <b>rendirte</b> en cualquier momento.
          </p>
        </Rule>

        <Rule n={7} title="Consejos para empezar">
          <ul>
            <li>Empezad en el tablero de 9×9: las partidas duran unos 15 minutos.</li>
            <li>Las primeras jugadas, mejor cerca de las esquinas: ahí es más fácil hacer territorio.</li>
            <li>Mira siempre cuántas libertades tienen tus grupos. Si a uno le queda solo una, ¡está en peligro (atari)!</li>
            <li>No intentes capturarlo todo: muchas veces es mejor asegurar tu propio territorio.</li>
          </ul>
        </Rule>

        <Rule n={8} title="En esta app">
          <ul>
            <li>Toca un cruce para ver dónde irá la piedra (puedes tocar otro para cambiarla) y pulsa “Confirmar ficha” para jugar.</li>
            <li>Si la jugada no está permitida, la app te dirá por qué.</li>
            <li>Cada uno juega desde su móvil cuando le toca; en Inicio aparece un aviso cuando es tu turno.</li>
            <li>También podéis jugar los dos en el mismo móvil, pasándoos el teléfono.</li>
            <li>Con el + de arriba se empieza otra partida, cuando la actual haya terminado.</li>
          </ul>
        </Rule>
      </div>
    </Sheet>
  )
}
