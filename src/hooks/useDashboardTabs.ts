"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function useDashboardTabs<T extends string>(
  validTabs: readonly T[],
  defaultTab: T,
) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const activeTab: T =
    tabParam && validTabs.includes(tabParam as T)
      ? (tabParam as T)
      : defaultTab;

  const selectTab = (tab: T) => {
    router.replace(`?tab=${tab}`, { scroll: false });
  };

  return { activeTab, selectTab };
}
