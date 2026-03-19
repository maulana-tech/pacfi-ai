import { SwarmDecision, MarketData } from '@pacfi/shared';

interface AgentResponse {
  signal?: 'BUY' | 'SELL' | 'HOLD';
  confidence?: number;
  reason?: string;
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

  constructor(role: string, prompt: string, apiKey: string, model: string = 'qwen-max') {
    this.apiKey = apiKey;
    this.model = model;
    this.systemPrompt = prompt;
    this.baseUrl = 'https://dashscope.aliyuncs.com/api/v1';
  }

  async analyze(context: string): Promise<AgentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/services/aigc/text-generation/generation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: this.systemPrompt,
            },
            {
              role: 'user',
              content: context,
            },
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        throw new Error(`Qwen API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.output?.choices?.[0]?.message?.content) {
        try {
          return JSON.parse(data.output.choices[0].message.content);
        } catch {
          console.error('[QwenAgent] Failed to parse response:', data.output.choices[0].message.content);
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
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;

    this.marketAnalyst = new QwenAgent(
      'Market Analyst',
      `You are a professional crypto market analyst. Analyze the provided OHLCV data and technical indicators.
       Return a JSON response with:
       - signal: "BUY", "SELL", or "HOLD"
       - confidence: 0-100 (confidence level)
       - reason: brief explanation of your analysis
       Only return valid JSON, no other text.`,
      apiKey
    );

    this.sentimentAgent = new QwenAgent(
      'Sentiment Agent',
      `You are a market sentiment analyzer. Analyze funding rates and market conditions.
       Return a JSON response with:
       - sentiment: "BULLISH", "BEARISH", or "NEUTRAL"
       - strength: 0-100 (sentiment strength)
       - reason: brief explanation
       Only return valid JSON, no other text.`,
      apiKey
    );

    this.riskManager = new QwenAgent(
      'Risk Manager',
      `You are a risk management expert. Calculate optimal position sizing and risk parameters.
       Given market conditions and portfolio balance, return JSON with:
       - positionSize: recommended position size in USD
       - leverage: recommended leverage (1-50x)
       - stopLossPct: stop loss percentage (1-10%)
       Only return valid JSON, no other text.`,
      apiKey
    );

    this.coordinator = new QwenAgent(
      'Coordinator',
      `You are the trading coordinator. Aggregate inputs from all agents and make final trading decision.
       Return a JSON response with:
       - action: "BUY", "SELL", or "HOLD"
       - confidence: 0-100
       - reasoning: explanation of final decision
       Only return valid JSON, no other text.`,
      apiKey
    );
  }

  async executeCycle(marketData: MarketData, portfolioBalance: number): Promise<SwarmDecision> {
    try {
      // 1. Market Analysis
      const marketAnalysis = (await this.marketAnalyst.analyze(
        JSON.stringify(marketData)
      )) as AgentResponse;

      // 2. Sentiment Analysis
      const sentimentAnalysis = (await this.sentimentAgent.analyze(
        JSON.stringify({
          fundingRate: marketData.fundingRate,
          volume: marketData.volume24h,
        })
      )) as AgentResponse;

      // 3. Risk Calculation
      const riskContext = JSON.stringify({
        marketAnalysis,
        sentiment: sentimentAnalysis,
        portfolioBalance,
      });
      const riskParams = (await this.riskManager.analyze(riskContext)) as AgentResponse;

      // 4. Final Decision
      const finalContext = JSON.stringify({
        market: marketAnalysis,
        sentiment: sentimentAnalysis,
        risk: riskParams,
      });
      const finalDecision = (await this.coordinator.analyze(finalContext)) as AgentResponse;

      return {
        action: (finalDecision.signal as 'BUY' | 'SELL' | 'HOLD') || 'HOLD',
        confidence: finalDecision.confidence || 0,
        reasoning: finalDecision.reason || 'No reasoning provided',
        positionSize: riskParams.positionSize,
        leverage: riskParams.leverage,
        stopLossPct: riskParams.stopLossPct,
      };
    } catch (error) {
      console.error('[SwarmCoordinator] Error executing cycle:', error);
      return {
        action: 'HOLD',
        confidence: 0,
        reasoning: 'Error in swarm analysis',
      };
    }
  }
}

export default SwarmCoordinator;
