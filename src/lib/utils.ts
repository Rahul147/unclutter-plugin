// Utility to compose className strings from primitives, arrays, or dictionaries.
type ClassPrimitive = string | number | boolean | null | undefined;
type ClassDictionary = Record<string, boolean | undefined | null>;
type ClassArray = Array<ClassPrimitive | ClassDictionary | ClassArray>;
export type ClassValue = ClassPrimitive | ClassDictionary | ClassArray;

function toClassName(value: ClassValue): string {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (Array.isArray(value))
    return value.map(toClassName).filter(Boolean).join(" ");
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => key)
      .join(" ");
  }
  return "";
}

export function cn(...inputs: ClassValue[]): string {
  return inputs.map(toClassName).filter(Boolean).join(" ");
}
