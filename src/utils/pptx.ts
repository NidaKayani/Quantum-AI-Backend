import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** pptxgenjs CJS entry — reliable under Node ESM + TypeScript. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PptxGenJS = require('pptxgenjs') as typeof import('pptxgenjs').default;

export function createPptx() {
  return new PptxGenJS();
}

export { PptxGenJS };
