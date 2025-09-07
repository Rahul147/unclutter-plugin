// Minimal shims to satisfy TypeScript in environments without installed type packages.

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare module "react" {
  export type FC<P = {}> = (props: P & { children?: any }) => any;
  export const useState: any;
  export const useEffect: any;
  export const useMemo: any;
  export const useRef: any;
  export type ReactNode = any;
  const React: any;
  export default React;
}

declare module "react/jsx-runtime" {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare module "react-dom/client" {
  export const createRoot: any;
}

declare module "idb" {
  export type DBSchema = any;
  export type IDBPDatabase<T = any> = any;
  export type IDBPTransaction<T = any, U = any, V = any> = any;
  export function openDB<T = any>(name: string, version?: number, opts?: any): Promise<IDBPDatabase<T>>;
}

declare const chrome: any;

