import { codeToHtml } from "shiki";

export async function highlightCode(code: string, language: string) {
  return codeToHtml(code, {
    lang: language,
    theme: "github-dark",
  });
}
