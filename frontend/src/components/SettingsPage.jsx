import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Palette, 
  DollarSign, 
  Calculator,
  Globe,
  Moon,
  Sun,
  Save
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { useTheme } from './ThemeProvider';
import { useToast } from './ui/use-toast';

const SettingsPage = ({ user }) => {
  const { currentTheme, themes, switchTheme } = useTheme();
  const { toast } = useToast();

  // Settings state
  const [settings, setSettings] = useState({
    // Margin Thresholds
    lowMarginThreshold: 15,
    highMarginThreshold: 30,
    
    // Overhead Allocation
    overheadMethod: 'percentage', // 'percentage' or 'fixed'
    overheadValue: 25,
    
    // Currency & Locale
    currency: 'USD',
    locale: 'en-US'
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('dashboard_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
        // Apply dark mode immediately if it was saved
        if (parsed.darkMode) {
          applyDarkMode(parsed.darkMode);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  const handleSaveSettings = () => {
    try {
      localStorage.setItem('dashboard_settings', JSON.stringify(settings));
      setHasChanges(false);
      
      // Apply dark mode immediately
      applyDarkMode(settings.darkMode);
      
      toast({
        title: "Settings Saved",
        description: "Your preferences have been saved successfully",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  // Dark mode functionality removed

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' }
  ];

  const locales = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'de-DE', name: 'German' },
    { code: 'fr-FR', name: 'French' },
    { code: 'es-ES', name: 'Spanish' },
    { code: 'ja-JP', name: 'Japanese' }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Customize your dashboard experience</p>
        </div>
        {hasChanges && (
          <Button onClick={handleSaveSettings} className="btn-primary">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Theme Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Palette className="w-5 h-5" />
              <span>Theme & Appearance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Theme Presets */}
            <div>
              <Label className="text-base font-medium">Theme Presets</Label>
              <p className="text-sm text-gray-600 mb-4">Choose your preferred gradient theme</p>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(themes).map(([key, theme]) => (
                  <button
                    key={key}
                    onClick={() => switchTheme(key)}
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
                        style={{ background: theme.colors.gradient }}
                      />
                      <span className="text-sm font-medium">{theme.name}</span>
                    </div>
                    {currentTheme === key && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Dark Mode */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {settings.darkMode ? (
                  <Moon className="w-5 h-5 text-gray-600" />
                ) : (
                  <Sun className="w-5 h-5 text-gray-600" />
                )}
                <div>
                  <Label className="text-base font-medium">Dark Mode</Label>
                  <p className="text-sm text-gray-600">Switch to dark background theme</p>
                </div>
              </div>
              <Switch
                checked={settings.darkMode}
                onCheckedChange={(checked) => handleSettingChange('darkMode', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Profitability Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calculator className="w-5 h-5" />
              <span>Profitability Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Margin Thresholds */}
            <div>
              <Label className="text-base font-medium">Margin Thresholds</Label>
              <p className="text-sm text-gray-600 mb-4">Set thresholds for profit margin color coding</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lowMargin">Low Margin (%) <span className="text-red-600">●</span></Label>
                  <Input
                    id="lowMargin"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.lowMarginThreshold}
                    onChange={(e) => handleSettingChange('lowMarginThreshold', parseInt(e.target.value) || 0)}
                    placeholder="15"
                  />
                  <p className="text-xs text-gray-500 mt-1">Below this percentage</p>
                </div>
                <div>
                  <Label htmlFor="highMargin">High Margin (%) <span className="text-green-600">●</span></Label>
                  <Input
                    id="highMargin"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.highMarginThreshold}
                    onChange={(e) => handleSettingChange('highMarginThreshold', parseInt(e.target.value) || 0)}
                    placeholder="30"
                  />
                  <p className="text-xs text-gray-500 mt-1">Above this percentage</p>
                </div>
              </div>
            </div>

            {/* Overhead Allocation */}
            <div>
              <Label className="text-base font-medium">Overhead Allocation</Label>
              <p className="text-sm text-gray-600 mb-4">How should overhead costs be calculated?</p>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="percentage"
                    name="overheadMethod"
                    value="percentage"
                    checked={settings.overheadMethod === 'percentage'}
                    onChange={(e) => handleSettingChange('overheadMethod', e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <Label htmlFor="percentage">Percentage of Revenue</Label>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="fixed"
                    name="overheadMethod"
                    value="fixed"
                    checked={settings.overheadMethod === 'fixed'}
                    onChange={(e) => handleSettingChange('overheadMethod', e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <Label htmlFor="fixed">Fixed Amount per Project</Label>
                </div>
                <div className="ml-7">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={settings.overheadValue}
                    onChange={(e) => handleSettingChange('overheadValue', parseFloat(e.target.value) || 0)}
                    placeholder={settings.overheadMethod === 'percentage' ? '25' : '1000'}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {settings.overheadMethod === 'percentage' ? '% of total revenue' : 'Fixed amount in your currency'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Currency & Locale */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="w-5 h-5" />
              <span>Currency & Locale</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select 
                value={settings.currency} 
                onValueChange={(value) => handleSettingChange('currency', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map(currency => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="locale">Number Format</Label>
              <Select 
                value={settings.locale} 
                onValueChange={(value) => handleSettingChange('locale', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select locale" />
                </SelectTrigger>
                <SelectContent>
                  {locales.map(locale => (
                    <SelectItem key={locale.code} value={locale.code}>
                      {locale.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <Label className="text-sm font-medium">Preview</Label>
              <p className="text-sm text-gray-600 mt-1">
                {new Intl.NumberFormat(settings.locale, {
                  style: 'currency',
                  currency: settings.currency
                }).format(123456.78)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Account Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={user.name} disabled className="bg-gray-50" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={user.email} disabled className="bg-gray-50" />
            </div>
            <div>
              <Label>Account Created</Label>
              <Input 
                value={new Date(user.created_at).toLocaleDateString()} 
                disabled 
                className="bg-gray-50" 
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button at Bottom */}
      {hasChanges && (
        <div className="flex justify-center pt-8 border-t">
          <Button onClick={handleSaveSettings} className="btn-primary px-8">
            <Save className="w-4 h-4 mr-2" />
            Save All Changes
          </Button>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;