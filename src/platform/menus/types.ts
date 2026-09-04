import React from 'react';

/**
 * Application menu model.
 *
 * Applications describe their menus declaratively and the shell renders them
 * in the window title bar, so every app gets the same menu behaviour,
 * keyboard handling and theming without reimplementing a dropdown.
 */

export interface MenuAction {
  kind?: 'action';
  id: string;
  label: string;
  /** Displayed on the right, e.g. "Ctrl+S". Purely informational. */
  shortcut?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  disabled?: boolean;
  /** Renders a tick; use for togglable state. */
  checked?: boolean;
  /** Marks the item as a radio choice within its group. */
  selected?: boolean;
  danger?: boolean;
  onSelect: () => void;
}

export interface MenuSubmenu {
  kind: 'submenu';
  id: string;
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  disabled?: boolean;
  items: MenuItem[];
}

export interface MenuSeparator {
  kind: 'separator';
  id?: string;
}

/** A non-interactive heading inside a menu, as used for grouping. */
export interface MenuHeading {
  kind: 'heading';
  id?: string;
  label: string;
}

export type MenuItem = MenuAction | MenuSubmenu | MenuSeparator | MenuHeading;

export interface Menu {
  id: string;
  label: string;
  items: MenuItem[];
}

export function isSeparator(item: MenuItem): item is MenuSeparator {
  return (item as MenuSeparator).kind === 'separator';
}

export function isHeading(item: MenuItem): item is MenuHeading {
  return (item as MenuHeading).kind === 'heading';
}

export function isSubmenu(item: MenuItem): item is MenuSubmenu {
  return (item as MenuSubmenu).kind === 'submenu';
}

export function isAction(item: MenuItem): item is MenuAction {
  return !isSeparator(item) && !isHeading(item) && !isSubmenu(item);
}

/** Convenience builders, so app menu definitions stay readable. */
export const separator = (id?: string): MenuSeparator => ({ kind: 'separator', id });
export const heading = (label: string, id?: string): MenuHeading => ({ kind: 'heading', label, id });
