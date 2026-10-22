/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import 'material/switch/switch.js';

// JSX augmentation for React 18 & 19 TypeScript support of <md-switch>
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'md-switch': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        selected?: boolean;
        disabled?: boolean;
        icons?: boolean;
        'show-only-selected-icon'?: boolean;
        value?: string;
      };
    }
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'md-switch': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        selected?: boolean;
        disabled?: boolean;
        icons?: boolean;
        'show-only-selected-icon'?: boolean;
        value?: string;
      };
    }
  }
}

export interface M3SwitchProps {
  selected: boolean;
  onChange: (selected: boolean) => void;
  disabled?: boolean;
  icons?: boolean;
  label?: React.ReactNode;
  sublabel?: React.ReactNode;
  className?: string;
  id?: string;
}

/**
 * Material Design 3 Expressive Switch Component
 * Powered by https://github.com/material-esm/material web components.
 */
export function M3Switch({
  selected,
  onChange,
  disabled = false,
  icons = true,
  label,
  sublabel,
  className = '',
  id,
}: M3SwitchProps) {
  const switchRef = useRef<HTMLElement | null>(null);

  // Synchronize the web component's DOM property
  useEffect(() => {
    const el = switchRef.current as any;
    if (el) {
      if (el.selected !== selected) {
        el.selected = selected;
      }
      if (el.disabled !== disabled) {
        el.disabled = disabled;
      }
      if (el.icons !== icons) {
        el.icons = icons;
      }
    }
  }, [selected, disabled, icons]);

  // Listen to native change event from <md-switch>
  useEffect(() => {
    const el = switchRef.current;
    if (!el) return;

    const handleChange = (e: Event) => {
      const target = e.target as any;
      if (target && typeof target.selected === 'boolean') {
        onChange(target.selected);
      }
    };

    el.addEventListener('change', handleChange);
    return () => {
      el.removeEventListener('change', handleChange);
    };
  }, [onChange]);

  const handleContainerClick = () => {
    if (disabled) return;
    onChange(!selected);
  };

  return (
    <div
      onClick={label ? handleContainerClick : undefined}
      className={`inline-flex items-center gap-3 select-none ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
    >
      <md-switch
        ref={switchRef}
        id={id}
        selected={selected}
        disabled={disabled}
        icons={icons}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        style={{
          // MD3 custom properties styling for dark theme consistency
          ['--md-sys-color-primary' as any]: '#a8c7fa',
          ['--md-sys-color-on-primary' as any]: '#003062',
          ['--md-sys-color-primary-container' as any]: '#00468b',
          ['--md-sys-color-on-primary-container' as any]: '#d6e3ff',
          ['--md-sys-color-surface' as any]: '#1e1f22',
          ['--md-sys-color-surface-container-highest' as any]: '#2b2d30',
          ['--md-sys-color-outline' as any]: '#8e9199',

          // Selected interaction tokens (never purple #6750a4 on hold/press)
          ['--md-switch-selected-handle-color' as any]: '#003062',
          ['--md-switch-selected-hover-handle-color' as any]: '#00224a',
          ['--md-switch-selected-focus-handle-color' as any]: '#003062',
          ['--md-switch-selected-pressed-handle-color' as any]: '#001d3d',

          ['--md-switch-selected-track-color' as any]: '#a8c7fa',
          ['--md-switch-selected-focus-track-color' as any]: '#a8c7fa',
          ['--md-switch-selected-hover-track-color' as any]: '#c2e7ff',
          ['--md-switch-selected-pressed-track-color' as any]: '#79aef7',

          ['--md-switch-selected-icon-color' as any]: '#003062',
          ['--md-switch-selected-hover-icon-color' as any]: '#00224a',
          ['--md-switch-selected-focus-icon-color' as any]: '#003062',
          ['--md-switch-selected-pressed-icon-color' as any]: '#001d3d',

          // Unselected interaction tokens
          ['--md-switch-unselected-track-color' as any]: '#2b2d30',
          ['--md-switch-unselected-focus-track-color' as any]: '#383a3e',
          ['--md-switch-unselected-hover-track-color' as any]: '#383a3e',
          ['--md-switch-unselected-pressed-track-color' as any]: '#43474e',

          ['--md-switch-unselected-handle-color' as any]: '#8e9199',
          ['--md-switch-unselected-hover-handle-color' as any]: '#c4c6d0',
          ['--md-switch-unselected-focus-handle-color' as any]: '#c4c6d0',
          ['--md-switch-unselected-pressed-handle-color' as any]: '#e2e2e6',

          ['--md-switch-unselected-icon-color' as any]: '#1e1f22',
          ['--md-switch-unselected-hover-icon-color' as any]: '#1e1f22',
          ['--md-switch-unselected-focus-icon-color' as any]: '#1e1f22',
          ['--md-switch-unselected-pressed-icon-color' as any]: '#1e1f22',

          // Ripple tokens on hold/press
          ['--md-switch-selected-ripple-color' as any]: '#a8c7fa',
          ['--md-switch-unselected-ripple-color' as any]: '#8e9199',
          ['--md-ripple-hover-color' as any]: '#a8c7fa',
          ['--md-ripple-pressed-color' as any]: '#a8c7fa',
          ['--md-ripple-focus-color' as any]: '#a8c7fa',
        }}
      />

      {(label || sublabel) && (
        <div className="flex flex-col text-left">
          {label && <span className="text-xs font-medium text-[#e2e2e6]">{label}</span>}
          {sublabel && <span className="text-[11px] text-[#8e9199]">{sublabel}</span>}
        </div>
      )}
    </div>
  );
}
