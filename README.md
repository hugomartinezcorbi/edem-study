# EDEM Study

App de estudio personalizada para ADE en EDEM: apuntes que se auto-generan y crecen con cada documento subido, más el método de estudio **Fallar → Estudiar → Explicar → Volver (FEVR)** con repetición espaciada.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Supabase (Postgres + Auth + Storage)
- Claude (Anthropic API) para generar apuntes, preguntas y evaluar explicaciones
- Vercel para el deploy

## 1. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, pega y ejecuta el contenido de [`supabase/schema.sql`](./supabase/schema.sql) (asignaturas, apuntes, estudio FEVR). Cuando te pida confirmar una "destructive operation" (por los `DROP TRIGGER IF EXISTS`), confirma — es normal y seguro.
3. Ejecuta también [`supabase/social-schema.sql`](./supabase/social-schema.sql) (comunidades, chat, foro, apuntes compartidos, PDF con IA, notificaciones, moderación). Es una migración incremental — puedes volver a correrla sin duplicar nada.
4. En **Authentication → Providers**, activa Email y, si quieres login con Google, activa el provider de Google con tus credenciales OAuth.
5. En **Authentication → URL Configuration**, añade `http://localhost:3000/auth/callback` (y la URL de producción cuando despliegues) a las Redirect URLs.
6. Copia `Project URL`, `anon public key` y `service_role key` desde **Settings → API**.

## 2. Variables de entorno

Copia `.env.local.example` a `.env.local` y rellena:

```bash
cp .env.local.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — de Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` — de Supabase (server-only, no la expongas en el cliente).
- `ANTHROPIC_API_KEY` — de [console.anthropic.com](https://console.anthropic.com/settings/keys).
- `ADMIN_USER_ID` — regístrate primero en la app, luego copia tu id desde el final de `/profile` y ponlo aquí. Te da acceso a `/admin`.

## 3. Ejecutar en local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000), crea una cuenta y se precargan automáticamente las 10 asignaturas de ADE (Semestre I activas, Semestre II desactivadas).

## Cómo funciona

- **Documentos** (`/subject/[id]/documents`): sube PDFs, DOCX, PPTX o fotos de apuntes. Se extrae el texto automáticamente (pdf-parse, mammoth, un parser de PPTX propio, y OCR con tesseract.js para imágenes).
- **Apuntes** (`/subject/[id]/notes`): una única página por asignatura. El botón "Actualizar apuntes" envía todo el material nuevo a Claude, que integra y reorganiza los apuntes existentes (no los duplica), y genera los conceptos y preguntas de estudio nuevos.
- **Exámenes anteriores** (`/subject/[id]/exams`): sube exámenes de otros años. Se analizan con Claude para detectar temas recurrentes y el estilo real de las preguntas, y esa información se usa para generar preguntas de estudio que se parecen a las del examen real.
- **Estudiar** (`/subject/[id]/study` o `/study`): sesión con el método FEVR — Fallar (preguntas sin haber estudiado), Estudiar (explicación de lo fallado, personalizada según tu error), Explicar (lo cuentas con tus palabras y Claude evalúa si lo entendiste) y Volver (preguntas nuevas sobre lo mismo). Al terminar se actualiza la repetición espaciada (SM-2) de cada concepto.
- **Dashboard** (`/dashboard`): lo que toca repasar hoy, racha de estudio, progreso por asignatura y estadísticas rápidas.

### Módulo social

- **Comunidades** (`/community`): registro abierto — cualquiera se une o crea una comunidad por asignatura (distintas de tus asignaturas personales).
- **Chat** (`/community/[id]/chat`): tiempo real con Supabase Realtime, indicador de "escribiendo…" vía Presence, respuestas, fijar mensajes (moderadores), adjuntar archivos, scroll infinito hacia atrás.
- **Foro** (`/community/[id]/forum`): posts tipo apuntes/pregunta/recurso/discusión, voto arriba/abajo, comentarios anidados (2 niveles), ordenar por recientes/votados/comentados.
- **Apuntes compartidos** (`/community/[id]/notes`): sube, descarga, valora con estrellas — todo entra en el mismo pipeline de extracción de texto que los documentos personales.
- **Generador de PDF con IA** (`/generate-pdf`): combina tus apuntes, apuntes de la comunidad, posts del foro y mensajes del chat seleccionados; Claude los unifica y `@react-pdf/renderer` genera un PDF de verdad (portada, índice, cabeceras/pies con número de página). Límite de 5 por hora.
- **Notificaciones**: campana en tiempo real (menciones, respuestas, votos, nuevos apuntes, valoraciones, descargas).
- **Reputación**: puntos por upvotes, apuntes con 5 estrellas y descargas — gestionado por triggers en la base de datos (auditable vía `adjust_reputation`).
- **Moderación con IA** (`/admin`, solo tu `ADMIN_USER_ID`): todo contenido nuevo pasa por Claude antes de publicarse — se auto-aprueba, se auto-rechaza o queda pendiente de tu revisión manual según el umbral que configures en `/admin/rules` (también puedes bloquear o marcar palabras clave). Desde ahí gestionas usuarios (silenciar/banear/verificar) y comunidades (archivar/eliminar).

## Deploy

```bash
npx vercel
```

Añade las mismas variables de entorno en el proyecto de Vercel, y actualiza las Redirect URLs de Supabase con el dominio de producción.
