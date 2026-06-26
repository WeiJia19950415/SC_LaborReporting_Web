import request from '../utils/request';

// 获取配置
export const getSystemConfigApi = () => {
  return request.get('/api/app/system-config/config');
};

// 更新配置 (给管理配置的页面用)
export const updateSystemConfigApi = (data: any) => {
  return request.put('/api/app/system-config/config', data);
};