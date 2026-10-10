/** Para buscar sin distinguir mayúsculas ni tildes (CA-6.11): "milanesa" encuentra "Milanésa". */
export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
