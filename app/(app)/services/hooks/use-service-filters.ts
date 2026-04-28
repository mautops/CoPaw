"use client";

import { useMemo } from "react";
import type { ServiceInfo, ServiceCategory, ServiceSubcategory } from "@/lib/services-config";
import { CATEGORY_LABELS, SUBCATEGORY_LABELS } from "@/lib/services-data";

/**
 * 服务分类标签转换 Hook
 * 
 * @returns 分类和子分类的标签转换函数
 */
export function useServiceLabels() {
  const categoryLabel = useMemo(() => {
    return (cat: string): string =>
      CATEGORY_LABELS[cat as ServiceCategory] ?? cat;
  }, []);

  const subcategoryLabel = useMemo(() => {
    return (sub: string): string =>
      SUBCATEGORY_LABELS[sub as ServiceSubcategory] ?? sub;
  }, []);

  return { categoryLabel, subcategoryLabel };
}

/**
 * 服务筛选逻辑 Hook
 * 
 * @param services - 服务列表
 * @returns 筛选相关的状态和方法
 */
export function useServiceFilters(services: ServiceInfo[]) {
  // 提取所有唯一分类并排序
  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const s of services) {
      if (s.category) seen.add(s.category);
    }
    return [...seen].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  }, [services]);

  /**
   * 获取指定分类下的所有子分类
   */
  const getSubcategoriesInTab = useMemo(() => {
    return (categoryTab: string, all: ServiceInfo[]): string[] => {
      const base = categoryTab === "all" ? all : all.filter((s) => s.category === categoryTab);
      const seen = new Set<string>();
      for (const s of base) {
        if (s.subcategory) seen.add(s.subcategory);
      }
      return [...seen].sort();
    };
  }, []);

  /**
   * 根据筛选条件过滤服务列表
   */
  const filterServices = useMemo(() => {
    return (
      all: ServiceInfo[],
      categoryTab: string,
      subcategoryFilter: string,
      nameQuery: string,
      selectedTags: string[],
    ): ServiceInfo[] => {
      let items = all;
      if (categoryTab !== "all") {
        items = items.filter((s) => s.category === categoryTab);
      }
      if (subcategoryFilter !== "all") {
        items = items.filter((s) => s.subcategory === subcategoryFilter);
      }
      const q = nameQuery.trim().toLowerCase();
      if (q) {
        items = items.filter((s) => s.name.toLowerCase().includes(q));
      }
      if (selectedTags.length > 0) {
        items = items.filter((s) =>
          selectedTags.every((t) => s.tags?.includes(t)),
        );
      }
      // 已集成优先
      const STATUS_ORDER: Record<string, number> = { integrated: 0, planned: 1, not_started: 2 };
      return [...items].sort((a, b) => {
        const aOrder = STATUS_ORDER[a.integrationStatus] ?? 99;
        const bOrder = STATUS_ORDER[b.integrationStatus] ?? 99;
        return aOrder - bOrder;
      });
    };
  }, []);

  return { categories, getSubcategoriesInTab, filterServices };
}
