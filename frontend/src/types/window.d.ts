declare global {
  interface Window {
    __app_ready?: boolean;
    __errors?: unknown;
  }
}

export {};
