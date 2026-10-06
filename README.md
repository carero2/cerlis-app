# Cerlis 🧺

Lista de la compra y recetario compartido para dos, pensado para usarse como
app en el iPhone (Safari → Compartir → **Añadir a pantalla de inicio**).

- **Inicio**: resumen de la lista, añadido rápido y sugerencia de qué cocinar.
- **Compra**: lista sincronizada en tiempo real, agrupada por pasillos,
  detección automática de cantidad (“2 leche”, “tomates 1 kg”), deslizar para
  editar/borrar, “Deshacer” y sugerencias de lo que soléis comprar.
- **Recetas**: recetario con búsqueda, etiquetas y favoritas. Cada receta
  tiene **ingredientes** y **preparación**; con un toque mandas los
  ingredientes que os faltan a la lista. Modo cocina para que no se apague la
  pantalla.
- **Ajustes**: tu nombre, hogar compartido (código para invitar), tema
  claro/oscuro y copia de seguridad.

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
sin cobertura) y **Firebase Authentication**. Ambos son gratuitos para este
uso.

1. Crea un proyecto en <https://console.firebase.google.com>.
2. **Authentication → Método de inicio de sesión → Anónimo → Habilitar.**
3. **Firestore Database → Crear base de datos** (modo producción, región
   `eur3` o la más cercana).
4. **Firestore → Reglas**: pega el contenido de [`firestore.rules`](firestore.rules)
   y publica (o `npx firebase-tools deploy --only firestore:rules`).
5. **Configuración del proyecto → Tus apps → Web (`</>`)**: registra una app
   web y copia la configuración.
6. Copia `.env.example` a `.env.local` y rellena los valores `VITE_FIREBASE_*`.
7. Si publicas en un dominio propio o en GitHub Pages, añádelo en
   **Authentication → Configuración → Dominios autorizados**.

La primera vez que abráis la app, uno crea un **hogar** y comparte el código
(`XXXX-XXXX`); el otro elige “Tengo un código”. A partir de ahí todo lo que
añada uno aparece al instante en el otro móvil.

> La configuración web de Firebase no es secreta: la seguridad la dan las
> reglas de Firestore, que solo permiten leer y escribir a los miembros del
> hogar.

## Publicar en GitHub Pages

El workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
compila y publica la app en cada push a `main`.

1. **Settings → Pages → Source: GitHub Actions.**
2. **Settings → Secrets and variables → Actions → Variables**: crea las
   variables `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
   `VITE_FIREBASE_MESSAGING_SENDER_ID` y `VITE_FIREBASE_APP_ID`.
3. La app quedará en `https://<usuario>.github.io/cerlis-app/`. Ábrela en
   Safari y añádela a la pantalla de inicio.

## Estructura

```
src/
  lib/
    store/          Capa de datos: interfaz común + Firebase + localStorage
    data.tsx        Proveedor React con lista, recetas y estado de sincronización
    categories.ts   Pasillos y detección de categoría/cantidad
    recipes.ts      Utilidades de recetas (parseo de ingredientes, etc.)
    router.ts       Router por hash (funciona en cualquier hosting estático)
    prefs.ts        Preferencias locales (nombre, hogar, tema)
  components/       UI reutilizable (hojas inferiores, avisos, filas deslizables…)
  screens/          Inicio, Compra, Recetas, Detalle, Editor, Ajustes, Bienvenida
public/             Manifest, iconos y service worker
firestore.rules     Reglas de seguridad
```

### Modelo de datos

```
households/{código}            { name, members: [uid] }
households/{código}/items/*    { name, quantity?, category, checked, addedBy?, recipeId?, createdAt, checkedAt? }
households/{código}/recipes/*  { title, emoji, ingredients: string[], steps: string[],
                                 servings?, time?, tags[], notes?, source?, favorite, … }
```

## Próximo paso: recetas con IA

La idea es iniciar sesión con Google y usar Gemini con la cuenta del usuario
(sin guardar credenciales) para convertir un enlace, texto o foto en una
receta con **exactamente** el formato `Recipe` de
[`src/lib/types.ts`](src/lib/types.ts): `ingredients: string[]` y
`steps: string[]`. El editor ya acepta pegar listas y las separa por líneas,
así que la IA solo tendrá que rellenar ese mismo borrador.
