export function createInclude(fields: string) {
  if (!fields) {
    return;
  }

  const fieldsArr = fields.split(', ');
  const res = {};

  fieldsArr.forEach((field) => {
    res[field] = true;
  });

  return res;
}
