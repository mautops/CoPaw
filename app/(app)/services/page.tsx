"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ContentTopbar, TopbarBreadcrumb } from "@/components/layout/content-topbar";
import { useAppShell } from "@/app/(app)/app-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2Icon, ServerIcon } from "lucide-react";
import { fetchServicesWithAgents } from "@/lib/services-api";
import type { ServiceInfo } from "@/lib/services-config";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  ServiceSearchBar,
  ServiceCard,
  RunStatsPanel,
} from "./components";
import { useServiceFilters, useServiceLabels } from "./hooks";

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ServicesPage() {
  const { showLeftSidebar, toggleLeftSidebar } = useAppShell();
  const [categoryTab, setCategoryTab] = useState("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState("all");
  const [nameQuery, setNameQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data: services, isLoading } = useQuery({
    queryKey: ["services", "list"],
    queryFn: fetchServicesWithAgents,
    staleTime: 30_000,
  });

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  const handleTagRemove = useCallback((tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleCategoryChange = useCallback((cat: string) => {
    setCategoryTab(cat);
    setSubcategoryFilter("all");
  }, []);

  const all = services ?? [];

  // 使用自定义 Hook 提取分类和筛选逻辑
  const { categories, getSubcategoriesInTab, filterServices } = useServiceFilters(all);
  const { categoryLabel, subcategoryLabel } = useServiceLabels();

  // 当前 tab 下有 subcategory 的条目
  const subcategoriesInTab = useMemo(() => {
    return getSubcategoriesInTab(categoryTab, all);
  }, [categoryTab, all, getSubcategoriesInTab]);

  const filteredItems = useMemo(() => {
    return filterServices(all, categoryTab, subcategoryFilter, nameQuery, selectedTags);
  }, [all, categoryTab, subcategoryFilter, nameQuery, selectedTags, filterServices]);

  const hasFilter = nameQuery.trim() !== "" || selectedTags.length > 0 || subcategoryFilter !== "all";

  const searchBar = (
    <ServiceSearchBar
      services={all}
      nameQuery={nameQuery}
      onNameQueryChange={setNameQuery}
      selectedTags={selectedTags}
      onTagToggle={handleTagToggle}
      onTagRemove={handleTagRemove}
    />
  );

  if (isLoading) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <ContentTopbar
          showLeftSidebar={showLeftSidebar}
          onToggleLeftSidebar={toggleLeftSidebar}
          showRightSidebar={false}
          onToggleRightSidebar={() => {}}
          onSearchOpen={() => {}}
          startSlot={<TopbarBreadcrumb items={["运维", "公共服务"]} />}
        />
        <div className="flex flex-1 items-center justify-center pt-14">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <ContentTopbar
        showLeftSidebar={showLeftSidebar}
        onToggleLeftSidebar={toggleLeftSidebar}
        showRightSidebar={false}
        onToggleRightSidebar={() => {}}
        onSearchOpen={() => {}}
        startSlot={<TopbarBreadcrumb items={["运维", "公共服务"]} />}
        centerSlot={searchBar}
      />

      <div className="flex-1 overflow-y-auto pt-14">
        <div className="space-y-4 p-6">
          {all.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="flex flex-col items-center gap-4 py-24 text-muted-foreground"
            >
              <ServerIcon className="size-12 opacity-20" />
              <p className="text-sm">暂无服务，请在工作目录的 services/ 子目录添加 YAML 文件</p>
            </motion.div>
          ) : (
            <Tabs value={categoryTab} onValueChange={handleCategoryChange}>
              <TabsList
                variant="line"
                className="h-auto min-h-9 w-auto flex-wrap justify-start gap-1 py-1"
              >
                <TabsTrigger value="all">
                  全部
                  <span className="ml-1 tabular-nums text-muted-foreground">({all.length})</span>
                </TabsTrigger>
                {categories.map((c) => {
                  const count = all.filter((s) => s.category === c).length;
                  return (
                    <TabsTrigger key={c} value={c}>
                      {categoryLabel(c)}
                      <span className="ml-1 tabular-nums text-muted-foreground">({count})</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {/* 子分类筛选条 */}
              {subcategoriesInTab.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSubcategoryFilter("all")}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                      subcategoryFilter === "all"
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                    }`}
                  >
                    全部类型
                  </button>
                  {subcategoriesInTab.map((sub) => {
                    const active = subcategoryFilter === sub;
                    const count = (categoryTab === "all" ? all : all.filter((s) => s.category === categoryTab))
                      .filter((s) => s.subcategory === sub).length;
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setSubcategoryFilter(active ? "all" : sub)}
                        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                          active
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                        }`}
                      >
                        {subcategoryLabel(sub)}
                        <span className="ml-1 tabular-nums opacity-60">({count})</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {["all", ...categories].map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-4">
                  <AnimatePresence mode="wait">
                    {categoryTab === tab && (
                      <motion.div
                        key={`${tab}-${subcategoryFilter}-${nameQuery}-${selectedTags.join(",")}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                      >
                        {filteredItems.length === 0 ? (
                          <p className="py-10 text-center text-sm text-muted-foreground">
                            {hasFilter ? "没有匹配的服务" : "该分类下暂无服务"}
                          </p>
                        ) : (
                          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {filteredItems.map((s, i) => (
                              <ServiceCard key={s.filename} s={s} index={i} />
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
