/** فاصلة الآلاف — يستعمله نموذج/قائمة الإنجازات في لوحة التحكّم. */
export function formatThousands(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
