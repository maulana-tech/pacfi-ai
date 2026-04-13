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

export class QwenAgent {
  private apiKey: string;
  private model: string;
  private systemPrompt: string;
  private useOpenRouter: boolean;

  constructor(role: string, prompt: string, model: string = 'qwen-max') {
    this.useOpenRouter = !!process.env.OPENROUTER_API_KEY;
    this.apiKey = process.env.OPENROUTER_API_KEY || process.env.DASHSCOPE_API_KEY || '';
    this.model = model;
    this.systemPrompt = prompt;
  }

  async analyze(context: string): Promise<AgentResponse> {
    if (!this.apiKey) {
      console.warn('[Agent] No API key configured, returning mock response');
      return this.getMockResponse();
    }

    try {
      let response: Response;

      if (this.useOpenRouter) {
        const openRouterModel =
          this.model === 'qwen-max' ? 'qwen/qwen2.5-72b-instruct' : 'qwen/qwen2.5-7b-instruct';

        response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://pacfi.ai',
            'X-Title': 'Pacfi AI',
          },
          body: JSON.stringify({
            model: openRouterModel,
            messages: [
              { role: 'system', content: this.systemPrompt },
              { role: 'user', content: context },
            ],
            temperature: 0.7,
            max_tokens: 1024,
          }),
        });
      } else {
        response = await fetch(
          'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: this.model,
              messages: [
                { role: 'system', content: this.systemPrompt },
                { role: 'user', content: context },
              ],
              temperature: 0.7,
              max_tokens: 1024,
            }),
          }
        );
      }

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as Record<string, any>;
        const errorMsg = this.useOpenRouter ? errorData.error?.message : errorData.message;
        console.warn('[Agent] API error:', errorMsg || response.statusText);
        return this.getMockResponse();
      }

      const data = (await response.json()) as any;

      let content: string | undefined;
      if (this.useOpenRouter) {
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
       Only return valid JSON, no other text.`
    );

    this.sentimentAgent = new QwenAgent(
      'Sentiment Agent',
      `You are a market sentiment analyzer. Analyze funding rates and market conditions.
       Return a JSON response with:
       - sentiment: "BULLISH", "BEARISH", or "NEUTRAL"
       - strength: 0-100 (sentiment strength)
       - reason: brief explanation
       Only return valid JSON, no other text.`
    );

    this.riskManager = new QwenAgent(
      'Risk Manager',
      `You are a risk management expert. Calculate optimal position sizing and risk parameters.
       Given market conditions and portfolio balance, return JSON with:
       - positionSize: recommended position size in USD
       - leverage: recommended leverage (1-50x)
       - stopLossPct: stop loss percentage (1-10%)
       Only return valid JSON, no other text.`
    );

    this.coordinator = new QwenAgent(
      'Coordinator',
      `You are the trading coordinator. Aggregate inputs from all agents and make final trading decision.
       Return a JSON response with:
       - action: "BUY", "SELL", or "HOLD"
       - confidence: 0-100
       - reasoning: explanation of final decision
       Only return valid JSON, no other text.`
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
      console.error('[SwarmCoordinator] Error executing cycle:', error);
      return { action: 'HOLD', confidence: 0, reasoning: 'Error in swarm analysis' };
    }
  }
}
