# Cerlis

PWA (React + Vite + TypeScript) para iPhone: lista de la compra, recetario y
pantalla de inicio compartidos por una pareja. Datos en Firebase (Firestore +
Auth con Google), IA con Firebase AI Logic (Gemini). Se publica en GitHub
Pages con `.github/workflows/deploy.yml`. Interfaz y textos en español.

## Recordatorios para el usuario

- **Reglas de Firestore**: cada vez que cambie `firestore.rules` (por ejemplo,
  una colección nueva), recuérdale explícitamente al usuario que debe pegarlas
  en la consola de Firebase → Firestore → Reglas, **con sus dos correos reales**
  (en el repo solo hay correos de ejemplo), y pulsar Publicar. Después, cerrar
  la app del todo y volver a abrirla. Si no cambian, díselo también.
- Si hace falta activar algo en la consola de Firebase (AI Logic, un proveedor
  de acceso, un dominio autorizado…), explícale los pasos.

## Comprobaciones

- `npm run build` (incluye `tsc --noEmit`).
- `npx vite build --mode localtest` compila sin Firebase (modo local) para
  probar la app en un navegador sin cuenta.
- Las fotos van comprimidas dentro de Firestore (`photos/*` + miniatura en el
  documento); Cloud Storage no está en el plan gratuito.
