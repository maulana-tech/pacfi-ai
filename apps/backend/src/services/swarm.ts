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
  private baseUrl: string;

  constructor(role: string, prompt: string, model: string = 'qwen-max') {
    this.apiKey = process.env.DASHSCOPE_API_KEY || '';
    this.model = model;
    this.systemPrompt = prompt;
    this.baseUrl = 'https://dashscope.aliyuncs.com/api/v1';
  }

  async analyze(context: string): Promise<AgentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/services/aigc/text-generation/generation`, {
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
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        output?: { choices?: { message?: { content?: string } }[] };
      };

      const content = data.output?.choices?.[0]?.message?.content;
      if (content) {
        try {
          return JSON.parse(content) as AgentResponse;
        } catch {
          console.error('[QwenAgent] Failed to parse response:', content);
          return {};
        }
      }

      return {};
    } catch (error) {
      console.error('[QwenAgent] Error analyzing:', error);
      throw error;
    }
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
