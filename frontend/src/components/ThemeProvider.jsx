import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const themes = {
  blue: {
    name: 'Blue Gradient',
    value: 'blue',
    colors: {
      light: '#60A5FA',
      medium: '#3B82F6',
      dark: '#1E3A8A',
      gradient: 'linear-gradient(90deg, #60A5FA 0%, #1E3A8A 100%)'
    }
  },
  green: {
    name: 'Green Gradient',
    value: 'green',
    colors: {
      light: '#86EFAC',
      medium: '#34D399',
      dark: '#047857',
      gradient: 'linear-gradient(90deg, #86EFAC 0%, #047857 100%)'
    }
  },
  purple: {
    name: 'Purple Gradient',
    value: 'purple',
    colors: {
      light: '#E9D5FF',
      medium: '#A78BFA',
      dark: '#6D28D9',
      gradient: 'linear-gradient(90deg, #E9D5FF 0%, #6D28D9 100%)'
    }
  },
  teal: {
    name: 'Teal Gradient',
    value: 'teal',
    colors: {
      light: '#99F6E4',
      medium: '#2DD4BF',
      dark: '#0F766E',
      gradient: 'linear-gradient(90deg, #99F6E4 0%, #0F766E 100%)'
    }
  }
};

const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('blue');

  useEffect(() => {
    const savedTheme = localStorage.getItem('dashboard_theme');
    if (savedTheme && themes[savedTheme]) {
      setCurrentTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('dashboard_theme', currentTheme);
  }, [currentTheme]);

  const switchTheme = (themeKey) => {
    if (themes[themeKey]) {
      setCurrentTheme(themeKey);
    }
  };

  const getThemeColors = () => {
    return themes[currentTheme].colors;
  };

  const value = {
    currentTheme,
    themes,
    switchTheme,
    getThemeColors,
    themeConfig: themes[currentTheme]
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;