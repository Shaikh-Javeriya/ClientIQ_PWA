import React, { createContext, useContext, useState, useEffect } from "react";

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState("USD");
  const [locale, setLocale] = useState("en-US");

  // ✅ Centralized formatter
  const formatCurrency = (value, options = {}) => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol", // 🔥 only $/¥/€ without country letters
      minimumFractionDigits: options.minFractionDigits ?? 0,
      notation: options.notation || "standard",
    }).format(value || 0);
  };

  useEffect(() => {
        const savedCurrency = localStorage.getItem("currency");
        const savedLocale = localStorage.getItem("locale");
        if (savedCurrency) setCurrency(savedCurrency);
        if (savedLocale) setLocale(savedLocale);
    }, []);
  
  const updateSettings = (newCurrency, newLocale) => {
        setCurrency(newCurrency);
        setLocale(newLocale);
        localStorage.setItem("currency", newCurrency);
        localStorage.setItem("locale", newLocale);
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        locale,
        setLocale,
        formatCurrency,
        updateSettings,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);

