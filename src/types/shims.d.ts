// Minimal shims to satisfy TypeScript in environments without installed type packages.
// Note: These are lightweight and intentionally permissive.

declare namespace JSX {
  interface IntrinsicAttributes {
    key?: any;
  }
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare module "react" {
  export type ReactNode = any;
  export type FC<P = {}> = (props: P & { children?: ReactNode }) => any;
  export function useState<T = any>(
    initial: T
  ): [T, (next: T | ((prev: T) => T)) => void];
  export function useEffect(
    effect: () => void | (() => void),
    deps?: any[]
  ): void;
  export function useMemo<T = any>(factory: () => T, deps: any[]): T;
  export function useRef<T = any>(initial?: T | null): { current: T | null };
  const React: any;
  export default React;
}

declare module "react/jsx-runtime" {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

/**
 * @deprecated Retained for compatibility; real apps should use proper ReactDOM types.
 */
declare module "react-dom/client" {
  export const createRoot: any;
}

/**
 * @deprecated Retained for compatibility; replaced by inline type-only imports where possible.
 */
declare module "idb" {
  export type DBSchema = any;
  export type IDBPDatabase<T = any> = any;
  export type IDBPTransaction<T = any, U = any, V = any> = any;
  export function openDB<T = any>(
    name: string,
    version?: number,
    opts?: any
  ): Promise<IDBPDatabase<T>>;
}

declare const chrome: any;
