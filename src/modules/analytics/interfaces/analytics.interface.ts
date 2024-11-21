export interface SentimentData {
  timestamp: Date;
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;
}

export interface IssueFrequency {
  issue: string;
  count: number;
  category: string;
}

export interface TimeDistribution {
  hour: number;
  count: number;
  averageHandleTime: number;
}

export interface AdvancedAnalytics {
  performanceMetrics: {
    averageHandleTime: number;
    firstCallResolution: number;
    customerSatisfactionScore: number;
    agentUtilization: number;
  };
  customerInsights: {
    sentimentTrends: SentimentData[];
    commonIssues: IssueFrequency[];
    peakCallTimes: TimeDistribution[];
  };
  businessImpact: {
    costPerCall: number;
    revenueGenerated: number;
    customerRetentionRate: number;
  };
}
