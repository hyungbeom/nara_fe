import type { NotebookLMProjectPrompt } from "@/types/notebooklm";

export function resolveNotebookPromptTitle(question: string, turn: number) {
  if (question.includes("제안요청서 목차대로")) {
    return "STEP1 결과";
  }
  if (question.includes("거버닝 메세지")) {
    return "STEP2 결과";
  }
  return `결과 #${turn}`;
}

export function isStepPrompt(question: string) {
  return question.includes("제안요청서 목차대로") || question.includes("거버닝 메세지");
}

export function buildMarkdownPreviewFromPrompt(prompt: NotebookLMProjectPrompt) {
  return {
    title: resolveNotebookPromptTitle(prompt.question, prompt.turn),
    content: prompt.answer,
  };
}
