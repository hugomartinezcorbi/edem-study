import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { PdfContent } from "@/lib/types";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10.5, fontFamily: "Helvetica", color: "#1b1b1f" },
  coverPage: { padding: 48, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%" },
  brand: { fontSize: 12, color: "#0e84a8", marginBottom: 40, letterSpacing: 2 },
  coverTitle: { fontSize: 26, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 12, color: "#16232a" },
  coverSubject: { fontSize: 14, color: "#71717a", marginBottom: 24, textAlign: "center" },
  coverMeta: { fontSize: 9, color: "#a1a1aa", textAlign: "center" },
  header: { fontSize: 8, color: "#a1a1aa", marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 },
  footer: { position: "absolute", bottom: 24, left: 48, right: 48, fontSize: 8, color: "#a1a1aa", display: "flex", flexDirection: "row", justifyContent: "space-between" },
  h1: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 12, color: "#16232a" },
  h2: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 6, color: "#16232a" },
  p: { marginBottom: 8, lineHeight: 1.5 },
  box: { backgroundColor: "#f2f5f7", borderRadius: 4, padding: 10, marginBottom: 8 },
  boxTerm: { fontFamily: "Helvetica-Bold", marginBottom: 2 },
  formula: { fontFamily: "Courier", backgroundColor: "#f2f5f7", padding: 8, marginBottom: 8, borderRadius: 4 },
  keyPoint: { flexDirection: "row", marginBottom: 3 },
  bullet: { width: 10, color: "#0e84a8" },
  tocRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6, fontSize: 10 },
});

function PdfDocument({ content }: { content: PdfContent["content"] & { title: string; subject: string } }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          <Text style={styles.brand}>MI EDEM</Text>
          <Text style={styles.coverTitle}>{content.title}</Text>
          <Text style={styles.coverSubject}>{content.subject}</Text>
          <Text style={styles.coverMeta}>{new Date().toLocaleDateString("es-ES")}</Text>
        </View>
      </Page>

      {content.tableOfContents.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.h1}>Índice</Text>
          {content.tableOfContents.map((entry, i) => (
            <View key={i} style={styles.tocRow}>
              <Text>{entry.title}</Text>
              <Text>{entry.page}</Text>
            </View>
          ))}
        </Page>
      )}

      {content.sections.map((section, i) => (
        <Page key={i} size="A4" style={styles.page} wrap>
          <Text style={styles.header} fixed>
            {content.subject}
          </Text>
          <Text style={styles.h1}>{section.title}</Text>
          <Text style={styles.p}>{section.content}</Text>

          {section.definitions.length > 0 && (
            <View>
              <Text style={styles.h2}>Definiciones</Text>
              {section.definitions.map((d, j) => (
                <View key={j} style={styles.box}>
                  <Text style={styles.boxTerm}>{d.term}</Text>
                  <Text>{d.definition}</Text>
                </View>
              ))}
            </View>
          )}

          {section.formulas.length > 0 && (
            <View>
              <Text style={styles.h2}>Fórmulas</Text>
              {section.formulas.map((f, j) => (
                <Text key={j} style={styles.formula}>
                  {f}
                </Text>
              ))}
            </View>
          )}

          {section.examples.length > 0 && (
            <View>
              <Text style={styles.h2}>Ejemplos</Text>
              {section.examples.map((ex, j) => (
                <View key={j} style={styles.box}>
                  <Text style={styles.boxTerm}>{ex.title}</Text>
                  <Text>{ex.content}</Text>
                </View>
              ))}
            </View>
          )}

          {section.keyPoints.length > 0 && (
            <View>
              <Text style={styles.h2}>Puntos clave</Text>
              {section.keyPoints.map((kp, j) => (
                <View key={j} style={styles.keyPoint}>
                  <Text style={styles.bullet}>•</Text>
                  <Text>{kp}</Text>
                </View>
              ))}
            </View>
          )}

          {section.reviewQuestions.length > 0 && (
            <View>
              <Text style={styles.h2}>Preguntas de repaso</Text>
              {section.reviewQuestions.map((q, j) => (
                <View key={j} style={styles.keyPoint}>
                  <Text style={styles.bullet}>{j + 1}.</Text>
                  <Text>{q}</Text>
                </View>
              ))}
            </View>
          )}

          <Text
            style={styles.footer}
            render={({ pageNumber, totalPages }) => `${content.subject} · ${pageNumber} / ${totalPages}`}
            fixed
          />
        </Page>
      ))}

      {(content.glossary.length > 0 || content.summary) && (
        <Page size="A4" style={styles.page}>
          {content.summary && (
            <View>
              <Text style={styles.h1}>Resumen</Text>
              <Text style={styles.p}>{content.summary}</Text>
            </View>
          )}
          {content.glossary.length > 0 && (
            <View>
              <Text style={styles.h1}>Glosario</Text>
              {content.glossary.map((g, i) => (
                <View key={i} style={styles.box}>
                  <Text style={styles.boxTerm}>{g.term}</Text>
                  <Text>{g.definition}</Text>
                </View>
              ))}
            </View>
          )}
        </Page>
      )}
    </Document>
  );
}

export async function renderPdf(draft: PdfContent): Promise<Buffer> {
  const doc = (
    <PdfDocument content={{ ...draft.content, title: draft.title, subject: draft.subject }} />
  );
  return renderToBuffer(doc);
}
