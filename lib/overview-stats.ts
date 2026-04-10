import { CATEGORY_LABELS } from './services-data';
import type { Service, ServiceCategory } from './services-config';

export interface OverviewStats {
  total: number;
  integrated: number;
  planned: number;
  notStarted: number;
  integrationRate: number;
  agentEnabled: number;
}

export interface CategoryStats {
  category: ServiceCategory;
  label: string;
  total: number;
  integrated: number;
  planned: number;
  notStarted: number;
  integrationRate: number;
}

export function calculateOverviewStats(services: Service[]): OverviewStats {
  const total = services.length;
  const integrated = services.filter((s) => s.integrationStatus === 'integrated').length;
  const planned = services.filter((s) => s.integrationStatus === 'planned').length;
  const notStarted = services.filter((s) => s.integrationStatus === 'not_started').length;
  const agentEnabled = services.filter(
    (s) => s.capabilities?.agent?.status === 'active',
  ).length;

  return {
    total,
    integrated,
    planned,
    notStarted,
    integrationRate: total > 0 ? Math.round((integrated / total) * 100) : 0,
    agentEnabled,
  };
}

export function calculateCategoryStats(services: Service[]): CategoryStats[] {
  // 按分类分组
  const grouped = services.reduce((acc, service) => {
    if (!acc[service.category]) acc[service.category] = [];
    acc[service.category].push(service);
    return acc;
  }, {} as Record<ServiceCategory, Service[]>);

  return Object.entries(grouped).map(([category, svcs]) => {
    const total = svcs.length;
    const integrated = svcs.filter((s) => s.integrationStatus === 'integrated').length;
    return {
      category: category as ServiceCategory,
      label: CATEGORY_LABELS[category as ServiceCategory],
      total,
      integrated,
      planned: svcs.filter((s) => s.integrationStatus === 'planned').length,
      notStarted: svcs.filter((s) => s.integrationStatus === 'not_started').length,
      integrationRate: total > 0 ? Math.round((integrated / total) * 100) : 0,
    };
  });
}
