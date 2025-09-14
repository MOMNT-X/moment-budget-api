export function generateReference(): string {
  return `TX-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}