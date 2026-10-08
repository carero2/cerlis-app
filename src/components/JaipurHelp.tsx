import { CARD_INFO } from '../lib/jaipur'
import type { JaipurCard } from '../lib/types'
import { Rule } from './GameChrome'
import { Sheet } from './Sheet'

function Mini({ cards }: { cards: JaipurCard[] }) {
  return (
    <span className="jp-mini-row">
      {cards.map((c, i) => (
        <span key={i} className={`jp-mini jp-${c}`}>
          {CARD_INFO[c].emoji}
        </span>
      ))}
    </span>
  )
}

/** Reglas del juego de comercio para quien no lo conoce. */
export function JaipurHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Cómo se juega a Jaipur" tone="wood">
      <div className="go-help">
        <p className="go-help-intro">
          Sois dos comerciantes en el mercado de Jaipur. Cada turno haces <b>una</b> cosa: coger cartas o vender. Se
          juega en unos 10 minutos por ronda.
        </p>

        <Rule n={1} title="El objetivo">
          <p>
            Tener más <b>rupias</b> que tu pareja al acabar la ronda. Quien gana una ronda se lleva un sello ●; el
            primero que consigue <b>2 sellos</b> gana la partida.
          </p>
        </Rule>

        <Rule n={2} title="Las cartas">
          <p>
            Hay seis mercancías, de más cara a más barata: <Mini cards={['diamond', 'gold', 'silver']} /> diamantes,
            oro y plata; <Mini cards={['cloth', 'spice', 'leather']} /> telas, especias y cuero.
          </p>
          <p>
            Y <Mini cards={['camel']} /> <b>camellos</b>: no se venden, van a tu corral y sirven para hacer cambios.
          </p>
          <p>
            En el centro hay un <b>mercado</b> de 5 cartas visible para los dos. Tu mano solo la ves tú (máximo{' '}
            <b>7 cartas</b>, sin contar camellos).
          </p>
        </Rule>

        <Rule n={3} title="En tu turno: coger">
          <p>Elige una de estas tres:</p>
          <ul>
            <li>
              <b>Una mercancía</b> del mercado. Su hueco se rellena con el mazo.
            </li>
            <li>
              <b>Todos los camellos</b> del mercado a la vez (no se puede coger solo uno). Así salen cartas nuevas… ¡que
              quizá aproveche tu pareja!
            </li>
            <li>
              <b>Cambiar:</b> coges 2 o más mercancías del mercado y dejas el mismo número de cartas de tu mano y/o
              camellos. No puedes dar y coger el mismo tipo.
            </li>
          </ul>
        </Rule>

        <Rule n={4} title="En tu turno: vender">
          <p>
            Vende las cartas que quieras de <b>un solo tipo</b>. Por cada carta te llevas una ficha de esa mercancía:
            las primeras valen más, así que vender pronto paga mejor… pero vender muchas juntas da <b>bonus</b>:
          </p>
          <ul>
            <li>3 cartas: bonus de 1 a 3 rupias.</li>
            <li>4 cartas: bonus de 4 a 6.</li>
            <li>5 o más: bonus de 8 a 10.</li>
          </ul>
          <p>
            Los diamantes, el oro y la plata se venden de <b>dos en dos</b> como mínimo. Los bonus de tu pareja no se
            ven hasta el final de la ronda.
          </p>
        </Rule>

        <Rule n={5} title="Final de la ronda">
          <p>
            La ronda acaba cuando se agotan las fichas de <b>3 mercancías</b> o cuando el mazo no puede rellenar el
            mercado. Quien tenga <b>más camellos</b> gana 5 rupias extra. Se suman fichas y bonus: quien tenga más,
            gana el sello. La siguiente ronda la empieza quien perdió.
          </p>
        </Rule>

        <Rule n={6} title="Consejos">
          <ul>
            <li>Fíjate en qué recoge tu pareja: si junta telas, véndelas tú antes y te quedas las fichas buenas.</li>
            <li>Coger los camellos llena tu corral, pero destapa cartas nuevas para el otro.</li>
            <li>Con la mano llena no puedes coger: los camellos te permiten cambiar sin vaciarla.</li>
          </ul>
        </Rule>

        <Rule n={7} title="En esta app">
          <ul>
            <li>Toca cartas del mercado para cogerlas; añade cartas tuyas o camellos (− +) para un cambio.</li>
            <li>Toca cartas de tu mano para venderlas. El botón de abajo te dice qué vas a hacer y si se puede.</li>
            <li>Cada uno juega desde su móvil; en Inicio aparece un aviso cuando te toca.</li>
          </ul>
        </Rule>
      </div>
    </Sheet>
  )
}
