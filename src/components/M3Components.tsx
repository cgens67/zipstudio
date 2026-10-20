/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

/**
 * Google Material Symbols Rounded Icon with FILL 1
 * Strictly satisfies: "If you use Google Material Icons/Material Symbols, you MUST use the rounded filled version."
 */
export function M3Icon({
  name,
  className = '',
  size = 20,
}: {
  name: string;
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={`material-symbols-rounded select-none ${className}`}
      style={{
        fontSize: `${size}px`,
        fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

export interface M3ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'tonal' | 'outlined' | 'text' | 'danger';
  icon?: string;
  iconEnd?: string;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

// Register Material 3 Web Components from Material ESM / @material/web
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/elevated-button.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/ripple/ripple.js';

export function M3Button({
  children,
  variant = 'filled',
  icon,
  iconEnd,
  size = 'md',
  loading = false,
  className = '',
  disabled,
  ...props
}: M3ButtonProps) {
  const baseClasses =
    'm3-morph-btn inline-flex items-center justify-center font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeClasses = {
    sm: 'text-xs px-3.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  }[size];

  const variantClasses = {
    filled: 'bg-[#a8c7fa] text-[#003062] hover:bg-[#c2e7ff] hover:shadow-md active:bg-[#a8c7fa]',
    tonal: 'bg-[#2b2d30] text-[#e2e2e6] hover:bg-[#383a3e] border border-[#43474e]/40',
    outlined: 'bg-transparent text-[#a8c7fa] border border-[#43474e] hover:bg-[#a8c7fa]/10 hover:border-[#a8c7fa]',
    text: 'bg-transparent text-[#a8c7fa] hover:bg-[#a8c7fa]/10',
    danger: 'bg-[#ffb4ab] text-[#690005] hover:bg-[#ffdad6] active:bg-[#ffb4ab]',
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon ? (
        <M3Icon name={icon} size={size === 'sm' ? 16 : size === 'lg' ? 22 : 18} />
      ) : null}
      <span>{children}</span>
      {!loading && iconEnd && (
        <M3Icon name={iconEnd} size={size === 'sm' ? 16 : size === 'lg' ? 22 : 18} />
      )}
    </button>
  );
}

export interface M3IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'standard' | 'filled' | 'tonal' | 'outlined';
  label: string;
}

export function M3IconButton({
  icon,
  size = 'md',
  variant = 'standard',
  label,
  className = '',
  disabled,
  ...props
}: M3IconButtonProps) {
  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  }[size];

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  }[size];

  const variantClasses = {
    standard: 'text-[#c4c6d0] hover:text-white hover:bg-white/10 active:bg-white/15',
    filled: 'bg-[#a8c7fa] text-[#003062] hover:bg-[#c2e7ff]',
    tonal: 'bg-[#2b2d30] text-[#e2e2e6] hover:bg-[#383a3e]',
    outlined: 'border border-[#43474e] text-[#e2e2e6] hover:bg-white/5',
  }[variant];

  return (
    <button
      aria-label={label}
      title={label}
      className={`m3-icon-morph-btn inline-flex items-center justify-center cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      <M3Icon name={icon} size={iconSizes} />
    </button>
  );
}

export function M3Badge({
  children,
  variant = 'primary',
  className = '',
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  className?: string;
}) {
  const colorClasses = {
    primary: 'bg-[#00468b] text-[#d6e3ff] border border-[#a8c7fa]/30',
    secondary: 'bg-[#2b2d30] text-[#c4c6d0] border border-[#43474e]',
    success: 'bg-[#0f5223] text-[#b4f3b7] border border-[#308745]',
    warning: 'bg-[#5b3f00] text-[#ffdf9e] border border-[#9b6f00]',
    error: 'bg-[#690005] text-[#ffdad6] border border-[#ba1a1a]',
  }[variant];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses} ${className}`}
    >
      {children}
    </span>
  );
}

export function M3Card({
  children,
  className = '',
  elevation = 1,
}: {
  children: React.ReactNode;
  className?: string;
  elevation?: 1 | 2 | 3;
}) {
  const elevClass = `m3-elevation-${elevation}`;
  return (
    <div
      className={`bg-[#1e1f22] border border-[#43474e]/60 rounded-2xl ${elevClass} ${className}`}
    >
      {children}
    </div>
  );
}
