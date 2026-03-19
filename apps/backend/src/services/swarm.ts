import Anthropic from '@anthropic-ai/sdk';
import { SwarmDecision, MarketData } from '../types';

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
  private client: Anthropic;
  private model: string;
  private systemPrompt: string;

  constructor(role: string, prompt: string, model: string = 'claude-3-5-sonnet-20241022') {
    this.client = new Anthropic({
      apiKey: process.env.DASHSCOPE_API_KEY,
    });
    this.model = model;
    this.systemPrompt = prompt;
  }

  async analyze(context: string): Promise<AgentResponse> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: this.systemPrompt,
        messages: [
          {
            role: 'user',
            content: context,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from AI');
      }

      try {
        return JSON.parse(content.text);
      } catch {
        console.error('[QwenAgent] Failed to parse response:', content.text);
        return {};
      }
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
      // 1. Market Analysis
      const marketAnalysisStr = await this.marketAnalyst.analyze(JSON.stringify(marketData));
      const marketAnalysis = marketAnalysisStr as AgentResponse;

      // 2. Sentiment Analysis
      const sentimentAnalysisStr = await this.sentimentAgent.analyze(
        JSON.stringify({
          fundingRate: marketData.fundingRate,
          volume: marketData.volume24h,
        })
      );
      const sentimentAnalysis = sentimentAnalysisStr as AgentResponse;

      // 3. Risk Calculation
      const riskContextStr = JSON.stringify({
        marketAnalysis,
        sentiment: sentimentAnalysis,
        portfolioBalance,
      });
      const riskParamsStr = await this.riskManager.analyze(riskContextStr);
      const riskParams = riskParamsStr as AgentResponse;

      // 4. Final Decision
      const finalContextStr = JSON.stringify({
        market: marketAnalysis,
        sentiment: sentimentAnalysis,
        risk: riskParams,
      });
      const finalDecisionStr = await this.coordinator.analyze(finalContextStr);
      const finalDecision = finalDecisionStr as AgentResponse;

      return {
        action: (finalDecision.action as 'BUY' | 'SELL' | 'HOLD') || 'HOLD',
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
