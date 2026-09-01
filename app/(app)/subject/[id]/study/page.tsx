import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { StudySession } from "@/components/study/StudySession";

export default async function SubjectStudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: subject } = await supabase.from("subjects").select("*").eq("id", id).single();
  if (!subject) notFound();

  return <StudySession mode="subject" subjectId={id} subjectName={subject.name} color={subject.color} />;
}
