import { SwarmDecision, MarketData } from '../types';

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

// Valid free model IDs on OpenRouter (tested & working)
// Deep: larger model for market analysis & final decision
// Quick: smaller model for sentiment & risk (faster, cheaper)
const OPENROUTER_DEEP_MODEL =
  process.env.OPENROUTER_MODEL || 'google/gemma-3-27b-it:free';
const OPENROUTER_QUICK_MODEL =
  process.env.OPENROUTER_QUICK_MODEL || 'google/gemma-3-12b-it:free';

const MODEL_MAPPING: Record<Exclude<ModelProvider, 'none'>, { deep: string; quick: string }> = {
  openrouter: {
    deep: OPENROUTER_DEEP_MODEL,
    quick: OPENROUTER_QUICK_MODEL,
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

/**
 * Strip markdown code fences from model output before JSON.parse.
 * Models often reply with ```json\n{...}\n``` even when told not to.
 */
function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) return fenced[1].trim();
  // Try to find first { ... } block
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1);
  }
  return raw.trim();
}

export class QwenAgent {
  private apiKey: string;
  private modelType: 'deep' | 'quick';
  private systemPrompt: string;
  private provider: ModelProvider;
  private baseModel: string;
  private agentName: string;

  constructor(role: string, prompt: string, modelType: 'deep' | 'quick' = 'deep') {
    this.agentName = role;
    this.provider = getProvider();
    this.apiKey =
      process.env.OPENROUTER_API_KEY ||
      process.env.GLM_API_KEY ||
      process.env.DASHSCOPE_API_KEY ||
      '';
    this.modelType = modelType;

    if (this.provider !== 'none') {
      this.baseModel = MODEL_MAPPING[this.provider][this.modelType];
    } else {
      this.baseModel = '';
    }

    this.systemPrompt = prompt;
  }

  async analyze(context: string): Promise<AgentResponse> {
    if (!this.apiKey || this.provider === 'none') {
      console.warn(`[${this.agentName}] No API key configured, using mock response`);
      return this.getMockResponse();
    }

    try {
      let response: Response;

      if (this.provider === 'openrouter') {
        response = await this.callOpenRouter(context);
      } else if (this.provider === 'glm') {
        response = await this.callGLM(context);
      } else {
        response = await this.callDashScope(context);
      }

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as Record<string, any>;
        const errorMsg =
          errorData.error?.message || errorData.message || `HTTP ${response.status}`;
        console.warn(`[${this.agentName}] API error (${this.baseModel}):`, errorMsg);
        return this.getMockResponse();
      }

      const data = (await response.json()) as any;
      const rawContent: string | undefined =
        this.provider === 'dashscope'
          ? data.output?.choices?.[0]?.message?.content
          : data.choices?.[0]?.message?.content;

      if (rawContent) {
        try {
          const cleaned = extractJson(rawContent);
          const parsed = JSON.parse(cleaned) as AgentResponse;
          console.log(`[${this.agentName}] ✓ model=${this.baseModel}`, {
            action: parsed.action ?? parsed.signal,
            confidence: parsed.confidence,
          });
          return parsed;
        } catch {
          console.warn(
            `[${this.agentName}] JSON parse failed, raw:`,
            rawContent.substring(0, 200)
          );
          return this.getMockResponse();
        }
      }

      console.warn(`[${this.agentName}] Empty content from model`);
      return this.getMockResponse();
    } catch (error) {
      console.warn(`[${this.agentName}] Request failed:`, error);
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
        temperature: 0.4,
        max_tokens: 512,
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
        temperature: 0.4,
        max_tokens: 512,
      }),
    });
  }

  private async callDashScope(context: string): Promise<Response> {
    return fetch(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
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
          temperature: 0.4,
          max_tokens: 512,
        }),
      }
    );
  }

  private getMockResponse(): AgentResponse {
    const signals: ('BUY' | 'SELL' | 'HOLD')[] = ['BUY', 'SELL', 'HOLD'];
    const signal = signals[Math.floor(Math.random() * 3)];
    return {
      signal,
      action: signal,
      confidence: Math.floor(Math.random() * 30) + 50,
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
      `You are a professional crypto perpetuals market analyst. Analyze the market data provided.
Return ONLY a raw JSON object with no markdown, no code fences, no extra text:
{"signal":"BUY"|"SELL"|"HOLD","confidence":0-100,"reason":"brief explanation"}`,
      'deep'
    );

    this.sentimentAgent = new QwenAgent(
      'Sentiment Agent',
      `You are a crypto market sentiment analyzer. Analyze funding rate and volume data.
Return ONLY a raw JSON object with no markdown, no code fences, no extra text:
{"sentiment":"BULLISH"|"BEARISH"|"NEUTRAL","strength":0-100,"reason":"brief explanation"}`,
      'quick'
    );

    this.riskManager = new QwenAgent(
      'Risk Manager',
      `You are a crypto trading risk management expert. Calculate position sizing.
Return ONLY a raw JSON object with no markdown, no code fences, no extra text:
{"positionSize":number,"leverage":1-20,"stopLossPct":1-10}`,
      'quick'
    );

    this.coordinator = new QwenAgent(
      'Coordinator',
      `You are the final trading decision coordinator. Synthesize all agent inputs.
Return ONLY a raw JSON object with no markdown, no code fences, no extra text:
{"action":"BUY"|"SELL"|"HOLD","confidence":0-100,"reasoning":"explanation"}`,
      'deep'
    );
  }

  async executeCycle(marketData: MarketData, portfolioBalance: number): Promise<SwarmDecision> {
    console.log(`[SwarmCoordinator] Starting cycle for ${marketData.symbol} @ $${marketData.price}`);

    const [marketAnalysis, sentimentAnalysis] = await Promise.all([
      this.marketAnalyst.analyze(JSON.stringify({
        symbol: marketData.symbol,
        price: marketData.price,
        high24h: marketData.high24h,
        low24h: marketData.low24h,
        priceChange24h: marketData.priceChange24h,
        volume24h: marketData.volume24h,
        fundingRate: marketData.fundingRate,
      })),
      this.sentimentAgent.analyze(JSON.stringify({
        fundingRate: marketData.fundingRate,
        volume24h: marketData.volume24h,
        priceChange24h: marketData.priceChange24h,
      })),
    ]);

    const riskParams = await this.riskManager.analyze(JSON.stringify({
      signal: marketAnalysis.signal ?? marketAnalysis.action,
      signalConfidence: marketAnalysis.confidence,
      sentiment: sentimentAnalysis.sentiment,
      sentimentStrength: sentimentAnalysis.strength,
      portfolioBalance,
      currentPrice: marketData.price,
    }));

    const finalDecision = await this.coordinator.analyze(JSON.stringify({
      market: {
        signal: marketAnalysis.signal ?? marketAnalysis.action,
        confidence: marketAnalysis.confidence,
        reason: marketAnalysis.reason,
      },
      sentiment: {
        sentiment: sentimentAnalysis.sentiment,
        strength: sentimentAnalysis.strength,
      },
      risk: {
        positionSize: riskParams.positionSize,
        leverage: riskParams.leverage,
        stopLoss: riskParams.stopLossPct,
      },
    }));

    const action = (finalDecision.action ?? finalDecision.signal ?? 'HOLD') as 'BUY' | 'SELL' | 'HOLD';
    const confidence = finalDecision.confidence ?? 0;

    console.log(`[SwarmCoordinator] Decision: ${action} (${confidence}% confidence)`);

    return {
      action,
      confidence,
      reasoning: finalDecision.reasoning ?? finalDecision.reason ?? 'No reasoning provided',
      positionSize: riskParams.positionSize,
      leverage: riskParams.leverage ?? 1,
      stopLossPct: riskParams.stopLossPct,
    };
  }
}
