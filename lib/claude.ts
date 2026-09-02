import Anthropic from "@anthropic-ai/sdk";
import type { ExamInsightsContent, NotesContent, QuestionType } from "@/lib/types";

const MODEL = "claude-sonnet-5";

let _client: Anthropic | null = null;
function client() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

/** Pulls the first JSON object/array out of a response that may be wrapped in prose or ```json fences. */
function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.search(/[[{]/);
  const end = Math.max(raw.lastIndexOf("}"), raw.lastIndexOf("]"));
  const jsonSlice = start >= 0 && end >= 0 ? raw.slice(start, end + 1) : raw;
  return JSON.parse(jsonSlice.trim()) as T;
}

async function callClaudeJson<T>(system: string, prompt: string, maxTokens = 8000): Promise<T> {
  const anthropic = client();
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: prompt }],
      });
      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n");
      return extractJson<T>(text);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Claude request failed");
}

export interface NewConceptDraft {
  title: string;
  definition: string;
  keyPoints: string[];
  examples: string[];
  topicNumber?: number;
}

export async function generateOrUpdateNotes(params: {
  subjectName: string;
  currentNotes: NotesContent | null;
  newDocumentText: string;
  processedDocsSummary: string;
}): Promise<{ notes: NotesContent; newConcepts: NewConceptDraft[] }> {
  const system =
    "Eres un asistente académico experto. Generas y mantienes apuntes universitarios completos, unificados y bien organizados. Respondes ÚNICAMENTE con JSON válido, sin texto adicional fuera del JSON.";

  const prompt = `ASIGNATURA: ${params.subjectName}

APUNTES ACTUALES (si existen):
${params.currentNotes ? JSON.stringify(params.currentNotes) : "(ninguno todavía, es el primer material)"}

NUEVO MATERIAL A INTEGRAR:
${params.newDocumentText}

DOCUMENTOS YA PROCESADOS ANTERIORMENTE (resumen):
${params.processedDocsSummary || "(ninguno)"}

INSTRUCCIONES:
1. Analiza el nuevo material y compáralo con los apuntes actuales.
2. INTEGRA la nueva información en los apuntes existentes, reorganizando si hace falta. No la añadas al final sin más.
3. Si el nuevo material amplía algo que ya estaba, ACTUALIZA esa sección; no la dupliques.
4. Si es un tema nuevo, créalo en el lugar correcto del orden lógico.
5. Los apuntes deben ser claros, con ejemplos prácticos, definiciones precisas, fórmulas en LaTeX cuando aplique, y sin repeticiones.

Responde con un único objeto JSON con esta forma exacta:
{
  "title": string,
  "lastUpdated": string (ISO date),
  "totalTopics": number,
  "topics": [
    {
      "id": string,
      "number": number,
      "title": string,
      "summary": string,
      "sections": [
        {
          "title": string,
          "content": string (markdown),
          "keyPoints": string[],
          "definitions": [{"term": string, "definition": string}],
          "formulas": string[] (LaTeX, sin $$),
          "examples": string[],
          "connections": string
        }
      ],
      "practiceQuestions": string[]
    }
  ],
  "glossary": [{"term": string, "definition": string}],
  "conceptMap": string,
  "newConcepts": [
    {"title": string, "definition": string, "keyPoints": string[], "examples": string[], "topicNumber": number}
  ]
}

"newConcepts" debe contener SOLO los conceptos clave que sean nuevos respecto a los apuntes actuales (para generar preguntas de estudio). Si no hay conceptos nuevos, usa un array vacío.`;

  const parsed = await callClaudeJson<NotesContent & { newConcepts?: NewConceptDraft[] }>(system, prompt, 16000);
  const { newConcepts = [], ...notes } = parsed;
  return { notes, newConcepts };
}

export async function generateOrUpdateExamInsights(params: {
  subjectName: string;
  currentInsights: ExamInsightsContent | null;
  newExamText: string;
}): Promise<ExamInsightsContent> {
  const system =
    "Eres un analista experto en exámenes universitarios. Detectas patrones recurrentes de temas y estilo de preguntas a partir de exámenes reales, para ayudar a un estudiante a prepararse mejor. Respondes ÚNICAMENTE con JSON válido.";

  const prompt = `ASIGNATURA: ${params.subjectName}

ANÁLISIS ACUMULADO DE EXÁMENES ANTERIORES (si existe):
${params.currentInsights ? JSON.stringify(params.currentInsights) : "(ninguno todavía, es el primer examen)"}

TEXTO DEL NUEVO EXAMEN A INTEGRAR:
${params.newExamText}

INSTRUCCIONES:
1. Identifica los temas/conceptos que se preguntan en este examen y con qué frecuencia relativa aparecen (acumulando con el análisis anterior si existe).
2. Extrae 1-3 preguntas de ejemplo representativas por tema recurrente (cita o parafrasea del examen).
3. Describe el ESTILO en que se formulan las preguntas en esta asignatura (tipo test, desarrollo, cálculo, casos prácticos, etc.) y cómo redactar preguntas similares.
4. Describe el perfil de dificultad general observado.
5. INTEGRA esta información con el análisis anterior, no lo dupliques ni lo pierdas: acumula frecuencias y añade temas nuevos.

Responde con un único objeto JSON con esta forma exacta:
{
  "totalExams": number,
  "recurringTopics": [{"topic": string, "frequency": number, "exampleQuestions": string[]}],
  "questionStyleNotes": string,
  "difficultyProfile": string,
  "lastUpdated": string (ISO date)
}`;

  return callClaudeJson<ExamInsightsContent>(system, prompt, 6000);
}

export interface GeneratedQuestion {
  question_text: string;
  question_type: QuestionType;
  options: { text: string; isCorrect: boolean }[] | null;
  correct_answer: string;
  explanation: string;
  difficulty: number;
}

export async function generateQuestionsForConcept(params: {
  conceptTitle: string;
  conceptDefinition: string;
  keyPoints: string[];
  examples: string[];
  count?: number;
  examStyleNotes?: string;
}): Promise<GeneratedQuestion[]> {
  const system =
    "Eres un profesor universitario que redacta preguntas de examen precisas y bien calibradas. Respondes ÚNICAMENTE con un array JSON válido.";

  const styleGuidance = params.examStyleNotes
    ? `\nESTILO REAL DE EXAMEN PARA ESTA ASIGNATURA (basado en exámenes anteriores subidos por el estudiante, imita este estilo y nivel de dificultad):\n${params.examStyleNotes}\n`
    : "";

  const prompt = `Genera ${params.count ?? 3} preguntas de estudio sobre este concepto, mezclando tipos (multiple_choice, true_false, short_answer):

CONCEPTO: ${params.conceptTitle}
DEFINICIÓN: ${params.conceptDefinition}
PUNTOS CLAVE: ${params.keyPoints.join("; ")}
EJEMPLOS: ${params.examples.join("; ")}
${styleGuidance}
Responde con un array JSON de objetos con esta forma exacta:
[
  {
    "question_text": string,
    "question_type": "multiple_choice" | "true_false" | "short_answer",
    "options": [{"text": string, "isCorrect": boolean}] | null (null si no es multiple_choice; para true_false usa options con "Verdadero"/"Falso"),
    "correct_answer": string,
    "explanation": string (por qué esa es la respuesta correcta),
    "difficulty": number (1 a 5)
  }
]`;

  return callClaudeJson<GeneratedQuestion[]>(system, prompt, 4000);
}

export async function generatePersonalizedExplanation(params: {
  conceptTitle: string;
  conceptDefinition: string;
  questionText: string;
  correctAnswer: string;
  userWrongAnswer: string;
}): Promise<{ explanation: string }> {
  const system =
    "Eres un tutor paciente. Explicas por qué una respuesta fue incorrecta y corriges el error de razonamiento específico del estudiante. Respondes ÚNICAMENTE con JSON.";

  const prompt = `CONCEPTO: ${params.conceptTitle} — ${params.conceptDefinition}
PREGUNTA: ${params.questionText}
RESPUESTA CORRECTA: ${params.correctAnswer}
RESPUESTA DEL ESTUDIANTE (incorrecta): ${params.userWrongAnswer}

Explica, en 3-5 frases, por qué la respuesta del estudiante es incorrecta y cuál es el error de razonamiento concreto que cometió, guiándolo hacia la respuesta correcta. Usa un tono cercano y motivador.

Responde con: {"explanation": string}`;

  return callClaudeJson<{ explanation: string }>(system, prompt, 1000);
}

export async function generateAlternativeExplanation(params: {
  conceptTitle: string;
  conceptDefinition: string;
}): Promise<{ explanation: string }> {
  const system =
    "Eres un tutor creativo. Cuando un estudiante no entiende una explicación, das otra completamente distinta: usa una analogía o un enfoque diferente. Respondes ÚNICAMENTE con JSON.";

  const prompt = `CONCEPTO: ${params.conceptTitle}
DEFINICIÓN ORIGINAL: ${params.conceptDefinition}

Da una explicación alternativa, con una analogía o enfoque distinto al de la definición original, en 3-6 frases.

Responde con: {"explanation": string}`;

  return callClaudeJson<{ explanation: string }>(system, prompt, 1000);
}

export interface ModerationVerdict {
  score: number;
  decision: "approve" | "review" | "reject";
  reason: string;
  flags: string[];
}

export async function moderateContent(params: {
  content: string;
  contentType: string;
  communityName: string;
}): Promise<ModerationVerdict> {
  const system =
    "Eres un moderador de contenido para una comunidad académica universitaria. Respondes ÚNICAMENTE con JSON.";

  const prompt = `Analiza este contenido publicado en una comunidad académica universitaria.

CONTENIDO: ${params.content}
TIPO: ${params.contentType}
CONTEXTO: Comunidad de la asignatura ${params.communityName} en una app de estudio universitario

Evalúa:
1. ¿Es el contenido relevante para el contexto académico?
2. ¿Es respetuoso y constructivo?
3. ¿Contiene spam, publicidad, contenido ofensivo o inapropiado?
4. ¿Es útil para la comunidad?

Responde con:
{
  "score": 0-1 (1 = perfectamente aceptable),
  "decision": "approve" | "review" | "reject",
  "reason": "explicación breve de la decisión",
  "flags": ["spam" | "offensive" | "off_topic" | "low_quality" | "none"]
}

Criterios:
- score >= 0.85 y sin flags problemáticos → "approve"
- score entre 0.5 y 0.85 → "review"
- score < 0.5 → "reject"`;

  return callClaudeJson<ModerationVerdict>(system, prompt, 500);
}

export interface PdfSectionDraft {
  title: string;
  content: string;
  definitions: { term: string; definition: string }[];
  formulas: string[];
  examples: { title: string; content: string }[];
  keyPoints: string[];
  reviewQuestions: string[];
}

export interface PdfGenerationDraft {
  title: string;
  subject: string;
  topics: string[];
  style: string;
  generatedAt: string;
  sourceCount: number;
  content: {
    tableOfContents: { title: string; page: number; subsections?: string[] }[];
    sections: PdfSectionDraft[];
    glossary: { term: string; definition: string }[];
    summary: string;
  };
}

const STYLE_LABELS: Record<string, string> = {
  resumen_ejecutivo: "Resumen ejecutivo — breve, solo puntos clave",
  apuntes_completos: "Apuntes completos — explicaciones detalladas con ejemplos",
  guia_estudio: "Guía de estudio — orientado a preparar examen, con preguntas de repaso",
  esquema: "Esquema — estructura jerárquica sin mucho texto",
};

export async function generateMixedSourcePdf(params: {
  title: string;
  subjectName: string;
  topics: string[];
  style: string;
  language: string;
  include: { definitions: boolean; formulas: boolean; examples: boolean; reviewQuestions: boolean; glossary: boolean; tableOfContents: boolean };
  sources: { label: string; content: string }[];
}): Promise<PdfGenerationDraft> {
  const system =
    "Eres un asistente académico experto en crear apuntes universitarios de alta calidad a partir de múltiples fuentes. Respondes ÚNICAMENTE con JSON válido.";

  const sourcesBlock = params.sources
    .map((s, i) => `--- FUENTE ${i + 1}: ${s.label} ---\n${s.content}`)
    .join("\n\n");

  const includeList = Object.entries(params.include)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(", ");

  const prompt = `ASIGNATURA: ${params.subjectName}
TEMA(S): ${params.topics.join(", ") || "(no especificado)"}
ESTILO SOLICITADO: ${STYLE_LABELS[params.style] ?? params.style}
IDIOMA: ${params.language}
INCLUIR: ${includeList || "contenido básico"}

CONTENIDO FUENTE (recopilado de múltiples orígenes — apuntes personales, apuntes de compañeros, discusiones en chat, publicaciones del foro, documentos subidos):

${sourcesBlock}

INSTRUCCIONES:
1. Analiza TODO el contenido proporcionado de todas las fuentes.
2. Identifica los conceptos clave, elimina duplicados y contradicciones.
3. Si hay información contradictoria entre fuentes, usa la que parezca más precisa y rigurosa académicamente.
4. Genera unos apuntes UNIFICADOS según el estilo solicitado.
5. Deben ser académicamente rigurosos, bien estructurados, con explicaciones claras, ejemplos prácticos cuando ayuden, fórmulas correctamente formateadas (LaTeX, sin $$), sin información redundante, y con el tono/profundidad del estilo elegido.
6. Sé conciso: máximo 5 secciones, cada una con un párrafo o dos de contenido. Prioriza claridad y densidad de información sobre extensión — nada de relleno.

Responde con un único objeto JSON con esta forma exacta:
{
  "title": "${params.title}",
  "subject": "${params.subjectName}",
  "topics": ${JSON.stringify(params.topics)},
  "style": "${params.style}",
  "generatedAt": "fecha ISO",
  "sourceCount": ${params.sources.length},
  "content": {
    "tableOfContents": [{"title": string, "page": number, "subsections": string[]}],
    "sections": [
      {
        "title": string,
        "content": string (markdown),
        "definitions": [{"term": string, "definition": string}],
        "formulas": string[],
        "examples": [{"title": string, "content": string}],
        "keyPoints": string[],
        "reviewQuestions": string[]
      }
    ],
    "glossary": [{"term": string, "definition": string}],
    "summary": "resumen final de 1 párrafo"
  }
}`;

  return callClaudeJson<PdfGenerationDraft>(system, prompt, 6000);
}

export async function evaluateStudentExplanation(params: {
  conceptDefinition: string;
  studentExplanation: string;
}): Promise<{ score: number; feedback: string; isCorrect: boolean }> {
  const system =
    "Eres un evaluador estricto pero justo de comprensión conceptual. Respondes ÚNICAMENTE con JSON.";

  const prompt = `El concepto correcto es: ${params.conceptDefinition}
El estudiante lo ha explicado así: "${params.studentExplanation}"

Evalúa si la explicación del estudiante demuestra comprensión real del concepto (no memorización literal, sino entendimiento).

Responde con: {"score": number (0-100), "feedback": string (breve y directo, qué está bien y qué falta o es incorrecto), "isCorrect": boolean (true si score > 70)}`;

  return callClaudeJson<{ score: number; feedback: string; isCorrect: boolean }>(system, prompt, 800);
}
