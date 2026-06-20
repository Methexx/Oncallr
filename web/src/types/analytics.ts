export interface AnalyticsSummary {
  days: number;
  serviceFilter: {
    id: string;
    name: string;
  } | null;
  totals: {
    incidents: number;
    triggered: number;
    acknowledged: number;
    resolved: number;
  };
  mttaMinutes: number;
  mttrMinutes: number;
  averageIncidentsPerDay: number;
  volumeByService: Array<{
    serviceName: string;
    count: number;
  }>;
  incidentsOverTime: Array<{
    date: string;
    count: number;
  }>;
  severityBreakdown: Array<{
    severity: string;
    count: number;
  }>;
  busiestOnCall: Array<{
    scheduleName: string;
    userName: string;
    count: number;
  }>;
}
