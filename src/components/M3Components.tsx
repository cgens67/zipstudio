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
    filled:
      'bg-[#0b57d0] text-white hover:bg-[#0842a0] hover:shadow-md active:bg-[#063380] dark:bg-[#a8c7fa] dark:text-[#003062] dark:hover:bg-[#c2e7ff] dark:active:bg-[#a8c7fa]',
    tonal:
      'bg-[#f0f2f8] text-[#191c20] hover:bg-[#e4e7ef] border border-[#d8dae5] dark:bg-[#2b2d30] dark:text-[#e2e2e6] dark:hover:bg-[#383a3e] dark:border-[#43474e]/40',
    outlined:
      'bg-transparent text-[#0b57d0] border border-[#d8dae5] hover:bg-[#0b57d0]/10 hover:border-[#0b57d0] dark:text-[#a8c7fa] dark:border-[#43474e] dark:hover:bg-[#a8c7fa]/10 dark:hover:border-[#a8c7fa]',
    text: 'bg-transparent text-[#0b57d0] hover:bg-[#0b57d0]/10 dark:text-[#a8c7fa] dark:hover:bg-[#a8c7fa]/10',
    danger:
      'bg-[#ba1a1a] text-white hover:bg-[#93000a] dark:bg-[#ffb4ab] dark:text-[#690005] dark:hover:bg-[#ffdad6]',
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
    standard:
      'text-[#5d6168] hover:text-[#191c20] hover:bg-black/5 active:bg-black/10 dark:text-[#c4c6d0] dark:hover:text-white dark:hover:bg-white/10 dark:active:bg-white/15',
    filled: 'bg-[#0b57d0] text-white hover:bg-[#0842a0] dark:bg-[#a8c7fa] dark:text-[#003062] dark:hover:bg-[#c2e7ff]',
    tonal: 'bg-[#f0f2f8] text-[#191c20] hover:bg-[#e4e7ef] dark:bg-[#2b2d30] dark:text-[#e2e2e6] dark:hover:bg-[#383a3e]',
    outlined: 'border border-[#d8dae5] text-[#191c20] hover:bg-black/5 dark:border-[#43474e] dark:text-[#e2e2e6] dark:hover:bg-white/5',
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
    primary:
      'bg-[#d3e3fd] text-[#041e49] border border-[#0b57d0]/20 dark:bg-[#00468b] dark:text-[#d6e3ff] dark:border-[#a8c7fa]/30',
    secondary:
      'bg-[#f0f2f8] text-[#191c20] border border-[#d8dae5] dark:bg-[#2b2d30] dark:text-[#c4c6d0] dark:border-[#43474e]',
    success:
      'bg-[#c4eed0] text-[#072711] border border-[#1b873f]/20 dark:bg-[#0f5223] dark:text-[#b4f3b7] dark:border-[#308745]',
    warning:
      'bg-[#ffdf99] text-[#261900] border border-[#7e5700]/20 dark:bg-[#5b3f00] dark:text-[#ffdf9e] dark:border-[#9b6f00]',
    error:
      'bg-[#ffdad6] text-[#410002] border border-[#ba1a1a]/20 dark:bg-[#690005] dark:text-[#ffdad6] dark:border-[#ba1a1a]',
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

export { M3Switch } from './M3Switch';

