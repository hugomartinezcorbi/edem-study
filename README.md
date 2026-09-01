# EDEM Study

App de estudio personalizada para ADE en EDEM: apuntes que se auto-generan y crecen con cada documento subido, más el método de estudio **Fallar → Estudiar → Explicar → Volver (FEVR)** con repetición espaciada.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Supabase (Postgres + Auth + Storage)
- Claude (Anthropic API) para generar apuntes, preguntas y evaluar explicaciones
- Vercel para el deploy

## 1. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, pega y ejecuta el contenido de [`supabase/schema.sql`](./supabase/schema.sql). Crea todas las tablas, políticas RLS y el bucket de Storage `documents`.
3. En **Authentication → Providers**, activa Email y, si quieres login con Google, activa el provider de Google con tus credenciales OAuth.
4. En **Authentication → URL Configuration**, añade `http://localhost:3000/auth/callback` (y la URL de producción cuando despliegues) a las Redirect URLs.
5. Copia `Project URL`, `anon public key` y `service_role key` desde **Settings → API**.

## 2. Variables de entorno

Copia `.env.local.example` a `.env.local` y rellena:

```bash
cp .env.local.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — de Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` — de Supabase (server-only, no la expongas en el cliente).
- `ANTHROPIC_API_KEY` — de [console.anthropic.com](https://console.anthropic.com/settings/keys).

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

## Deploy

```bash
npx vercel
```

Añade las mismas variables de entorno en el proyecto de Vercel, y actualiza las Redirect URLs de Supabase con el dominio de producción.
