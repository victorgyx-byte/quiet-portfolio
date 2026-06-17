export type SlidesExportReflection = {
  reflectionId: string;
  title: string;
  body: string;
  competencies: string[];
  reflectionType: "general" | "lesson" | "cca";
  lessonTitle?: string;
  visibility: "private" | "shared_with_teacher";
  createdAt: string;
  images: Array<{
    url: string;
    path: string;
    contentType: string;
    size: number;
  }>;
};

export type SlidesExportPayload = {
  version: "slides-export-v1";
  generatedAt: string;
  student: {
    uid: string;
    name: string;
    email: string;
  };
  portfolio: {
    title: string;
    growthStatement: string;
    purpose?: string;
    focusTags?: string[];
    connectionText?: string;
    ipsativeText?: string;
    nextActionText?: string;
  };
  reflections: SlidesExportReflection[];
};

export type SlidesReflectionMapEntry = {
  slideId: string;
  titleShapeId: string;
  bodyShapeId: string;
};

export type SlidesDeckIntegration = {
  deckId: string;
  deckUrl: string;
  reflectionSlideMap: Record<string, SlidesReflectionMapEntry>;
  updatedAt?: string;
};
