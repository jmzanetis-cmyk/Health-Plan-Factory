function genUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
function getRandomValues(array: any) {
  for (let i = 0; i < array.length; i++) array[i] = Math.floor(Math.random() * 256);
  return array;
}
const targets = [
  typeof global !== 'undefined' ? global : null,
  typeof globalThis !== 'undefined' ? globalThis : null,
].filter(Boolean) as any[];
for (const g of targets) {
  if (!g.crypto) g.crypto = {};
  if (!g.crypto.getRandomValues) g.crypto.getRandomValues = getRandomValues;
  if (!g.crypto.randomUUID) g.crypto.randomUUID = genUUID;
}
