import { defineStore } from 'pinia';
import { getSystemConfigApi } from '../api/systemConfig';

export const useSystemConfigStore = defineStore('systemConfig', {
  state: () => ({
    attendanceStartDate: 26,
    attendanceEndDate: 25,
    auditStatus: false,
    isLoaded: false // 标记是否已加载完毕
  }),
  actions: {
    async fetchSystemConfig() {
      try {
        const res: any = await getSystemConfigApi();
        if (res) {
          this.attendanceStartDate = res.attendanceStartDate;
          this.attendanceEndDate = res.attendanceEndDate;
          this.auditStatus = res.auditStatus;
          this.isLoaded = true;
        }
      } catch (error) {
        console.error('拉取系统全局配置失败:', error);
      }
    }
  }
});