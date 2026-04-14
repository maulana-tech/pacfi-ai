export interface TradingConfig {
  llmProvider: 'qwen' | 'openai' | 'anthropic' | 'google';
  deepThinkModel: string;
  quickThinkModel: string;
  maxDebateRounds: number;
  apiKey: string;
}

export interface MarketContext {
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  volume24h: number;
  fundingRate: number;
  openInterest: number;
  markPrice: number;
  indexPrice: number;
  high24h: number;
  low24h: number;
  leverage: number;
}

export interface AgentResponse {
  signal?: 'BUY' | 'SELL' | 'HOLD';
  action?: 'BUY' | 'SELL' | 'HOLD';
  confidence?: number;
  reasoning?: string;
  reason?: string;
  thesis?: string;
  positionSize?: number;
  leverage?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  approved?: boolean;
  maxPositionSize?: number;
  finalPositionSize?: number;
  finalLeverage?: number;
}

export interface TradingDecision {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string;
  positionSize?: number;
  leverage?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  thesis?: string;
}

export interface AgentReport {
  agent: string;
  role: string;
  analysis: string;
  signal?: 'BUY' | 'SELL' | 'HOLD';
  confidence?: number;
  reasoning?: string;
}

export interface TradingAgentsGraph {
  analyze: (
    symbol: string,
    marketContext: MarketContext,
    portfolioBalance: number
  ) => Promise<TradingDecision>;
}

class BaseAgent {
  protected apiKey: string;
  protected model: string;
  protected baseUrl = 'https://dashscope.aliyuncs.com/api/v1';

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  protected async call(prompt: string, systemPrompt: string): Promise<AgentResponse> {
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
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.output?.choices?.[0]?.message?.content;

      if (content) {
        try {
          const parsed = JSON.parse(content);
          return parsed;
        } catch {
          console.warn('[BaseAgent] Failed to parse response:', content.substring(0, 100));
          return {};
        }
      }
      return {};
    } catch (error) {
      console.error('[BaseAgent] Error:', error);
      throw error;
    }
  }
}

class FundamentalsAnalyst extends BaseAgent {
  async analyze(context: MarketContext, portfolioBalance: number): Promise<AgentResponse> {
    const prompt = `Analyze the crypto market for ${context.symbol}.

Current Market Data:
- Price: $${context.currentPrice}
- 24h Change: ${context.priceChange24h}%
- 24h Volume: $${context.volume24h.toLocaleString()}
- 24h High: $${context.high24h}
- 24h Low: $${context.low24h}
- Open Interest: ${context.openInterest.toLocaleString()}
- Funding Rate: ${context.fundingRate}%
- Portfolio Balance: $${portfolioBalance}

Provide your fundamental analysis. Return JSON:
{
  "signal": "BUY/SELL/HOLD",
  "confidence": 0-100,
  "reasoning": "explanation of your analysis",
  "thesis": "investment thesis based on fundamentals"
}`;

    const systemPrompt = `You are a Senior Crypto Fundamental Analyst at a top hedge fund.
You evaluate cryptocurrencies based on:
- Tokenomics (supply, utility, inflation)
- Project fundamentals (team, roadmap, adoption)
- Market conditions (funding rates, open interest)
- Macro environment

Provide objective, data-driven analysis. Return valid JSON only.`;

    return this.call(prompt, systemPrompt);
  }
}

class SentimentAnalyst extends BaseAgent {
  async analyze(context: MarketContext): Promise<AgentResponse> {
    const prompt = `Analyze market sentiment for ${context.symbol}.

Market Data:
- Price: $${context.currentPrice}
- 24h Change: ${context.priceChange24h}%
- Funding Rate: ${context.fundingRate}%
- Volume: $${context.volume24h.toLocaleString()}

Provide sentiment analysis. Return JSON:
{
  "signal": "BUY/SELL/HOLD",
  "confidence": 0-100,
  "reasoning": "sentiment analysis",
  "thesis": "market sentiment thesis"
}`;

    const systemPrompt = `You are a Market Sentiment Analyst specializing in crypto markets.
You analyze:
- Funding rates (positive = long bias, negative = short bias)
- Volume trends
- Price momentum
- Social media sentiment indicators

Provide objective sentiment analysis. Return valid JSON only.`;

    return this.call(prompt, systemPrompt);
  }
}

class TechnicalAnalyst extends BaseAgent {
  async analyze(context: MarketContext): Promise<AgentResponse> {
    const prompt = `Perform technical analysis for ${context.symbol}.

Price Data:
- Current: $${context.currentPrice}
- High 24h: $${context.high24h}
- Low 24h: ${context.low24h}
- Change 24h: ${context.priceChange24h}%
- Volume: $${context.volume24h.toLocaleString()}
- Open Interest: ${context.openInterest.toLocaleString()}
- Mark Price: ${context.markPrice}
- Index Price: ${context.indexPrice}

Perform technical analysis. Return JSON:
{
  "signal": "BUY/SELL/HOLD",
  "confidence": 0-100,
  "reasoning": "technical analysis explanation",
  "thesis": "technical thesis"
}`;

    const systemPrompt = `You are a Senior Technical Analyst specializing in crypto derivatives.
You analyze using:
- Price action and momentum
- Volume analysis
- Open interest changes
- Funding rate divergence
- Support/resistance levels

Provide technical analysis with specific levels. Return valid JSON only.`;

    return this.call(prompt, systemPrompt);
  }
}

class NewsAnalyst extends BaseAgent {
  async analyze(context: MarketContext): Promise<AgentResponse> {
    const prompt = `Analyze news and macro factors for ${context.symbol}.

Market Context:
- Price: $${context.currentPrice}
- 24h Change: ${context.priceChange24h}%
- Funding Rate: ${context.fundingRate}%
- Volume: $${context.volume24h.toLocaleString()}

Analyze macro factors and recent developments. Return JSON:
{
  "signal": "BUY/SELL/HOLD",
  "confidence": 0-100,
  "reasoning": "news/macro analysis",
  "thesis": "news-driven thesis
}`;

    const systemPrompt = `You are a Crypto News & Macro Analyst.
You analyze:
- Major news events affecting crypto markets
- Regulatory developments
- Macro economic indicators
- Market-moving announcements

Provide timely analysis. Return valid JSON only.`;

    return this.call(prompt, systemPrompt);
  }
}

class BullishResearcher extends BaseAgent {
  async critique(analystReports: AgentReport[]): Promise<AgentResponse> {
    const prompt = `You are a Bullish Researcher. Critically evaluate the following analyst reports and argue WHY the bullish case is stronger.

Analyst Reports:
${JSON.stringify(analystReports, null, 2)}

Provide your bullish thesis. Return JSON:
{
  "signal": "BUY",
  "confidence": 0-100,
  "reasoning": "bullish argument",
  "thesis": "why BUY is justified
}`;

    const systemPrompt = `You are a Bullish Researcher at a crypto trading firm.
Your job is to:
- Critically evaluate bearish arguments
- Find bullish opportunities
- Challenge conventional wisdom
- Provide contrarian insights

Argue for BUY with strong conviction. Return valid JSON only.`;

    return this.call(prompt, systemPrompt);
  }
}

class BearishResearcher extends BaseAgent {
  async critique(analystReports: AgentReport[]): Promise<AgentResponse> {
    const prompt = `You are a Bearish Researcher. Critically evaluate the following analyst reports and argue WHY the bearish case is stronger.

Analyst Reports:
${JSON.stringify(analystReports, null, 2)}

Provide your bearish thesis. Return JSON:
{
  "signal": "SELL",
  "confidence": 0-100,
  "reasoning": "bearish argument",
  "thesis": "why SELL is justified"
}`;

    const systemPrompt = `You are a Bearish Researcher at a crypto trading firm.
Your job is to:
- Critically evaluate bullish arguments
- Identify risks and red flags
- Challenge consensus views
- Provide risk-adjusted perspectives

Argue for SELL with strong conviction. Return valid JSON only.`;

    return this.call(prompt, systemPrompt);
  }
}

class TraderAgent extends BaseAgent {
  async decide(
    analystReports: AgentReport[],
    bullishThesis: AgentResponse,
    bearishThesis: AgentResponse
  ): Promise<AgentResponse> {
    const prompt = `You are the Lead Trader. Aggregate all research and make the final trading decision.

Bullish Researcher:
${JSON.stringify(bullishThesis, null, 2)}

Bearish Researcher:
${JSON.stringify(bearishThesis, null, 2)}

Analyst Reports:
${JSON.stringify(analystReports, null, 2)}

Make your final trading decision. Return JSON:
{
  "action": "BUY/SELL/HOLD",
  "confidence": 0-100,
  "reasoning": "final decision rationale",
  "positionSize": recommended position size in USD,
  "leverage": 1-50,
  "stopLoss": stop loss percentage,
  "takeProfit": take profit percentage
}`;

    const systemPrompt = `You are the Lead Trader at a crypto trading firm.
Your job is to:
- Synthesize all analyst and researcher inputs
- Make decisive trading calls
- Consider risk/reward ratios
- Execute with discipline

Make the final call. Return valid JSON only.`;

    return this.call(prompt, systemPrompt);
  }
}

class RiskManager extends BaseAgent {
  async evaluate(
    trade: AgentResponse,
    portfolioBalance: number,
    marketContext: MarketContext
  ): Promise<AgentResponse> {
    const prompt = `You are the Risk Manager. Evaluate if this trade meets risk parameters.

Proposed Trade:
${JSON.stringify(trade, null, 2)}

Portfolio:
- Balance: $${portfolioBalance}
- Current Leverage: ${marketContext.leverage}x

Market:
- Price: $${marketContext.currentPrice}
- 24h Change: ${marketContext.priceChange24h}%

Evaluate risk. Return JSON:
{
  "riskLevel": "LOW/MEDIUM/HIGH",
  "reasoning": "risk assessment",
  "maxPositionSize": maximum recommended position,
  "stopLoss": recommended stop loss,
  "takeProfit": recommended take profit,
  "approved": true/false
}`;

    const systemPrompt = `You are the Head of Risk Management at a crypto trading firm.
Your job is to:
- Protect capital from large drawdowns
- Enforce position limits
- Set appropriate stop losses
- Monitor exposure

Prioritize capital preservation. Return valid JSON only.`;

    return this.call(prompt, systemPrompt);
  }
}

class PortfolioManager extends BaseAgent {
  async approve(trade: AgentResponse, riskAssessment: AgentResponse): Promise<AgentResponse> {
    const prompt = `You are the Portfolio Manager. Make final approval decision.

Trade Proposal:
${JSON.stringify(trade, null, 2)}

Risk Assessment:
${JSON.stringify(riskAssessment, null, 2)}

Make final decision. Return JSON:
{
  "approved": true/false,
  "action": "BUY/SELL/HOLD",
  "finalPositionSize": approved position size,
  "finalLeverage": approved leverage,
  "stopLoss": approved stop loss,
  "takeProfit": approved take profit,
  "reasoning": "approval rationale"
}`;

    const systemPrompt = `You are the Portfolio Manager.
Your job is to:
- Final approval of all trades
- Portfolio-level risk management
- Position sizing authority
- Override any trade if needed

Make final approval. Return valid JSON only.`;

    return this.call(prompt, systemPrompt);
  }
}

export class TradingAgentsGraph {
  private fundamentalsAnalyst: FundamentalsAnalyst;
  private sentimentAnalyst: SentimentAnalyst;
  private technicalAnalyst: TechnicalAnalyst;
  private newsAnalyst: NewsAnalyst;
  private bullishResearcher: BullishResearcher;
  private bearishResearcher: BearishResearcher;
  private traderAgent: TraderAgent;
  private riskManager: RiskManager;
  private portfolioManager: PortfolioManager;
  private maxDebateRounds: number;
  private deepThinkModel: string;
  private quickThinkModel: string;

  constructor(config: Partial<TradingConfig> = {}) {
    const apiKey = config.apiKey || '';
    this.deepThinkModel = config.deepThinkModel || 'qwen-max';
    this.quickThinkModel = config.quickThinkModel || 'qwen-turbo';
    this.maxDebateRounds = config.maxDebateRounds || 2;

    this.fundamentalsAnalyst = new FundamentalsAnalyst(apiKey, this.deepThinkModel);
    this.sentimentAnalyst = new SentimentAnalyst(apiKey, this.quickThinkModel);
    this.technicalAnalyst = new TechnicalAnalyst(apiKey, this.deepThinkModel);
    this.newsAnalyst = new NewsAnalyst(apiKey, this.quickThinkModel);
    this.bullishResearcher = new BullishResearcher(apiKey, this.deepThinkModel);
    this.bearishResearcher = new BearishResearcher(apiKey, this.deepThinkModel);
    this.traderAgent = new TraderAgent(apiKey, this.deepThinkModel);
    this.riskManager = new RiskManager(apiKey, this.quickThinkModel);
    this.portfolioManager = new PortfolioManager(apiKey, this.quickThinkModel);
  }

  async run(
    symbol: string,
    marketContext: MarketContext,
    portfolioBalance: number
  ): Promise<TradingDecision> {
    console.log(`[TradingAgents] Starting analysis for ${symbol}...`);

    const analystReports: AgentReport[] = [];

    console.log('[TradingAgents] Running Analyst Team...');

    const [fundamentals, sentiment, technical, news] = await Promise.all([
      this.fundamentalsAnalyst.analyze(marketContext, portfolioBalance),
      this.sentimentAnalyst.analyze(marketContext),
      this.technicalAnalyst.analyze(marketContext),
      this.newsAnalyst.analyze(marketContext),
    ]);

    analystReports.push(
      {
        agent: 'fundamentals',
        role: 'Fundamentals Analyst',
        analysis: fundamentals.reasoning || '',
        signal: fundamentals.signal,
        confidence: fundamentals.confidence,
      },
      {
        agent: 'sentiment',
        role: 'Sentiment Analyst',
        analysis: sentiment.reasoning || '',
        signal: sentiment.signal,
        confidence: sentiment.confidence,
      },
      {
        agent: 'technical',
        role: 'Technical Analyst',
        analysis: technical.reasoning || '',
        signal: technical.signal,
        confidence: technical.confidence,
      },
      {
        agent: 'news',
        role: 'News Analyst',
        analysis: news.reasoning || '',
        signal: news.signal,
        confidence: news.confidence,
      }
    );

    console.log('[TradingAgents] Running Researcher Debate...');

    let bullishThesis = await this.bullishResearcher.critique(analystReports);
    let bearishThesis = await this.bearishResearcher.critique(analystReports);

    for (let round = 1; round < this.maxDebateRounds; round++) {
      console.log(`[TradingAgents] Debate Round ${round}...`);
      const newBullish = await this.bullishResearcher.critique([
        ...analystReports,
        {
          agent: 'bearish',
          role: 'Bearish Researcher',
          analysis: bearishThesis.reasoning || '',
          signal: bearishThesis.signal,
        },
      ]);
      const newBearish = await this.bearishResearcher.critique([
        ...analystReports,
        {
          agent: 'bullish',
          role: 'Bullish Researcher',
          analysis: bullishThesis.reasoning || '',
          signal: bullishThesis.signal,
        },
      ]);
      bullishThesis = newBullish;
      bearishThesis = newBearish;
    }

    console.log('[TradingAgents] Trader making decision...');
    const tradeDecision = await this.traderAgent.decide(
      analystReports,
      bullishThesis,
      bearishThesis
    );

    console.log('[TradingAgents] Risk Manager evaluating...');
    const riskAssessment = await this.riskManager.evaluate(
      tradeDecision,
      portfolioBalance,
      marketContext
    );

    console.log('[TradingAgents] Portfolio Manager final approval...');
    const finalApproval = await this.portfolioManager.approve(tradeDecision, riskAssessment);

    const action = finalApproval.action || finalApproval.signal || 'HOLD';

    console.log(`[TradingAgents] Final Decision: ${action}`);

    return {
      action: action as 'BUY' | 'SELL' | 'HOLD',
      confidence: finalApproval.confidence || tradeDecision.confidence || 0,
      reasoning: finalApproval.reasoning || tradeDecision.reasoning || '',
      positionSize: finalApproval.finalPositionSize || tradeDecision.positionSize,
      leverage: finalApproval.finalLeverage || tradeDecision.leverage,
      stopLoss: finalApproval.stopLoss || tradeDecision.stopLoss,
      takeProfit: finalApproval.takeProfit || tradeDecision.takeProfit,
      riskLevel: riskAssessment.riskLevel || 'MEDIUM',
      thesis: bullishThesis.thesis || bearishThesis.thesis,
    };
  }
}

export default TradingAgentsGraph;
