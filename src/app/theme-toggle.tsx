'use client';

import { useState, useEffect, useRef } from 'react';
import { PencilIcon } from '@heroicons/react/outline';

interface ThemeToggleProps {
  buttonClassName?: string;
  menuClassName?: string;
}

export default function ThemeToggle({
  buttonClassName = '',
  menuClassName = '',
}: ThemeToggleProps) {
  const [theme, setTheme] = useState('light');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme) {
        setTheme(storedTheme);
      }
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    }
  }, [theme, mounted]);

  const handleThemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTheme = event.target.value;
    if (newTheme !== theme) {
      setTheme(newTheme);
      localStorage.setItem('theme', newTheme);
    }
    setDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setDropdownOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        tabIndex={0}
        onClick={toggleDropdown}
        className={buttonClassName || 'inline-flex items-center gap-2'}
        aria-label="Themes"
        aria-expanded={dropdownOpen}
      >
        <PencilIcon className="h-4 w-4 shrink-0" />
        <span>Themes</span>
      </button>
      {dropdownOpen && (
        <ul
          tabIndex={0}
          className={`absolute right-0 top-full z-10 mt-2 w-52 rounded-box bg-base-100 p-2 shadow ${menuClassName}`}
        >
          <li>
            <label className="cursor-pointer">
              <input
                type="radio"
                name="theme-dropdown"
                className="radio"
                value="light"
                checked={theme === 'light'}
                onChange={handleThemeChange}
              />
              Light
            </label>
          </li>
          <li>
            <label className="cursor-pointer">
              <input
                type="radio"
                name="theme-dropdown"
                className="radio"
                value="dark"
                checked={theme === 'dark'}
                onChange={handleThemeChange}
              />
              Dark
            </label>
          </li>
          <li>
            <label className="cursor-pointer">
              <input
                type="radio"
                name="theme-dropdown"
                className="radio"
                value="cupcake"
                checked={theme === 'cupcake'}
                onChange={handleThemeChange}
              />
              Cupcake
            </label>
          </li>
          <li>
            <label className="cursor-pointer">
              <input
                type="radio"
                name="theme-dropdown"
                className="radio"
                value="forest"
                checked={theme === 'forest'}
                onChange={handleThemeChange}
              />
              Forest
            </label>
          </li>
          <li>
            <label className="cursor-pointer">
              <input
                type="radio"
                name="theme-dropdown"
                className="radio"
                value="valentine"
                checked={theme === 'valentine'}
                onChange={handleThemeChange}
              />
              Valentine
            </label>
          </li>
          <li>
            <label className="cursor-pointer">
              <input
                type="radio"
                name="theme-dropdown"
                className="radio"
                value="dracula"
                checked={theme === 'dracula'}
                onChange={handleThemeChange}
              />
              Dracula
            </label>
          </li>
          <li>
            <label className="cursor-pointer">
              <input
                type="radio"
                name="theme-dropdown"
                className="radio"
                value="night"
                checked={theme === 'night'}
                onChange={handleThemeChange}
              />
              Night
            </label>
          </li>
          <li>
            <label className="cursor-pointer">
              <input
                type="radio"
                name="theme-dropdown"
                className="radio"
                value="coffee"
                checked={theme === 'coffee'}
                onChange={handleThemeChange}
              />
              Coffee
            </label>
          </li>
          <li>
            <label className="cursor-pointer">
              <input
                type="radio"
                name="theme-dropdown"
                className="radio"
                value="corporate"
                checked={theme === 'corporate'}
                onChange={handleThemeChange}
              />
              Corporate
            </label>
          </li>
          <li>
            <label className="cursor-pointer">
              <input
                type="radio"
                name="theme-dropdown"
                className="radio"
                value="winter"
                checked={theme === 'winter'}
                onChange={handleThemeChange}
              />
              Winter
            </label>
          </li>
        </ul>
      )}
    </div>
  );
}
