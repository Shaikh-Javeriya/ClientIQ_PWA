import { useState } from 'react';

// Simple toast hook implementation
export const useToast = () => {
  const toast = ({ title, description, variant = 'default' }) => {
    // For now, we'll use a simple alert
    // In production, you'd want to use a proper toast library like react-hot-toast or sonner
    const message = description ? `${title}: ${description}` : title;
    
    if (variant === 'destructive') {
      console.error(message);
      alert(`Error: ${message}`);
    } else {
      console.log(message);
      alert(message);
    }
  };

  return { toast };
};