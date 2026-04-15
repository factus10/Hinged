// Let TypeScript know about vite's `?raw` imports for .sql files.
declare module '*.sql?raw' {
  const contents: string;
  export default contents;
}
