import { agentsRegistryApi } from './agents-registry-api';
import { chatApi } from './chat-api';
import { parseErrorMessage } from './api-utils';
import type { Service, ServiceInfo, ServiceCategory, ServiceSubcategory, IntegrationStatus, Cluster, ClusterStatus } from './services-config';
import type { ChecklistRunMeta } from './checklist-types';

interface ServiceFileInfo {
  filename: string;
  path: string;
  size: number;
  created_time: string;
  modified_time: string;
  id: string | null;
  name: string | null;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  integration_status: string | null;
  owner: string | null;
  version: string | null;
  docs: string | null;
  tags: string[];
  workflow_ids: string[];
  agent_id: string | null;
  users: string[];
  status: string | null;
  clusters: Array<{
    id: string;
    name: string;
    description?: string;
    hosts: string[];
    status: string;
    prompt?: string;
  }>;
}

async function fetchServiceFiles(): Promise<ServiceFileInfo[]> {
  const res = await fetch('/api/services');
  if (!res.ok) throw new Error(`services API error: ${res.status}`);
  const data = (await res.json()) as { services: ServiceFileInfo[] };
  return data.services;
}

function toServiceInfo(f: ServiceFileInfo): ServiceInfo {
  return {
    filename: f.filename,
    path: f.path,
    size: f.size,
    created_time: f.created_time,
    modified_time: f.modified_time,
    id: f.id ?? '',
    name: f.name ?? '',
    category: (f.category ?? 'middleware') as ServiceCategory,
    subcategory: f.subcategory ? (f.subcategory as ServiceSubcategory) : undefined,
    description: f.description ?? '',
    integrationStatus: (f.integration_status ?? 'not_started') as IntegrationStatus,
    owner: f.owner ?? '',
    tags: f.tags,
    workflowIds: f.workflow_ids.length > 0 ? f.workflow_ids : undefined,
    agentId: f.agent_id ?? undefined,
    version: f.version ?? undefined,
    docs: f.docs ?? undefined,
    users: f.users.length > 0 ? f.users : undefined,
    clusters: f.clusters.length > 0
      ? f.clusters.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          hosts: c.hosts,
          status: (c.status as ClusterStatus) ?? 'draft',
          prompt: c.prompt,
        } satisfies Cluster))
      : undefined,
  };
}

export async function fetchServicesWithAgents(): Promise<ServiceInfo[]> {
  try {
    const [files, agentsResponse] = await Promise.all([
      fetchServiceFiles(),
      agentsRegistryApi.list().catch(() => ({ agents: [] })),
    ]);

    const agentsMap = new Map(agentsResponse.agents.map(a => [a.id, a]));

    return files.map(f => {
      const service = toServiceInfo(f);
      const agent = service.agentId ? agentsMap.get(service.agentId) : null;

      if (agent) {
        return {
          ...service,
          integrationStatus: agent.enabled ? 'integrated' : 'planned',
          capabilities: {
            agent: {
              id: agent.id,
              name: agent.name,
              status: agent.enabled ? ('active' as const) : ('beta' as const),
            },
          },
        } as ServiceInfo;
      }

      return service;
    });
  } catch {
    return [];
  }
}

async function svcRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/services${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json() as Promise<T>;
}

export const serviceApi = {
  get: (filename: string) =>
    svcRequest<{ content: string; raw: string; meta: Record<string, unknown> }>(
      `/${encodeURIComponent(filename)}`,
    ),

  update: (filename: string, content: string) =>
    svcRequest<{ success: boolean; filename: string; path: string }>(
      `/${encodeURIComponent(filename)}`,
      { method: 'PUT', body: JSON.stringify({ content }) },
    ),

  delete: (filename: string) =>
    svcRequest<{ success: boolean; filename: string }>(
      `/${encodeURIComponent(filename)}`,
      { method: 'DELETE' },
    ),
};

/** 真实 Agent 总数（来自 CoPaw 后端） */
export async function fetchAgentCount(): Promise<number> {
  try {
    const response = await agentsRegistryApi.list();
    return response.agents.filter(a => a.enabled && !a.is_builtin).length;
  } catch {
    return 0;
  }
}

/** 全部巡检执行记录的汇总统计（来自 chat 历史） */
export async function fetchChecklistStats(): Promise<{
  total: number;
  last7Days: number;
  lastExecutedAt: string | null;
}> {
  try {
    const chats = await chatApi.listChats();
    const runs = chats.filter(c => {
      const meta = c.meta as Partial<ChecklistRunMeta> | undefined;
      return meta?.type === 'checklist_run';
    });

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const last7Days = runs.filter(c => {
      const t = c.created_at ? new Date(c.created_at).getTime() : 0;
      return t >= sevenDaysAgo;
    }).length;

    const sorted = [...runs].sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });

    return {
      total: runs.length,
      last7Days,
      lastExecutedAt: sorted[0]?.created_at ?? null,
    };
  } catch {
    return { total: 0, last7Days: 0, lastExecutedAt: null };
  }
}
