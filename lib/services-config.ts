// 服务配置数据
export type ServiceCategory = 'middleware' | 'storage' | 'virtualization' | 'monitoring' | 'devops';
export type ServiceSubcategory = 'inspection' | 'operation' | 'tuning';
export type IntegrationStatus = 'integrated' | 'planned' | 'not_started';
export type ClusterStatus = 'running' | 'paused' | 'draft';

export interface Cluster {
  /** 集群唯一标识（在服务内唯一） */
  id: string;
  /** 集群名称 */
  name: string;
  /** 集群描述 */
  description?: string;
  /** 主机 IP 列表 */
  hosts: string[];
  /** 集群状态 */
  status: ClusterStatus;
  /** 执行提示词：针对该集群执行工作流时附加的背景信息 */
  prompt?: string;
}

export interface QuickAction {
  id: string;
  name: string;
  icon: string;
  dangerous?: boolean;
}

export interface ServiceCapabilities {
  agent?: {
    id: string;
    name: string;
    status: 'active' | 'beta';
  };
  quickActions?: QuickAction[];
}

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  subcategory?: ServiceSubcategory;
  description: string;
  integrationStatus: IntegrationStatus;
  capabilities?: ServiceCapabilities;
  /** 绑定的工作流文件名列表 */
  workflowIds?: string[];
  /** 关联的 Agent ID（YAML 字段 agent_id），agent 合并逻辑使用 */
  agentId?: string;
  owner: string;
  docs?: string;
  tags: string[];
  version?: string;
  users?: string[];
  /** 集群实例列表 */
  clusters?: Cluster[];
}

/** Service 加上来自文件系统的元数据（列表页使用） */
export interface ServiceInfo extends Service {
  filename: string;
  path: string;
  size: number;
  created_time: string;
  modified_time: string;
}
