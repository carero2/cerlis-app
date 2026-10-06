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
- **Ajustes**: tu nombre, cuenta de Google, estado de sincronización, tema
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
  components/       UI reutilizable (hojas inferiores, avisos, filas deslizables…)
  screens/          Inicio, Compra, Recetas, Detalle, Editor, Ajustes, Inicio de sesión
public/             Manifest, iconos y service worker
firestore.rules     Reglas de seguridad
```

### Modelo de datos

```
items/*    { name, quantity?, category, checked, addedBy?, recipeId?, createdAt, checkedAt? }
recipes/*  { title, emoji, ingredients: string[], steps: string[],
             servings?, time?, tags[], notes?, source?, favorite, … }
```

## Próximo paso: recetas con IA

Con la misma sesión de Google y el mismo proyecto de Firebase se puede usar
Gemini a través de **Firebase AI Logic** (Gemini Developer API, con capa
gratuita en el plan Spark), sin claves guardadas en la app ni en el
repositorio. La IA convertirá un enlace, texto o foto en una receta con
**exactamente** el formato `Recipe` de [`src/lib/types.ts`](src/lib/types.ts):
`ingredients: string[]` y `steps: string[]`.
