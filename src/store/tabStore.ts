import { useSyncExternalStore } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { DocumentFormat, DocumentOutlineItem, DocumentMetadata } from '../types/document';
import { DocumentErrorInfo } from '../components/common/DocumentErrorView';
import { DocumentRenderer } from '../engine/types';
import { NavDrawerTab } from '../components/layout/NavigationRail';

export type TabStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface TabProgress {
  status: string;
  percent: number;
}

export interface TabState {
  id: string;
  name: string;
  path?: string;
  format: DocumentFormat;
  effectiveFormat: DocumentFormat;
  status: TabStatus;
  progress: TabProgress | null;
  error: DocumentErrorInfo | null;

  fileBytes?: Uint8Array;
  url?: string;
  cachedPdfPath?: string;
  convertedBytes?: Uint8Array;
  effectiveDocumentUrl?: string;

  renderer: DocumentRenderer | null;
  numPages: number;
  metadata: DocumentMetadata | null;
  outline: DocumentOutlineItem[];
  bookmarks: number[];

  scale: number;
  rotation: number;
  currentPage: number;
  goToPage?: number;
  scrollTop: number;
  scrollLeft: number;
  isContinuous: boolean;
  isDual: boolean;

  drawerTab: NavDrawerTab;
  isApproximatePreview: boolean;
  lastActiveTime: number;
}

export const MAX_ALIVE_TABS = 5;

interface StoreState {
  tabs: TabState[];
  activeTabId?: string;
}

let state: StoreState = {
  tabs: [],
  activeTabId: undefined,
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function pruneInactiveTabs(tabs: TabState[], activeId?: string) {
  if (tabs.length <= MAX_ALIVE_TABS) return;

  const sorted = [...tabs].sort((a, b) => b.lastActiveTime - a.lastActiveTime);
  const aliveIds = new Set(sorted.slice(0, MAX_ALIVE_TABS).map((t) => t.id));
  if (activeId) aliveIds.add(activeId);

  for (const t of tabs) {
    if (!aliveIds.has(t.id) && t.renderer) {
      try {
        t.renderer.destroy();
      } catch (e) {
        console.warn('Error destroying pruned renderer:', e);
      }
      t.renderer = null;
    }
  }
}

export const tabStore = {
  getState(): StoreState {
    return state;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getActiveTab(): TabState | undefined {
    return state.tabs.find((t) => t.id === state.activeTabId);
  },

  getAliveTabs(): TabState[] {
    return state.tabs.filter((t) => t.renderer !== null || t.id === state.activeTabId);
  },

  addTab(init: {
    id: string;
    name: string;
    path?: string;
    format: DocumentFormat;
    fileBytes?: Uint8Array;
    url?: string;
    cachedPdfPath?: string;
    convertedBytes?: Uint8Array;
    lastPage?: number;
    lastScrollTop?: number;
  }) {
    const existing = state.tabs.find((t) => t.id === init.id);
    if (existing) {
      this.setActiveTab(init.id);
      return;
    }

    const newTab: TabState = {
      id: init.id,
      name: init.name,
      path: init.path,
      format: init.format,
      effectiveFormat: init.format,
      status: 'loading',
      progress: null,
      error: null,
      fileBytes: init.fileBytes,
      url: init.url,
      cachedPdfPath: init.cachedPdfPath,
      convertedBytes: init.convertedBytes,
      effectiveDocumentUrl: init.url,
      renderer: null,
      numPages: 0,
      metadata: null,
      outline: [],
      bookmarks: [],
      scale: 1.2,
      rotation: 0,
      currentPage: init.lastPage || 1,
      goToPage: init.lastPage || 1,
      scrollTop: init.lastScrollTop || 0,
      scrollLeft: 0,
      isContinuous: true,
      isDual: false,
      drawerTab: 'pages',
      isApproximatePreview: false,
      lastActiveTime: Date.now(),
    };

    const nextTabs = [...state.tabs, newTab];
    pruneInactiveTabs(nextTabs, init.id);
    state = {
      tabs: nextTabs,
      activeTabId: init.id,
    };
    notify();
  },

  closeTab(id: string) {
    invoke('cancel_conversion_job', { tabId: id }).catch(() => {});
    const target = state.tabs.find((t) => t.id === id);
    if (target) {
      if (target.renderer) {
        try {
          target.renderer.destroy();
        } catch {}
      }
      if (target.url && target.url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(target.url);
        } catch {}
      }
      if (target.effectiveDocumentUrl && target.effectiveDocumentUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(target.effectiveDocumentUrl);
        } catch {}
      }
    }

    const nextTabs = state.tabs.filter((t) => t.id !== id);
    let nextActiveId = state.activeTabId;
    if (state.activeTabId === id) {
      nextActiveId = nextTabs[nextTabs.length - 1]?.id;
    }

    state = {
      tabs: nextTabs,
      activeTabId: nextActiveId,
    };
    notify();
  },

  setActiveTab(id: string) {
    if (state.activeTabId === id) return;
    const nextTabs = state.tabs.map((t) =>
      t.id === id ? { ...t, lastActiveTime: Date.now() } : t
    );
    pruneInactiveTabs(nextTabs, id);
    state = {
      tabs: nextTabs,
      activeTabId: id,
    };
    notify();
  },

  updateTab(id: string, updates: Partial<TabState>) {
    state = {
      ...state,
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    };
    notify();
  },

  updateActiveTab(updates: Partial<TabState>) {
    if (!state.activeTabId) return;
    this.updateTab(state.activeTabId, updates);
  },

  setTabScroll(id: string, scrollTop: number) {
    const tab = state.tabs.find((t) => t.id === id);
    if (tab && Math.abs(tab.scrollTop - scrollTop) > 2) {
      tab.scrollTop = scrollTop;
      // Minimal notify or debounce if needed
    }
  },

  setTabPage(id: string, page: number) {
    state = {
      ...state,
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, currentPage: page, goToPage: page } : t
      ),
    };
    notify();
  },

  setTabScale(id: string, scale: number) {
    state = {
      ...state,
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, scale } : t)),
    };
    notify();
  },

  setTabRotation(id: string, rotation: number) {
    state = {
      ...state,
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, rotation } : t)),
    };
    notify();
  },

  setTabDrawer(id: string, drawerTab: NavDrawerTab) {
    state = {
      ...state,
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, drawerTab } : t)),
    };
    notify();
  },

  toggleTabBookmark(id: string, pageNum: number) {
    state = {
      ...state,
      tabs: state.tabs.map((t) => {
        if (t.id !== id) return t;
        const exists = t.bookmarks.includes(pageNum);
        const bookmarks = exists
          ? t.bookmarks.filter((p) => p !== pageNum)
          : [...t.bookmarks, pageNum].sort((a, b) => a - b);
        return { ...t, bookmarks };
      }),
    };
    notify();
  },
};

if (typeof window !== 'undefined') {
  (window as any).__tabStore = tabStore;
}

export function useTabStore() {
  const storeState = useSyncExternalStore(tabStore.subscribe, tabStore.getState);
  const activeTab = storeState.tabs.find((t) => t.id === storeState.activeTabId);
  const aliveTabs = storeState.tabs.filter(
    (t) => t.renderer !== null || t.id === storeState.activeTabId
  );

  return {
    tabs: storeState.tabs,
    activeTabId: storeState.activeTabId,
    activeTab,
    aliveTabs,
    addTab: tabStore.addTab.bind(tabStore),
    closeTab: tabStore.closeTab.bind(tabStore),
    setActiveTab: tabStore.setActiveTab.bind(tabStore),
    updateTab: tabStore.updateTab.bind(tabStore),
    updateActiveTab: tabStore.updateActiveTab.bind(tabStore),
    setTabScroll: tabStore.setTabScroll.bind(tabStore),
    setTabPage: tabStore.setTabPage.bind(tabStore),
    setTabScale: tabStore.setTabScale.bind(tabStore),
    setTabRotation: tabStore.setTabRotation.bind(tabStore),
    setTabDrawer: tabStore.setTabDrawer.bind(tabStore),
    toggleTabBookmark: tabStore.toggleTabBookmark.bind(tabStore),
  };
}
