# Cerlis 🧺

Lista de la compra y recetario compartido para dos, pensado para usarse como
app en el iPhone (Safari → Compartir → **Añadir a pantalla de inicio**).

- **Inicio**: resumen de la lista, añadido rápido y sugerencia de qué cocinar.
- **Compra**: varias listas por tienda (súper, farmacia…), sincronizadas en
  tiempo real y agrupadas por pasillos editables (crear, renombrar, ordenar,
  borrar). La app aprende el pasillo de cada producto cuando lo corriges.
  Detección de cantidad (“2 leche”), deslizar para editar/borrar, “Deshacer”
  y sugerencias de lo que soléis comprar.
- **Recetas**: recetario con búsqueda, etiquetas y favoritas. Cada receta
  tiene **ingredientes** y **preparación**; con un toque mandas los
  ingredientes que os faltan a la lista. Modo cocina para que no se apague la
  pantalla.
- **Calendario**: planes compartidos con vista de mes, eventos de todo el día,
  con hora o de varios días (viajes), repeticiones semanales, mensuales o
  anuales (cumpleaños, aniversarios) y notas. Cada plan es de uno de los
  dos o de ambos, con su color (cada uno elige el suyo en Ajustes). Los
  próximos salen en Inicio.
- **Juegos**: partida de **Go** por turnos entre los dos (9×9, 13×13 o
  19×19): cada uno mueve desde su móvil cuando le toca y la pestaña e Inicio
  avisan de que es tu turno. También se puede jugar en un solo móvil. La app
  impide jugadas ilegales (suicidio, ko), cuenta capturas y hace el recuento
  final; lleva el marcador de victorias. El botón **?** explica las reglas
  con diagramas para quien no ha jugado nunca.
- **Ajustes**: tu nombre, foto de los dos, mensaje y cuenta atrás para
  Inicio (opcionales y compartidos), tema y copia de seguridad.

## Puesta en marcha

```bash
npm install
npm run dev        # http://localhost:5173 (también accesible desde el móvil en la misma wifi)
npm run build      # genera dist/
```

Sin configurar nada, la app funciona en **modo local** (los datos se guardan
solo en ese dispositivo). Para compartirlos entre los dos móviles hay que
conectar Firebase.

## Sincronización entre dispositivos (Firebase)

Se usa **Cloud Firestore** (tiempo real + caché offline, ideal para el súper
sin cobertura) y **Firebase Authentication con Google**. Todo cabe en el plan
gratuito **Spark**: no añadas tarjeta y nunca habrá cargos.

1. Crea un proyecto en <https://console.firebase.google.com> (puedes
   desactivar Google Analytics).
2. **Authentication → Comenzar → Método de inicio de sesión → Google →
   Habilitar** (elige un correo de asistencia y guarda).
3. **Authentication → Configuración → Dominios autorizados → Agregar
   dominio**: `carero2.github.io`.
4. **Firestore Database → Crear base de datos** (modo producción, región
   `eur3 (europe-west)`).
5. **Firestore → Reglas**: pega [`firestore.rules`](firestore.rules),
   **cambia los dos correos de ejemplo por los vuestros** y pulsa Publicar.
6. **Configuración del proyecto (⚙️) → Tus apps → Web (`</>`)**: registra
   una app (sin Hosting) y copia los valores de `firebaseConfig` en
   [`.env.production`](.env.production) (ya está rellenado para `cerlis-app`).
7. Para probar en local con sincronización: copia `.env.production` a
   `.env.local`.

Cada uno entra con **“Continuar con Google”**. Si alguien entra con una cuenta
que no está en las reglas, ve una pantalla de “Sin acceso” y no puede leer ni
escribir nada.

### ¿Es seguro?

- La configuración web de Firebase **no es secreta** (cualquiera la ve en el
  navegador). La seguridad la dan las **reglas de Firestore**, que viven en tu
  proyecto de Firebase, no en GitHub: cambiar el repositorio no las cambia.
- Las reglas solo dejan pasar a las cuentas de Google de la lista, con el
  correo verificado.

## Publicar en GitHub Pages

El workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
compila y publica la app en cada push a `main` (y de momento también a la rama
de desarrollo). También se puede lanzar a mano desde **Actions → Publicar en
GitHub Pages → Run workflow**.

1. **Settings → Pages → Source: GitHub Actions** (no “Deploy from a branch”:
   la app hay que compilarla antes de publicarla).
2. La app queda en <https://carero2.github.io/cerlis-app/>. Ábrela en Safari
   y elige **Compartir → Añadir a pantalla de inicio**.

## Estructura

```
src/
  lib/
    store/          Capa de datos: interfaz común + Firebase + localStorage
    data.tsx        Proveedor React con lista, recetas y estado de sincronización
    auth.tsx        Sesión con Google (solo si Firebase está configurado)
    categories.ts   Pasillos y detección de categoría/cantidad
    recipes.ts      Utilidades de recetas (parseo de ingredientes, etc.)
    router.ts       Router por hash (funciona en cualquier hosting estático)
    prefs.ts        Preferencias locales (nombre, tema)
    go.ts           Motor del Go (capturas, suicidio, ko, recuento por área)
    goGame.ts       Partida compartida: turnos, pases, rendirse, marcador
  components/       UI reutilizable (hojas inferiores, avisos, filas deslizables…)
  screens/          Inicio, Compra, Recetas, Detalle, Editor, Ajustes, Inicio de sesión
public/             Manifest, iconos y service worker
firestore.rules     Reglas de seguridad
```

### Modelo de datos

```
items/*    { name, quantity?, category, listId?, checked, addedBy?, recipeId?, photo?, createdAt, checkedAt? }
recipes/*  { title, emoji, ingredients: string[], steps: string[], photo?,
             servings?, time?, tags[], notes?, source?, favorite, … }
photos/*   { data: "data:image/jpeg;base64,…", createdAt }
events/*   { title, date: "AAAA-MM-DD", endDate?, allDay, start?: "HH:mm", end?,
             repeat?: weekly|monthly|yearly, who?: uid (o "los dos"), notes?, createdBy? }
settings/shopping { lists?: [{ id, name, emoji? }], categories?: [{ id, label, emoji? }],
                    learned?: { [producto]: idPasillo } }
settings/home { members?: { [uid]: { name, email?, color } }, photo?, message?: { text, author?, updatedAt },
                countdown?: { title, emoji, date } }
settings/go   { game?: { id, size, black: uid, white: uid, hotseat?, moves: number[] (-1 = pasar),
                         status: playing|scoring|finished, dead?: number[], komi, result? },
                wins?: { [uid]: número } }

photo = { id, thumb }   // id de photos/* + miniatura JPEG de ~360 px
```

## Recetas con IA

En **Recetas → Crear con IA** (o el botón ✨ de Inicio) se describe lo que se
quiere —“una lasaña”, una lista de ingredientes, “algo con algunos de estos…”
o una receta pegada— y Gemini rellena el formulario (título, raciones, tiempo,
ingredientes, pasos, etiquetas y notas). Antes de guardar se puede revisar,
deshacer o pedir cambios (“hazla vegetariana”, “para 4”).

Funciona con **Firebase AI Logic** y la **Gemini Developer API** en el plan
gratuito Spark, sin claves en la app. Para activarlo:

1. Consola de Firebase → **AI Logic** (menú Compilación / Build) →
   **Comenzar** → elige **Gemini Developer API** y confirma.
2. Listo: la app usa la misma sesión de Google y el mismo proyecto.

Los modelos se prueban en orden (ver `MODELS` en
[`src/lib/ai.ts`](src/lib/ai.ts)); si uno no existe o se queda sin cuota se
pasa al siguiente. Se puede forzar uno con `VITE_GEMINI_MODEL`.

**Limitaciones**

- La capa gratuita tiene un número limitado de peticiones por minuto y por
  día (Google lo cambia de vez en cuando). Para dos personas sobra, pero si se
  agota la app avisa y hay que esperar.
- En la capa gratuita, Google puede usar las peticiones para mejorar sus
  productos: no escribas datos personales en las descripciones.
- La IA puede equivocarse con cantidades o tiempos: revisa antes de guardar.
- Necesita conexión a internet.

## Fotos

Recetas y productos de la lista pueden tener foto (cámara o fototeca). Como
**Cloud Storage ya no está en el plan gratuito**, las fotos se comprimen en el
móvil y se guardan en Firestore: una miniatura dentro del producto o receta y
la imagen grande (≈1280 px, < 1 MB) en la colección `photos`, que solo se
descarga al abrirla. Con 1 GB gratis de Firestore caben varios miles de fotos.

> Cada vez que cambie [`firestore.rules`](firestore.rules) hay que volver a
> publicarlas en la consola (ahora incluyen `photos`, `settings` y `events`).
