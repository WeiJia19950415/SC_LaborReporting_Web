import request from '../utils/request';

// 获取列表 (支持分页和排序)
export const getProductSeriesList = (params: any) => {
  return request.get('/api/app/product-series', { params });
};

// 新增
export const createProductSeries = (data: any) => {
  return request.post('/api/app/product-series', data);
};

// 修改
export const updateProductSeries = (id: string, data: any) => {
  return request.put(`/api/app/product-series/${id}`, data);
};

// 删除
export const deleteProductSeries = (id: string) => {
  return request.delete(`/api/app/product-series/${id}`);
};