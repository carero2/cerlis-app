import { Rule } from './GameChrome'
import { Sheet } from './Sheet'

/** Reglas del juego cooperativo de pistas para quien no lo conoce. */
export function CodigoHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Cómo se juega a Código secreto" tone="wood">
      <div className="go-help">
        <p className="go-help-intro">
          Un juego <b>cooperativo</b>: no jugáis el uno contra el otro, sino juntos contra el reloj. Una partida dura
          unos 15–20 minutos.
        </p>

        <Rule n={1} title="El objetivo">
          <p>
            En el tablero hay 25 palabras. Entre ellas se esconden <b>15 agentes</b>. Ganáis si los encontráis todos
            antes de que se acaben los <b>9 turnos</b>.
          </p>
        </Rule>

        <Rule n={2} title="Cada uno ve una clave distinta">
          <p>
            En tu móvil, con “Ver mi clave”, ves qué palabras son <b className="cg-g">tus agentes</b> (9) y cuáles son{' '}
            <b className="cg-a">asesinos</b> (3). Tu pareja ve <b>otra clave</b>: algunas coinciden y otras no. Tú no
            puedes ver la suya, ni ella la tuya.
          </p>
        </Rule>

        <Rule n={3} title="Dar una pista">
          <p>
            Cuando te toca, escribes <b>una sola palabra</b> y un <b>número</b>: cuántas palabras del tablero tienen que
            ver con ella. Por ejemplo, si tus agentes son <i>playa</i>, <i>ola</i> y <i>sal</i>, podrías decir{' '}
            <b>«Mar · 3»</b>.
          </p>
          <p>No vale usar una palabra del tablero, ni partes de ella, ni dar más explicaciones.</p>
        </Rule>

        <Rule n={4} title="Adivinar">
          <p>
            Tu pareja toca palabras una a una, y se mira en <b>la clave de quien dio la pista</b>:
          </p>
          <ul>
            <li>✅ <b>Agente:</b> se descubre y puede seguir tocando (aunque se pase del número).</li>
            <li>✋ <b>Neutral:</b> se acaba el turno. Esa palabra queda marcada como neutral para esa clave.</li>
            <li>💀 <b>Asesino:</b> ¡perdéis la partida al momento!</li>
          </ul>
          <p>Hay que tocar al menos una palabra; después se puede parar cuando se quiera con “Terminar turno”.</p>
        </Rule>

        <Rule n={5} title="Turnos">
          <p>
            Cada pista gasta uno de los 9 turnos. Normalmente os vais turnando para dar pistas; si uno ya no tiene
            agentes por señalar, el otro da todas las que quedan.
          </p>
          <p>
            Si se acaban los turnos llega la <b>muerte súbita</b>: ya no hay pistas, solo podéis tocar palabras que
            creáis agentes de la clave del otro. Un solo fallo y perdéis.
          </p>
        </Rule>

        <Rule n={6} title="Consejos">
          <ul>
            <li>Mejor una pista segura para 2 que una arriesgada para 4.</li>
            <li>Antes de dar la pista, mira tus asesinos: que no se parezcan a tu palabra.</li>
            <li>Una palabra neutral para ti puede ser un agente para tu pareja: ¡no la descartes del todo!</li>
            <li>Las marcas “tú” o con la inicial de tu pareja dicen para qué clave ya se sabe que es neutral.</li>
          </ul>
        </Rule>

        <Rule n={7} title="En esta app">
          <ul>
            <li>Toca una palabra para elegirla y confírmala con el botón de abajo, para evitar toques sin querer.</li>
            <li>Cada uno juega desde su móvil cuando le toca; en Inicio aparece un aviso.</li>
            <li>Abajo tenéis el historial de pistas y cómo salió cada intento.</li>
          </ul>
        </Rule>
      </div>
    </Sheet>
  )
}
