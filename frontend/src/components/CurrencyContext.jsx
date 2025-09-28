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

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        locale,
        setLocale,
        formatCurrency, // ✅ expose to all components
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
