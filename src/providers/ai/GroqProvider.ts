import OpenAI from 'openai';
import { config, logger } from '../../config/index.js';
import { AiProviderError } from '../../utils/errors.js';
import type {
  AiChatRequest,
  AiChatResponse,
  AiStreamChunk,
  IAiProvider,
} from './types.js';

/**
 * Groq provider using the OpenAI-compatible API.
 * @see https://console.groq.com/docs/overview
 */
export class GroqProvider implements IAiProvider {
  readonly name = 'groq';
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.GROQ_API_KEY,
      baseURL: config.GROQ_BASE_URL,
    });
  }

  async chat(request: AiChatRequest): Promise<AiChatResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: request.model ?? config.GROQ_CHAT_MODEL,
        messages: request.messages,
        max_completion_tokens: request.maxTokens ?? config.GROQ_MAX_COMPLETION_TOKENS,
        temperature: request.temperature ?? 0.7,
        stream: false,
      });

      const choice = response.choices[0];
      return {
        content: choice?.message?.content ?? '',
        model: response.model,
        usage: {
          promptTokens: response.usage?.prompt_tokens,
          completionTokens: response.usage?.completion_tokens,
          totalTokens: response.usage?.total_tokens,
        },
      };
    } catch (err) {
      logger.error('Groq chat error', { err });
      throw new AiProviderError(
        err instanceof Error ? err.message : 'Groq chat request failed',
        err
      );
    }
  }

  async *chatStream(request: AiChatRequest): AsyncGenerator<AiStreamChunk> {
    try {
      const stream = await this.client.chat.completions.create({
        model: request.model ?? config.GROQ_CHAT_MODEL,
        messages: request.messages,
        max_completion_tokens: request.maxTokens ?? config.GROQ_MAX_COMPLETION_TOKENS,
        temperature: request.temperature ?? 0.7,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? '';
        const done = chunk.choices[0]?.finish_reason != null;
        if (delta) yield { content: delta, done: false };
        if (done) yield { content: '', done: true };
      }
    } catch (err) {
      logger.error('Groq stream error', { err });
      throw new AiProviderError(
        err instanceof Error ? err.message : 'Groq streaming request failed',
        err
      );
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const models = await this.client.models.list();
      return models.data.map((m) => m.id);
    } catch (err) {
      logger.error('Groq list models error', { err });
      throw new AiProviderError('Failed to list Groq models', err);
    }
  }
}
