import React from 'react';

const TrackedButton = ({ 
  children, 
  onClick, 
  id, 
  className, 
  eventName = 'ui_button_click',
  ...props 
}) => {

  const handleClick = (event) => {
    console.log("🛠 [TrackedButton] Клик зафиксирован!", { id, eventName });

    try {
      // Безопасное извлечение текста, чтобы код точно не упал
      let buttonText = props['aria-label'] || 'icon_or_complex_button';
      if (typeof children === 'string' || typeof children === 'number') {
        buttonText = String(children);
      }

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: eventName,
        button_text: buttonText.trim(),
        button_id: id || 'no_id',
        button_classes: className || 'no_class'
      });
      console.log("✅ [TrackedButton] Данные успешно отправлены в dataLayer!");
      
    } catch (error) {
      console.error("❌ [TrackedButton] Ошибка при пуше в GTM:", error);
    }

    if (onClick) {
      onClick(event);
    }
  };

  return (
    <button 
      id={id} 
      className={className} 
      onClick={handleClick} 
      {...props}
    >
      {children}
    </button>
  );
};

export default TrackedButton;