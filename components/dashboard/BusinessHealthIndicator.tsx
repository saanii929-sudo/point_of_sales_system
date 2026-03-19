'use client';

import { useEffect, useState } from 'react';
import { Card, CardBody } from '@/components/ui/Card';

interface HealthMetrics {
  salesTrend: number; // -100 to 100
  stockHealth: number; // 0 to 100
  customerRetention: number; // 0 to 100
  profitMargin: number; // 0 to 100
}

export function BusinessHealthIndicator() {
  const [health, setHealth] = useState<HealthMetrics>({
    salesTrend: 0,
    stockHealth: 0,
    customerRetention: 0,
    profitMargin: 0
  });
  const [overallScore, setOverallScore] = useState(0);

  useEffect(() => {
    fetchHealthMetrics();
  }, []);

  const fetchHealthMetrics = async () => {
    try {
      const res = await fetch('/api/analytics/health');
      if (res.ok) {
        const data = await res.json();
        setHealth(data.metrics);
        setOverallScore(data.overallScore);
      }
    } catch (error) {
      console.error('Failed to fetch health metrics');
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  };

  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 36}`}
                strokeDashoffset={`${2 * Math.PI * 36 * (1 - overallScore / 100)}`}
                className={getHealthColor(overallScore)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xl font-bold ${getHealthColor(overallScore)}`}>
                {Math.round(overallScore)}
              </span>
            </div>
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1">Business Health</h3>
            <p className={`text-sm font-medium ${getHealthColor(overallScore)}`}>
              {getHealthLabel(overallScore)}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Sales: </span>
                <span className="font-medium">{health.salesTrend > 0 ? '+' : ''}{health.salesTrend}%</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Stock: </span>
                <span className="font-medium">{Math.round(health.stockHealth)}%</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Retention: </span>
                <span className="font-medium">{Math.round(health.customerRetention)}%</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Margin: </span>
                <span className="font-medium">{Math.round(health.profitMargin)}%</span>
              </div>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
