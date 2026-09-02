window.dataLayer = window.dataLayer || [];

export const trackEvent = (eventName, parameters = {}) => {
  window.dataLayer.push({
    event: eventName,
    ...parameters,
  });
};