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
    "Eres un asistente académico experto que redacta apuntes para estudiantes de EDEM, una universidad exigente. Generas y mantienes apuntes universitarios completos, unificados y bien organizados, al nivel de rigor real de la asignatura: mismo vocabulario técnico, mismas fórmulas y mismo nivel de profundidad que el material fuente, sin simplificar ni rebajar el nivel para que 'se entienda más fácil'. No sustituyas términos técnicos por explicaciones coloquiales; defínelos con precisión y amplíalos si hace falta, pero mantén el registro académico. Respondes ÚNICAMENTE con JSON válido, sin texto adicional fuera del JSON.";

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
6. NO simplifiques el contenido ni bajes el nivel técnico del material original: conserva la terminología, notación y profundidad propias de una asignatura universitaria exigente. Un apunte "claro" no es un apunte "fácil"; es uno preciso y bien explicado al nivel correspondiente.

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
    "Eres un profesor universitario de EDEM que redacta preguntas de examen precisas y bien calibradas, al nivel real de exigencia de una universidad de alto nivel. No simplifiques el enunciado ni el vocabulario técnico para hacerlo más fácil: usa la terminología propia de la asignatura tal como aparece en los apuntes. Respondes ÚNICAMENTE con un array JSON válido.";

  const styleGuidance = params.examStyleNotes
    ? `\nESTILO REAL DE EXAMEN PARA ESTA ASIGNATURA (basado en exámenes anteriores subidos por el estudiante, imita este estilo y nivel de dificultad exactos, sin rebajarlo):\n${params.examStyleNotes}\n`
    : "";

  const prompt = `Genera ${params.count ?? 3} preguntas de estudio sobre este concepto, mezclando tipos (multiple_choice, true_false, short_answer). Mantén el nivel técnico universitario del concepto: no lo simplifiques ni uses un vocabulario más sencillo del que aparece en la definición y los puntos clave.

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
    "Eres un tutor universitario paciente pero riguroso, de una universidad exigente (EDEM). Explicas por qué una respuesta fue incorrecta y corriges el error de razonamiento específico del estudiante, sin rebajar el nivel técnico de la asignatura. Respondes ÚNICAMENTE con JSON.";

  const prompt = `CONCEPTO: ${params.conceptTitle} — ${params.conceptDefinition}
PREGUNTA: ${params.questionText}
RESPUESTA CORRECTA: ${params.correctAnswer}
RESPUESTA DEL ESTUDIANTE (incorrecta): ${params.userWrongAnswer}

Explica, en 3-5 frases, por qué la respuesta del estudiante es incorrecta y cuál es el error de razonamiento concreto que cometió, guiándolo hacia la respuesta correcta. Usa un tono cercano y motivador, pero mantén la terminología técnica y el nivel de rigor propios de la asignatura: no sustituyas los términos precisos por explicaciones simplificadas o "para todos los públicos".

Responde con: {"explanation": string}`;

  return callClaudeJson<{ explanation: string }>(system, prompt, 1000);
}

export async function generateAlternativeExplanation(params: {
  conceptTitle: string;
  conceptDefinition: string;
}): Promise<{ explanation: string }> {
  const system =
    "Eres un tutor universitario creativo pero riguroso. Cuando un estudiante no entiende una explicación, das otra completamente distinta: usa una analogía o un enfoque diferente, sin perder precisión técnica. Respondes ÚNICAMENTE con JSON.";

  const prompt = `CONCEPTO: ${params.conceptTitle}
DEFINICIÓN ORIGINAL: ${params.conceptDefinition}

Da una explicación alternativa, con una analogía o enfoque distinto al de la definición original, en 3-6 frases. La analogía puede ser intuitiva, pero debe conducir de vuelta a los términos técnicos correctos del concepto: no la dejes en una simplificación que pierda el rigor de la asignatura.

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

export async function evaluateStudentExplanation(params: {
  conceptDefinition: string;
  studentExplanation: string;
}): Promise<{ score: number; feedback: string; isCorrect: boolean }> {
  const system =
    "Eres un evaluador estricto pero justo de comprensión conceptual. Respondes ÚNICAMENTE con JSON.";

  const prompt = `El concepto correcto es: ${params.conceptDefinition}
El estudiante lo ha explicado así: "${params.studentExplanation}"

Evalúa si la explicación del estudiante demuestra comprensión real del concepto (no memorización literal, sino entendimiento), y si usa correctamente la terminología técnica de la asignatura. Una explicación vaga o excesivamente simplificada que evite los términos técnicos correctos no debe puntuarse como comprensión completa.

Responde con: {"score": number (0-100), "feedback": string (breve y directo, qué está bien y qué falta o es incorrecto), "isCorrect": boolean (true si score > 70)}`;

  return callClaudeJson<{ score: number; feedback: string; isCorrect: boolean }>(system, prompt, 800);
}
