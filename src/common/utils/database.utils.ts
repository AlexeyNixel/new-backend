export function createMeta(page: number, pageSize: number, total: number) {
  return {
    page: page,
    pageSize: pageSize,
    total: total,
  };
}
