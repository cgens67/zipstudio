/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useId } from 'react';
import { M3Icon } from './M3Components';

export interface DropdownOption<T = string> {
  value: T;
  label: string;
  sublabel?: string;
  icon?: string;
  iconColor?: string;
  disabled?: boolean;
}

export interface M3DropdownProps<T = string> {
  options: DropdownOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  placeholder?: string;
  icon?: string;
  iconColor?: string;
  disabled?: boolean;
  className?: string;
  menuClassName?: string;
  searchable?: boolean;
  size?: 'sm' | 'md';
}

/**
 * Material Design 3 Expressive In-UI Dropdown / Select.
 * Completely eliminates native OS <select> popups, offering customized dark theme
 * styling, spring animations, search filtering, and keyboard navigation.
 */
export function M3Dropdown<T = string>({
  options,
  value,
  onChange,
  label,
  placeholder = 'Select option...',
  icon,
  iconColor = 'text-[#a8c7fa]',
  disabled = false,
  className = '',
  menuClassName = '',
  searchable = false,
  size = 'md',
}: M3DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dropdownId = useId();

  const selectedOption = options.find((opt) => opt.value === value);

  // Filter options if searchable
  const filteredOptions = searchable && searchQuery.trim()
    ? options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (opt.sublabel && opt.sublabel.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : options;

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, searchable]);

  // Reset search when closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < filteredOptions.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        const option = filteredOptions[highlightedIndex];
        if (!option.disabled) {
          onChange(option.value);
          setIsOpen(false);
        }
      }
    }
  };

  const isSmall = size === 'sm';

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={`relative inline-block text-left select-none ${className}`}
    >
      {label && (
        <label
          htmlFor={dropdownId}
          className="block text-[11px] font-semibold uppercase tracking-wider text-[#8e9199] mb-1"
        >
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        id={dropdownId}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border border-[#d8dae5] dark:border-[#43474e]/50 bg-[#f8fafd] dark:bg-[#1e1f22] text-left transition-all cursor-pointer ${
          isSmall ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs'
        } ${
          isOpen
            ? 'border-[#0b57d0] dark:border-[#a8c7fa] ring-1 ring-[#0b57d0]/30 dark:ring-[#a8c7fa]/30 bg-white dark:bg-[#2b2d30]'
            : 'hover:border-[#74777f] dark:hover:border-[#43474e] hover:bg-[#f0f4f9] dark:hover:bg-[#2b2d30]'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 truncate">
          {(selectedOption?.icon || icon) && (
            <M3Icon
              name={selectedOption?.icon || icon || ''}
              size={isSmall ? 15 : 16}
              className={`shrink-0 ${selectedOption?.iconColor || iconColor}`}
            />
          )}
          <span className={`truncate font-medium ${selectedOption ? 'text-[#191c20] dark:text-[#e2e2e6]' : 'text-[#5d6168] dark:text-[#8e9199]'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <M3Icon
          name="expand_more"
          size={isSmall ? 15 : 17}
          className={`text-[#5d6168] dark:text-[#8e9199] transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-[#0b57d0] dark:text-[#a8c7fa]' : ''
          }`}
        />
      </button>

      {/* In-UI Dropdown Popover */}
      {isOpen && (
        <div
          className={`absolute left-0 mt-1.5 w-full min-w-[180px] max-w-[340px] z-50 rounded-2xl bg-white dark:bg-[#1e1f22] border border-[#d8dae5] dark:border-[#43474e]/60 shadow-2xl p-1.5 m3-menu-spring ${menuClassName}`}
          style={{ maxHeight: '280px' }}
        >
          {/* Optional In-Menu Search Input */}
          {searchable && (
            <div className="p-1 mb-1 border-b border-[#d8dae5] dark:border-[#43474e]/30">
              <div className="flex items-center gap-1.5 bg-[#f0f2f8] dark:bg-[#121316] px-2 py-1 rounded-xl border border-[#d8dae5] dark:border-[#43474e]/40">
                <M3Icon name="search" size={14} className="text-[#5d6168] dark:text-[#8e9199]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter options..."
                  className="w-full bg-transparent text-xs text-[#191c20] dark:text-white placeholder-[#5d6168] dark:placeholder-[#8e9199] focus:outline-none font-mono"
                  onClick={(e) => e.stopPropagation()}
                />
                {searchQuery && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery('');
                    }}
                    className="text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-white cursor-pointer"
                  >
                    <M3Icon name="close" size={13} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div
            ref={listRef}
            role="listbox"
            className="overflow-y-auto max-h-[200px] space-y-0.5 pr-0.5 no-scrollbar"
          >
            {filteredOptions.length === 0 ? (
              <div className="py-3 px-3 text-center text-xs text-[#5d6168] dark:text-[#8e9199] italic">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt, index) => {
                const isSelected = opt.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={opt.disabled}
                    onClick={() => {
                      if (!opt.disabled) {
                        onChange(opt.value);
                        setIsOpen(false);
                      }
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      opt.disabled
                        ? 'opacity-30 cursor-not-allowed'
                        : isSelected
                        ? 'bg-[#d3e3fd] text-[#041e49] dark:bg-[#00468b]/40 dark:text-[#a8c7fa] font-semibold'
                        : isHighlighted
                        ? 'bg-[#e8ebf3] text-[#191c20] dark:bg-[#2b2d30] dark:text-white'
                        : 'text-[#191c20] dark:text-[#c4c6d0] hover:bg-[#f0f2f8] dark:hover:bg-[#2b2d30] hover:text-[#191c20] dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {opt.icon && (
                        <M3Icon
                          name={opt.icon}
                          size={15}
                          className={`shrink-0 ${opt.iconColor || 'text-[#0b57d0] dark:text-[#a8c7fa]'}`}
                        />
                      )}
                      <div className="flex flex-col truncate">
                        <span className="truncate">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="text-[10px] text-[#5d6168] dark:text-[#8e9199] font-normal truncate">
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <M3Icon name="check" size={15} className="text-[#a8c7fa] shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
