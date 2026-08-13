import { create } from 'zustand';
import React from 'react';

export interface ContextMenuItem {
  id?: string;
  label?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
  onClick?: () => void;
  submenu?: ContextMenuItem[];
}

interface ContextMenuStore {
  isOpen: boolean;
  x: number;
  y: number;
  title?: string;
  items: ContextMenuItem[];
  activeSubmenuIndex: number | null;
  openContextMenu: (
    e: React.MouseEvent | MouseEvent,
    items: ContextMenuItem[],
    title?: string
  ) => void;
  closeContextMenu: () => void;
  setActiveSubmenuIndex: (index: number | null) => void;
}

export const useContextMenuStore = create<ContextMenuStore>((set) => ({
  isOpen: false,
  x: 0,
  y: 0,
  title: undefined,
  items: [],
  activeSubmenuIndex: null,

  openContextMenu: (e, items, title) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }

    const clientX = 'clientX' in e ? e.clientX : 0;
    const clientY = 'clientY' in e ? e.clientY : 0;

    set({
      isOpen: true,
      x: clientX,
      y: clientY,
      title,
      items,
      activeSubmenuIndex: null,
    });
  },

  closeContextMenu: () => {
    set({
      isOpen: false,
      items: [],
      title: undefined,
      activeSubmenuIndex: null,
    });
  },

  setActiveSubmenuIndex: (index) => set({ activeSubmenuIndex: index }),
}));
