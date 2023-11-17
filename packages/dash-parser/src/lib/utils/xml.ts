export const getContent = (element: Element): string | null => {
  const str = element.textContent || '';
  const trimmed = str.trim();

  return trimmed.length ? trimmed : null;
};
