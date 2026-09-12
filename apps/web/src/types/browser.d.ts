import type Lenis from "lenis";
declare global {
  interface Window {
    __lenis?: Lenis;
  }
  interface Performance {
    navigation?: { type: number };
  }
}
export {};
