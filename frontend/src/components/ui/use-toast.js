import { useState, useCallback } from 'react';

// Simple toast hook implementation with better UX
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ title, description, variant = 'default' }) => {
    const message = description ? `${title}: ${description}` : title;
    
    if (variant === 'destructive') {
      console.error(message);
      // Show error in console and as simple notification
      if (window.confirm) {
        setTimeout(() => {
          alert(`❌ ${message}`);
        }, 100);
      }
    } else {
      console.log(message);
      // Show success message
      setTimeout(() => {
        alert(`✅ ${message}`);
      }, 100);
    }
  }, []);

  return { toast, toasts };
};