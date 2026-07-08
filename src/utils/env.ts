export const isWeCom = () => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('wxwork');
};