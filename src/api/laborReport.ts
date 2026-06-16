import request from '../utils/request'

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

export function getCalendarStatus(startDate: string, endDate: string) {
  return request({
    url: '/api/app/labor-report/calendar-status',
    method: 'get',
    params: { startDate, endDate } 
  })
}