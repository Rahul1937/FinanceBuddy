export async function callAI(prompt: string, input: unknown) {
  return {
    prompt,
    input,
    output: null,
  };
}
