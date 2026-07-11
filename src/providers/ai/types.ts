export type AiRole = 'system' | 'user' | 'assistant';

export interface AiMessage {
  role: AiRole;
  content: string;
}

export interface AiChatRequest {
  messages: AiMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface AiChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface AiStreamChunk {
  content: string;
  done: boolean;
}

export interface IAiProvider {
  readonly name: string;
  chat(request: AiChatRequest): Promise<AiChatResponse>;
  chatStream(request: AiChatRequest): AsyncGenerator<AiStreamChunk>;
  listModels(): Promise<string[]>;
}
