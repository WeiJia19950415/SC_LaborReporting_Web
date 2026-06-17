import request from '../utils/request'

// 单条报工明细的类型
export interface LaborReportDetailItem {
  id?: string | null;            // 明细ID（新增时为空，修改时必传）
  laborClass: number;            // 工时类别：1项目，2其他
  projectId?: string | null;     // 项目ID
  projectCode?: string;          // 项目编号
  projectName?: string;          // 项目名称
  projectRoleId?: string | null; // 项目角色ID
  projectRoleName?: string;      // 项目角色名称
  laborCategoryId: string;       // 任务分类ID
  laborCategoryCode: string;     // 任务分类Code
  hours: number;                 // 发生工时
  jobresponsibilities: string;   // 工作内容简述
}

// 保存单日工时报表的入参类型
export interface SaveDailyLaborReportParams {
  reporterId?: string | null;    // 提报人ID (如果不传，后端会自动获取当前登录人)
  departmentId?: string | null;  // 部门ID
  reportDate: string;            // 提报日期 (例如: "2026-06-16")
  details: LaborReportDetailItem[]; // 当天的明细列表
}

export interface CreateLaborReportDto {
  reporterId: string
  departmentId: string
  reportDate: string 
  details: CreateLaborReportDetailDto[]
}

export interface CreateLaborReportDetailDto {
  laborCategoryId: string
  laborCategoryCode: string
  projectId?: string | null
  hours: number
  jobresponsibilities: string
}

export interface UpdateLaborReportDetailDto {
  laborCategoryId: string
  laborCategoryCode: string
  projectId?: string | null
  hours: number
  jobresponsibilities: string
}

export function createLaborReport(data: CreateLaborReportDto) {
  return request({
    url: '/api/app/labor-report',
    method: 'post',
    data
  })
}


export function getLaborReports(params?: any) {
  return request({
    url: '/api/app/labor-report',
    method: 'get',
    params
  })
}


export function updateLaborReportDetail(reportId: string, detailId: string, data: UpdateLaborReportDetailDto) {
  return request({
    url: '/api/app/labor-report/detail',
    method: 'put',
    params: { reportId, detailId },
    data
  })
}


export function deleteLaborReportDetail(reportId: string, detailId: string) {
  return request({
    url: '/api/app/labor-report/detail',
    method: 'delete',
    params: { reportId, detailId }
  })
}

export function approveLaborReportDetail(reportId: string, detailId: string) {
  return request({
    url: '/api/app/labor-report/approve',
    method: 'post',
    params: { reportId, detailId }
  })
}

export function withdrawLaborReportDetail(reportId: string, detailId: string) {
  return request({
    url: '/api/app/labor-report/withdraw',
    method: 'post', 
    params: { reportId, detailId }
  })
}
export function saveDailyLaborReport(data: SaveDailyLaborReportParams) {
  return request({
    url: '/api/app/labor-report/save-daily-report',
    method: 'post',
    data
  })
}
export function getLaborDetailsByIds(detailIds: string[]) {
  return request({
    url: '/api/app/labor-report/get-details-by-ids',
    method: 'post',
    data: detailIds // 数组作为 POST Body 传输
  })
}
export function getCalendarStatus(startDate: string, endDate: string) {
  return request({
    url: '/api/app/labor-report/calendar-status',
    method: 'get',
    params: { startDate, endDate } 
  })
  
}