export interface AnalyticsSummary {
  days: number;
  totals: {
    incidents: number;
    triggered: number;
    acknowledged: number;
    resolved: number;
  };
  mttaMinutes: number;
  mttrMinutes: number;
  volumeByService: Array<{
    serviceName: string;
    count: number;
  }>;
  incidentsOverTime: Array<{
    date: string;
    count: number;
  }>;
  busiestOnCall: Array<{
    scheduleName: string;
    userName: string;
    count: number;
  }>;
}
