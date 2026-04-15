import { SwarmDecision, MarketData } from '../types';

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-super-120b-a12b:free';

interface AgentResponse {
  signal?: 'BUY' | 'SELL' | 'HOLD';
  action?: 'BUY' | 'SELL' | 'HOLD';
  confidence?: number;
  reason?: string;
  reasoning?: string;
  sentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength?: number;
  positionSize?: number;
  leverage?: number;
  stopLossPct?: number;
}

type ModelProvider = 'openrouter' | 'glm' | 'dashscope' | 'none';

const getProvider = (): ModelProvider => {
  if (process.env.OPENROUTER_API_KEY) return 'openrouter';
  if (process.env.GLM_API_KEY) return 'glm';
  if (process.env.DASHSCOPE_API_KEY) return 'dashscope';
  return 'none';
};

const MODEL_MAPPING: Record<Exclude<ModelProvider, 'none'>, Record<string, string>> = {
  openrouter: {
    deep: 'openrouter/free',
    quick: 'openrouter/free',
    'qwen-deep': 'qwen/qwen2.5-72b-instruct',
    'qwen-quick': 'qwen/qwen2.5-7b-instruct',
    'glm-deep': 'deepseek/deepseek-chat',
    'glm-quick': 'deepseek/deepseek-chat',
  },
  glm: {
    deep: 'glm-4-flash',
    quick: 'glm-4-flash',
  },
  dashscope: {
    deep: 'qwen-max',
    quick: 'qwen-turbo',
  },
};

export class QwenAgent {
  private apiKey: string;
  private modelType: 'deep' | 'quick';
  private systemPrompt: string;
  private provider: ModelProvider;
  private baseModel: string;
  private agentName: string;

  constructor(role: string, prompt: string, model: string = 'qwen-max') {
    this.agentName = role;
    this.provider = getProvider();
    this.apiKey =
      process.env.OPENROUTER_API_KEY ||
      process.env.GLM_API_KEY ||
      process.env.DASHSCOPE_API_KEY ||
      '';

    if (model === 'qwen-max' || model === 'glm-4-plus' || model === 'deep') {
      this.modelType = 'deep';
    } else {
      this.modelType = 'quick';
    }

    if (this.provider === 'openrouter') {
      if (model.includes('glm')) {
        this.baseModel =
          MODEL_MAPPING.openrouter[`glm-${this.modelType}`] || MODEL_MAPPING.openrouter['glm-deep'];
      } else if (model.includes('qwen')) {
        this.baseModel =
          MODEL_MAPPING.openrouter[`qwen-${this.modelType}`] ||
          MODEL_MAPPING.openrouter['qwen-deep'];
      } else {
        this.baseModel = MODEL_MAPPING.openrouter[this.modelType];
      }
    } else if (this.provider === 'glm') {
      this.baseModel = MODEL_MAPPING.glm[this.modelType];
    } else if (this.provider === 'dashscope') {
      this.baseModel = MODEL_MAPPING.dashscope[this.modelType];
    } else {
      this.baseModel = 'nvidia/nemotron-3-nano-30b-a3b:free';
    }

    this.systemPrompt = prompt;
  }

  async analyze(context: string): Promise<AgentResponse> {
    if (!this.apiKey) {
      throw new Error(`[${this.agentName}] OPENROUTER_API_KEY is not configured`);
    }

    try {
      let response: Response;

      if (this.provider === 'openrouter') {
        response = await this.callOpenRouter(context);
      } else if (this.provider === 'glm') {
        response = await this.callGLM(context);
      } else if (this.provider === 'dashscope') {
        response = await this.callDashScope(context);
      } else {
        return this.getMockResponse();
      }

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as Record<string, any>;
        const errorMsg = errorData.error?.message || errorData.message || response.statusText;
        console.warn('[Agent] API error:', errorMsg);
        return this.getMockResponse();
      }

      const data = (await response.json()) as any;
      let content: string | undefined;

      if (this.provider === 'openrouter' || this.provider === 'glm') {
        content = data.choices?.[0]?.message?.content;
      } else {
        content = data.output?.choices?.[0]?.message?.content;
      }

      if (content) {
        try {
          return JSON.parse(content) as AgentResponse;
        } catch {
          console.warn('[Agent] Failed to parse response:', content.substring(0, 200));
          return this.getMockResponse();
        }
      }

      return this.getMockResponse();
    } catch (error) {
      console.warn('[Agent] Error analyzing, using mock:', error);
      return this.getMockResponse();
    }
  }

  private async callOpenRouter(context: string): Promise<Response> {
    return fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://pacfi.ai',
        'X-Title': 'Pacfi AI',
      },
      body: JSON.stringify({
        model: this.baseModel,
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: context },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });
  }

  private async callGLM(context: string): Promise<Response> {
    return fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.baseModel,
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: context },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });
  }

  private async callDashScope(context: string): Promise<Response> {
    return fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.baseModel,
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: context },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });
  }

  private getMockResponse(): AgentResponse {
    const signals: ('BUY' | 'SELL' | 'HOLD')[] = ['BUY', 'SELL', 'HOLD'];
    const signal = signals[Math.floor(Math.random() * 3)];
    const confidence = Math.floor(Math.random() * 30) + 50;

    return {
      signal,
      confidence,
      reason: 'Mock analysis (API unavailable)',
      reasoning: 'Using fallback analysis due to API unavailability',
    };
  }
}

export class SwarmCoordinator {
  private marketAnalyst: QwenAgent;
  private sentimentAgent: QwenAgent;
  private riskManager: QwenAgent;
  private coordinator: QwenAgent;

  constructor() {
    this.marketAnalyst = new QwenAgent(
      'Market Analyst',
      `You are a professional crypto market analyst. Analyze the provided OHLCV data and technical indicators.
       Return a JSON response with:
       - signal: "BUY", "SELL", or "HOLD"
       - confidence: 0-100 (confidence level)
       - reason: brief explanation of your analysis
       Only return valid JSON, no other text.`,
      'deep'
    );

    this.sentimentAgent = new QwenAgent(
      'Sentiment Agent',
      `You are a market sentiment analyzer. Analyze funding rates and market conditions.
       Return a JSON response with:
       - sentiment: "BULLISH", "BEARISH", or "NEUTRAL"
       - strength: 0-100 (sentiment strength)
       - reason: brief explanation
       Only return valid JSON, no other text.`,
      'quick'
    );

    this.riskManager = new QwenAgent(
      'Risk Manager',
      `You are a risk management expert. Calculate optimal position sizing and risk parameters.
       Given market conditions and portfolio balance, return JSON with:
       - positionSize: recommended position size in USD
       - leverage: recommended leverage (1-50x)
       - stopLossPct: stop loss percentage (1-10%)
       Only return valid JSON, no other text.`,
      'quick'
    );

    this.coordinator = new QwenAgent(
      'Coordinator',
      `You are the trading coordinator. Aggregate inputs from all agents and make final trading decision.
       Return a JSON response with:
       - action: "BUY", "SELL", or "HOLD"
       - confidence: 0-100
       - reasoning: explanation of final decision
       Only return valid JSON, no other text.`,
      'deep'
    );
  }

  async executeCycle(marketData: MarketData, portfolioBalance: number): Promise<SwarmDecision> {
    try {
      const marketAnalysis = await this.marketAnalyst.analyze(JSON.stringify(marketData));
      const sentimentAnalysis = await this.sentimentAgent.analyze(
        JSON.stringify({ fundingRate: marketData.fundingRate, volume: marketData.volume24h })
      );
      const riskParams = await this.riskManager.analyze(
        JSON.stringify({ marketAnalysis, sentiment: sentimentAnalysis, portfolioBalance })
      );
      const finalDecision = await this.coordinator.analyze(
        JSON.stringify({ market: marketAnalysis, sentiment: sentimentAnalysis, risk: riskParams })
      );

      return {
        action: finalDecision.action || finalDecision.signal || 'HOLD',
        confidence: finalDecision.confidence || 0,
        reasoning: finalDecision.reasoning || finalDecision.reason || 'No reasoning provided',
        positionSize: riskParams.positionSize,
        leverage: riskParams.leverage,
        stopLossPct: riskParams.stopLossPct,
      };
    } catch (error) {
      console.error('[SwarmCoordinator] Error in detailed cycle:', error);
      throw error instanceof Error ? error : new Error('Error in swarm analysis cycle');
    }
  }

  private resolveDecision(resp: AgentResponse): 'BUY' | 'SELL' | 'HOLD' {
    const raw = (resp.action || resp.signal || 'HOLD').toString().toUpperCase();
    if (raw === 'BUY') return 'BUY';
    if (raw === 'SELL') return 'SELL';
    return 'HOLD';
  }
}
