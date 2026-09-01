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
