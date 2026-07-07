import type { NotebookLMProjectPrompt, NotebookLMStep, NotebookLMStepRunStatus } from "@/types/notebooklm";

function normalizeStepId(value?: string | null) {
  return value?.trim().toUpperCase() ?? "";
}

function isSameStepId(left?: string | null, right?: string | null) {
  return normalizeStepId(left) === normalizeStepId(right);
}

export function deriveCompletedStepIds(
  steps: NotebookLMStep[],
  prompts: NotebookLMProjectPrompt[]
): string[] {
  const completed = new Set<string>();

  for (const step of steps) {
    const promptText = step.prompt?.trim();
    if (!promptText) {
      continue;
    }

    const matched = prompts.some((item) => {
      const question = item.question?.trim() ?? "";
      const answer = item.answer?.trim() ?? "";
      if (!question || !answer || item.status === "failed") {
        return false;
      }
      return question === promptText || question.includes(promptText.slice(0, Math.min(48, promptText.length)));
    });

    if (matched) {
      completed.add(normalizeStepId(step.id));
    }
  }

  return [...completed];
}

export function resolveNotebookPromptTitle(question: string, turn: number) {
  if (question.includes("제안요청서 목차대로")) {
    return "STEP1 결과";
  }
  if (question.includes("거버닝 메세지")) {
    return "STEP2 결과";
  }
  if (question.includes("Issue Point")) {
    return "STEP3 결과";
  }
  if (question.includes("심사위원")) {
    return "STEP4 결과";
  }
  return `결과 #${turn}`;
}

export function resolveNotebookPromptDownloadFilename(question: string, turn: number) {
  const suffix = turn > 1 ? `-${turn}` : "";

  if (question.includes("제안요청서 목차대로")) {
    return `proposal${suffix}.md`;
  }
  if (question.includes("거버닝 메세지")) {
    return `proposal-step2${suffix}.md`;
  }
  if (question.includes("Issue Point")) {
    return `proposal-step3${suffix}.md`;
  }
  if (question.includes("심사위원")) {
    return `proposal-step4${suffix}.md`;
  }

  return `notebooklm-result-${turn}.md`;
}

export function downloadNotebookPromptMarkdown(prompt: NotebookLMProjectPrompt) {
  const content = prompt.answer?.trim() ?? "";
  if (!content) {
    return;
  }

  const filename = resolveNotebookPromptDownloadFilename(prompt.question, prompt.turn);
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
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

export function buildPromptsWithActiveStepRun(
  prompts: NotebookLMProjectPrompt[],
  stepStatus: NotebookLMStepRunStatus | null | undefined,
  steps: NotebookLMStep[]
): NotebookLMProjectPrompt[] {
  if (!stepStatus?.step || stepStatus.status !== "in_progress") {
    return prompts;
  }

  const step = steps.find((item) => isSameStepId(item.id, stepStatus.step));
  const question = step?.prompt?.trim() ?? "";
  if (!question) {
    return prompts;
  }

  const alreadyRunning = prompts.some(
    (item) => item.status === "running" && item.question.trim() === question
  );
  if (alreadyRunning) {
    return prompts;
  }

  return [
    ...prompts,
    {
      turn: prompts.length + 1,
      question,
      answer: "",
      status: "running",
      message: stepStatus.message,
    },
  ];
}
