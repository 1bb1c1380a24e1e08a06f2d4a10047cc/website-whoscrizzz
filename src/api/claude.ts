import Anthropic from '@anthropic-sdk/sdk';
import { ClaudeMessage, ClaudeRequest } from '@/types';

/**
 * Claude API Integration
 * Provides methods to interact with Anthropic's Claude API for AI-powered features
 */
export class ClaudeAPI {
  private client: Anthropic;
  private model: string;

  constructor(config: { apiKey: string; model?: string }) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model || 'claude-opus-4-6';
  }

  /**
   * Send a message to Claude
   */
  async sendMessage(request: ClaudeRequest): Promise<ClaudeMessage> {
    try {
      const messages = request.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      const response = await this.client.messages.create({
        model: request.model || this.model,
        max_tokens: request.maxTokens || 2048,
        system: request.systemPrompt,
        messages,
      });

      const content = response.content[0];
      const textContent = content.type === 'text' ? content.text : '';

      return {
        id: response.id,
        type: response.type,
        role: 'assistant',
        content: textContent,
        model: response.model,
        createdAt: new Date(),
        tokensUsed: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to send message to Claude: ${error.message}`);
    }
  }

  /**
   * Generate text completion
   */
  async generateCompletion(
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      model?: string;
    }
  ): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: options?.model || this.model,
        max_tokens: options?.maxTokens || 2048,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      return content.type === 'text' ? content.text : '';
    } catch (error: any) {
      throw new Error(`Failed to generate completion: ${error.message}`);
    }
  }

  /**
   * Analyze text content
   */
  async analyzeText(
    text: string,
    analysisType: 'sentiment' | 'summary' | 'keywords' | 'entities'
  ): Promise<any> {
    const prompts: Record<string, string> = {
      sentiment: `Analyze the sentiment of the following text and provide a structured response with sentiment (positive/negative/neutral) and confidence score:\n\n${text}`,
      summary: `Provide a concise summary of the following text:\n\n${text}`,
      keywords: `Extract the top 5 keywords from the following text:\n\n${text}`,
      entities: `Extract named entities (people, places, organizations) from the following text:\n\n${text}`,
    };

    return this.generateCompletion(prompts[analysisType]);
  }

  /**
   * Generate code
   */
  async generateCode(
    description: string,
    options?: { language?: string; style?: string }
  ): Promise<string> {
    const prompt = `Generate ${options?.language || 'TypeScript'} code for the following requirement:\n\n${description}\n\nStyle: ${options?.style || 'clean and modern'}`;

    return this.generateCompletion(prompt, { maxTokens: 4096 });
  }

  /**
   * Review code
   */
  async reviewCode(
    code: string,
    options?: { language?: string; focusAreas?: string[] }
  ): Promise<string> {
    const focusAreas = options?.focusAreas
      ? `Focus on: ${options.focusAreas.join(', ')}`
      : '';

    const prompt = `Review the following ${options?.language || 'TypeScript'} code and provide constructive feedback:\n\n${code}\n\n${focusAreas}`;

    return this.generateCompletion(prompt);
  }

  /**
   * Translate text
   */
  async translateText(text: string, targetLanguage: string): Promise<string> {
    const prompt = `Translate the following text to ${targetLanguage}:\n\n${text}`;
    return this.generateCompletion(prompt);
  }

  /**
   * Extract structured data from text
   */
  async extractStructuredData(
    text: string,
    schema: Record<string, string>
  ): Promise<any> {
    const schemaDescription = Object.entries(schema)
      .map(([key, type]) => `- ${key} (${type})`)
      .join('\n');

    const prompt = `Extract the following information from the text and return as JSON:\n\n${schemaDescription}\n\nText:\n${text}`;

    const response = await this.generateCompletion(prompt);

    try {
      // Try to parse JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: response };
    } catch {
      return { raw: response };
    }
  }

  /**
   * Brainstorm ideas
   */
  async brainstormIdeas(
    topic: string,
    count: number = 5
  ): Promise<string[]> {
    const prompt = `Brainstorm ${count} creative ideas about: ${topic}. Return as a numbered list.`;

    const response = await this.generateCompletion(prompt);

    // Parse numbered list from response
    const ideas = response
      .split('\n')
      .filter((line) => /^\d+\.|^-/.test(line.trim()))
      .map((line) => line.replace(/^\d+\.|^-/, '').trim())
      .filter((idea) => idea.length > 0);

    return ideas;
  }

  /**
   * Generate documentation
   */
  async generateDocumentation(
    code: string,
    options?: { style?: 'jsdoc' | 'markdown' | 'plain' }
  ): Promise<string> {
    const style = options?.style || 'markdown';
    const prompt = `Generate ${style} documentation for the following code:\n\n${code}`;

    return this.generateCompletion(prompt);
  }

  /**
   * Answer a question with context
   */
  async answerQuestion(
    question: string,
    context?: string
  ): Promise<string> {
    const prompt = context
      ? `Based on the following context, answer the question:\n\nContext:\n${context}\n\nQuestion:\n${question}`
      : `Answer the following question:\n\n${question}`;

    return this.generateCompletion(prompt);
  }

  /**
   * Batch process multiple requests
   */
  async batchProcess(
    requests: Array<{ prompt: string; options?: any }>
  ): Promise<string[]> {
    return Promise.all(
      requests.map((req) =>
        this.generateCompletion(req.prompt, req.options)
      )
    );
  }
}

/**
 * Create Claude API instance
 */
export function createClaudeAPI(config: {
  apiKey: string;
  model?: string;
}): ClaudeAPI {
  return new ClaudeAPI(config);
}
