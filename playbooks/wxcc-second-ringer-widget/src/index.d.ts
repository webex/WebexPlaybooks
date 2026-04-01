// types/index.d.ts
declare global {
  interface Window {
    AGENTX_SERVICE: any; // Or a more specific type like 'object' or a custom type
  }
}

declare module "*.mp3" {
  const src: string;
  export default src;
}

// This is required to make the declaration file work
export {};