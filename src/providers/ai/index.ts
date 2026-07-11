import { GroqProvider } from './GroqProvider.js';
import type { IAiProvider } from './types.js';

let providerInstance: IAiProvider | null = null;

/** Factory — swap implementation here when adding OpenAI, Anthropic, etc. */
export function getAiProvider(): IAiProvider {
  if (!providerInstance) {
    providerInstance = new GroqProvider();
  }
  return providerInstance;
}

export function setAiProvider(provider: IAiProvider) {
  providerInstance = provider;
}

export * from './types.js';
export { GroqProvider } from './GroqProvider.js';
