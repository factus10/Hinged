/// <reference types="vite/client" />

import type { HingedApi } from '../preload';

declare global {
  interface Window {
    hinged: HingedApi;
  }
}

export {};
