
import request from '../utils/request';
// 获取指定月份的考勤打卡汇总
export function getMyMonthlyAttendance(monthStr: string) {
  return request({
    url: '/api/app/attendance-data/my-monthly-attendance',
    method: 'get',
    params: { monthStr }
  });
}