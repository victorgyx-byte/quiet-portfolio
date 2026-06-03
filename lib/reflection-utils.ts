import type { Reflection, ReflectionType } from "@/types/reflection";

export const REFLECTION_TYPE_OPTIONS: Array<{ id: ReflectionType; label: string }> = [
  { id: "general", label: "General" },
  { id: "lesson", label: "Lesson" },
  { id: "cca", label: "CCA" }
];

export const COMPETENCY_OPTIONS = [
  "Critical Thinking",
  "Adaptive Thinking",
  "Inventive Thinking",
  "Collaboration Skills",
  "Communication Skills",
  "Information Skills",
  "Civic Literacy",
  "Global Literacy",
  "Cross-Cultural Literacy"
] as const;

export function getReflectionType(reflection: Reflection): ReflectionType {
  if (reflection.reflectionType) return reflection.reflectionType;
  if ((reflection.category ?? "").toLowerCase() === "cca") return "cca";
  return "general";
}

export function getReflectionTypeLabel(type: ReflectionType) {
  return REFLECTION_TYPE_OPTIONS.find(option => option.id === type)?.label ?? "General";
}

export function getReflectionCompetencies(reflection: Reflection) {
  if (Array.isArray(reflection.competencies) && reflection.competencies.length > 0) {
    return reflection.competencies;
  }
  return reflection.competency ? [reflection.competency] : [];
}

export function getReflectionCompetencyLabel(reflection: Reflection) {
  const competencies = getReflectionCompetencies(reflection);
  return competencies.length > 0 ? competencies.join(", ") : "No 21CC tag";
}

export function getReflectionLessonTitle(reflection: Reflection) {
  return reflection.lessonTitle?.trim() ?? "";
}
