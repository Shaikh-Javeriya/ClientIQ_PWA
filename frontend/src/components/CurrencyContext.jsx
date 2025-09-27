import React, { createContext, useContext, useState, useEffect } from "react";

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
    const [currency, setCurrency] = useState("USD");
    const [locale, setLocale] = useState("en-US");

    // Load saved settings from localStorage
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
        <CurrencyContext.Provider value={{ currency, locale, updateSettings }}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = () => useContext(CurrencyContext);