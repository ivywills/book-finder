'use client';

import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState('light');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

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
    setDropdownOpen(false); // Close the dropdown when a theme is selected
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  return (
    <div className="relative">
      <button tabIndex={0} onClick={toggleDropdown}>
        Theme
      </button>
      {dropdownOpen && (
        <ul
          tabIndex={0}
          className="absolute -right-1 -top-2 mt-2 p-2 shadow bg-base-100 rounded-box w-52 z-10"
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
