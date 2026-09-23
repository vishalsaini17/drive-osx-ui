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

/**
 * An escape hatch for menu content that isn't a row of text — a table
 * size grid, a color swatch picker, anything with its own interaction
 * model. `render` gets the enclosing panel's `onClose` so it can end the
 * whole dropdown itself once the user has actually picked something,
 * the same way a regular action item closes on `onSelect`.
 */
export interface MenuCustom {
  kind: 'custom';
  id: string;
  render: (ctx: { onClose: () => void }) => React.ReactNode;
}

export type MenuItem = MenuAction | MenuSubmenu | MenuSeparator | MenuHeading | MenuCustom;

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

export function isCustom(item: MenuItem): item is MenuCustom {
  return (item as MenuCustom).kind === 'custom';
}

export function isAction(item: MenuItem): item is MenuAction {
  return !isSeparator(item) && !isHeading(item) && !isSubmenu(item) && !isCustom(item);
}

/** Convenience builders, so app menu definitions stay readable. */
export const separator = (id?: string): MenuSeparator => ({ kind: 'separator', id });
export const heading = (label: string, id?: string): MenuHeading => ({ kind: 'heading', label, id });
