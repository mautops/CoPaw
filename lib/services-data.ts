import type { ServiceCategory, ServiceSubcategory, IntegrationStatus, ClusterStatus } from './services-config';

// 分类显示名称
export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  middleware: '中间件服务',
  storage: '存储服务',
  virtualization: '虚拟化',
  monitoring: '监控服务',
  devops: 'DevOps 工具',
};

// 二级分类显示名称
export const SUBCATEGORY_LABELS: Record<ServiceSubcategory, string> = {
  inspection: '巡检',
  operation: '运维',
  tuning: '调优',
};

// 集成状态显示
export const STATUS_CONFIG: Record<IntegrationStatus, { label: string; icon: string; color: string }> = {
  integrated: { label: '已集成', icon: '✅', color: 'text-green-500' },
  planned: { label: '计划中', icon: '🚧', color: 'text-yellow-500' },
  not_started: { label: '未开始', icon: '⭕', color: 'text-gray-500' },
};

// 集群状态显示
export const CLUSTER_STATUS_CONFIG: Record<ClusterStatus, {
  label: string;
  color: string;
  dotColor: string;
  badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive';
}> = {
  running: {
    label: '运行中',
    color: 'text-green-600 dark:text-green-400',
    dotColor: 'bg-green-500',
    badgeVariant: 'default',
  },
  paused: {
    label: '已暂停',
    color: 'text-yellow-600 dark:text-yellow-400',
    dotColor: 'bg-yellow-500',
    badgeVariant: 'secondary',
  },
  draft: {
    label: '草稿',
    color: 'text-muted-foreground',
    dotColor: 'bg-muted-foreground/40',
    badgeVariant: 'outline',
  },
};
