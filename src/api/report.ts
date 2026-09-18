import request from '../utils/request'


export function getMonthlySummary(startDate: string, endDate: string) {
  return request({
    url: '/api/app/report/monthly-summary',
    method: 'get',
    params: { startDate, endDate }
  })
}

export function getDepartmentChart(params: any) {
  return request({
    url: '/api/app/report/department-chart',
    method: 'get',
    params
  })
}

export function getDepartmentTable(params: any) {
  return request({
    url: '/api/app/report/department-table',
    method: 'get',
    params
  })
}
export const getUserCrossReportApi = (params: any) => {
  return request.get('/api/app/report/user-cross-report', { params });
};

export function exportDepartmentTable(params: any) {
  return request({
    url: '/api/app/report/export-department-table',
    method: 'get',
    params
  })
}

export function getUnsubmittedUsers(params: { queryDate: string; departmentId?: string }) {
  return request({
    url: '/api/app/report/unsubmitted-users',
    method: 'get',
    params
  })
}

export function getLaborSummaryReport(params: any) {
  return request({
    url: '/api/app/report/labor-summary-report',
    method: 'get',
    params
  });
}

// 导出文件接口，必须指定 responseType: 'blob'
export function exportLaborSummaryReport(params: any) {
  return request({
    url: '/api/app/report/export-labor-summary-report',
    method: 'get',
    params,
    responseType: 'blob'
  });
}

export function exportUserCrossReportApi(params: any) {
  return request({
    url: '/api/app/report/export-user-cross-report',
    method: 'get',
    params,
    responseType: 'blob'
  });
}