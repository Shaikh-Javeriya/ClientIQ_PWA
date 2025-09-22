import React, { useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { Button } from './ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { useTheme } from './ThemeProvider';

const ThemeSelector = () => {
  const [open, setOpen] = useState(false);
  const { currentTheme, themes, switchTheme } = useTheme();

  const handleThemeChange = (themeKey) => {
    switchTheme(themeKey);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center space-x-2"
        >
          <Palette className="w-4 h-4" />
          <span>Theme</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="end">
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-gray-900 mb-3">
            Choose Theme
          </h3>
          
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(themes).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => handleThemeChange(key)}
                className={`
                  flex items-center justify-between p-3 rounded-lg border-2 transition-all duration-200
                  ${currentTheme === key 
                    ? 'border-blue-300 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                    style={{ 
                      background: theme.colors.gradient 
                    }}
                  />
                  <span className="text-sm font-medium text-gray-900">
                    {theme.name}
                  </span>
                </div>
                
                {currentTheme === key && (
                  <Check className="w-4 h-4 text-blue-600" />
                )}
              </button>
            ))}
          </div>
          
          <div className="pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Theme colors will apply to charts, buttons, and gradients throughout the dashboard.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ThemeSelector;