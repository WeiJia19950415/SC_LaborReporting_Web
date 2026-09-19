export function isWeComOrMobile(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  // 检测企业微信 (wxwork) 或 移动端设备
  const isWxWork = ua.indexOf('wxwork') !== -1;
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  return isWxWork || isMobile;
}