export type BaileysPollChoice = {
  id: string;
  label: string;
};

export function buildPollValuesFromChoices(
  choices: readonly BaileysPollChoice[],
): string[] {
  return choices.map((choice) => choice.label);
}

/** Map a user's poll pick (label text) back to the enquiry option id. */
export function pollSelectionToOptionId(
  text: string,
  choices: readonly BaileysPollChoice[],
): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const byLabel = choices.find(
    (choice) => choice.label.toLowerCase() === trimmed.toLowerCase(),
  );
  if (byLabel) {
    return byLabel.id;
  }
  const byId = choices.find((choice) => choice.id === trimmed);
  return byId?.id ?? null;
}
