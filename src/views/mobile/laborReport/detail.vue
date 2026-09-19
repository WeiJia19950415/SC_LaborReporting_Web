<template>
  <div class="mobile-detail">
    <!-- 顶部导航 -->
    <van-nav-bar
      :title="isEdit ? `修改工时 (${currentDate})` : `申报工时 (${currentDate})`"
      left-arrow
      @click-left="router.back()"
      fixed
      placeholder
    />

    <van-notice-bar 
      v-if="systemConfigStore.auditStatus" 
      left-icon="info-o" 
      text="当前审核规则限制：单日提交总工时不能超过 8 小时" 
    />

    <!-- 加载骨架屏 -->
    <van-skeleton title :row="10" :loading="pageLoading" class="mt-4">
      <div class="record-list">
        <!-- 空状态 -->
        <van-empty v-if="recordList.length === 0" description="暂无报工明细，请点击下方新增" />

        <!-- 报工明细卡片 -->
        <div class="record-card" v-for="(row, index) in recordList" :key="index">
          <!-- 卡片头部：状态与类型 -->
          <div class="card-header">
            <div class="header-left">
              <van-tag :type="row.laborClass === 1 ? 'primary' : 'success'">
                {{ row.laborClass === 1 ? '项目工时' : '其他工时' }}
              </van-tag>
              <span class="project-name">{{ row.laborClass === 1 ? row.projectName : '非项目工作' }}</span>
            </div>
            <div class="header-right">
              <van-tag v-if="row.status === 0" type="warning">审批中</van-tag>
              <van-tag v-else-if="row.status === 3" type="success">已通过</van-tag>
              <van-tag v-else-if="row.status === 1 || row.status === 2" type="danger">撤回</van-tag>
              <van-tag v-else type="default">未提交</van-tag>
            </div>
          </div>

          <van-cell-group inset class="card-body">
            <!-- 基础信息展示 -->
            <van-cell title="项目编号" :value="row.projectCode" v-if="row.laborClass === 1" />
            <van-cell title="项目角色" :value="row.projectRoleName" />
            
            <!-- 产品系列选择 -->
            <van-field
              v-model="row.productSeriesName"
              label="产品系列"
              :placeholder="row.laborClass === 2 ? '无需选择' : '请选择'"
              readonly
              :is-link="row.status !== 0 && row.status !== 3 && row.laborClass !== 2"
              @click="openPicker('product', index)"
              :disabled="row.status === 0 || row.status === 3 || row.laborClass === 2"
            />

            <!-- 任务分类选择 (必填) -->
            <van-field
              v-model="row.laborCategoryName"
              label="任务分类"
              placeholder="请选择任务 (必填)"
              required
              readonly
              :is-link="row.status === -1"
              @click="openPicker('task', index)"
              :disabled="row.status !== -1"
            />

            <!-- 发生工时 -->
            <van-field label="发生工时(H)" required>
              <template #input>
                <van-stepper 
                  v-model="row.hours" 
                  :min="0.5" 
                  :step="0.5" 
                  :disabled="row.status === 0 || row.status === 3" 
                />
              </template>
            </van-field>

            <!-- 工作内容 -->
            <van-field
              v-model="row.jobresponsibilities"
              label="工作内容"
              type="textarea"
              placeholder="请输入简述工作内容"
              rows="3"
              autosize
              :disabled="row.status === 0 || row.status === 3"
            />
          </van-cell-group>

          <!-- 卡片操作区 -->
          <div class="card-actions">
            <van-button 
              v-if="row.status === 0" 
              size="small" 
              type="warning" 
              plain 
              @click="handleWithdraw(row, index)"
            >撤回</van-button>
            <van-button 
              v-if="row.status === -1 || row.status === 1 || row.status === 2" 
              size="small" 
              type="danger" 
              plain 
              @click="handleDelete(row, index)"
            >删除</van-button>
          </div>
        </div>
      </div>
    </van-skeleton>

    <!-- 底部悬浮操作栏 -->
    <div class="bottom-bar">
      <div class="total-info">
        总计: <span class="hours">{{ totalHours }}</span> H
      </div>
      <div class="actions">
        <van-button plain type="primary" round class="action-btn" @click="showAddPopup = true">
          新增一行
        </van-button>
        <van-button type="primary" round class="action-btn" :loading="submitLoading" @click="submitReport">
          保存提交
        </van-button>
      </div>
    </div>

    <!-- ================== 弹窗及选择器区域 ================== -->

    <!-- 1. 新增记录弹窗 -->
    <van-popup v-model:show="showAddPopup" position="bottom" round closeable>
      <div class="popup-header">添加工时明细</div>
      <van-form @submit="confirmAddRow" class="add-form">
        <van-field name="laborClass" label="工时类别">
          <template #input>
            <van-radio-group v-model="addForm.laborClass" direction="horizontal" @change="onLaborClassChange">
              <van-radio :name="1">项目工时</van-radio>
              <van-radio :name="2">其他工时</van-radio>
            </van-radio-group>
          </template>
        </van-field>

        <van-field
          v-model="addForm.projectRoleName"
          label="项目角色"
          placeholder="请选择项目角色"
          is-link
          readonly
          @click="showRolePicker = true"
          :rules="[{ required: true, message: '请选择角色' }]"
        />

        <van-field
          v-if="addForm.laborClass === 1"
          v-model="addForm.projectName"
          label="关联项目"
          placeholder="请选择关联项目"
          is-link
          readonly
          @click="showProjectPicker = true"
          :rules="[{ required: true, message: '请选择项目' }]"
        />

        <div style="margin: 16px;">
          <van-button round block type="primary" native-type="submit">确认添加</van-button>
        </div>
      </van-form>
    </van-popup>

    <!-- 基础选择器复用层 -->
    <van-popup v-model:show="showRolePicker" position="bottom" round>
      <van-picker :columns="roleColumns" @confirm="onRoleConfirm" @cancel="showRolePicker = false" />
    </van-popup>
    <van-popup v-model:show="showProjectPicker" position="bottom" round>
      <van-picker :columns="projectColumns" @confirm="onProjectConfirm" @cancel="showProjectPicker = false" />
    </van-popup>

    <!-- 记录卡片内的关联选择器 -->
    <van-popup v-model:show="showProductPicker" position="bottom" round>
      <van-picker :columns="productColumns" @confirm="onProductConfirm" @cancel="showProductPicker = false" />
    </van-popup>
    <van-popup v-model:show="showTaskPicker" position="bottom" round>
      <van-picker :columns="currentTaskColumns" @confirm="onTaskConfirm" @cancel="showTaskPicker = false" />
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { showToast, showConfirmDialog, showLoadingToast, closeToast } from 'vant';
import { getProjectRoles } from '../../../api/projectRole';
import { getProjects } from '../../../api/project';
import { getLeafCategories } from '../../../api/laborCategory';
import { useUserStore } from '../../../stores/user';
import { saveDailyLaborReport, getLaborDetailsByIds, withdrawLaborDetail, deleteLaborDetail } from '../../../api/laborReport';
import { getProductSeriesList } from '../../../api/productSeries';
import { useSystemConfigStore } from '../../../stores/systemConfig';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const systemConfigStore = useSystemConfigStore();

// 页面基础状态
const pageLoading = ref(true);
const submitLoading = ref(false);
const currentDate = ref('');
const isEdit = ref(false);
const recordList = ref<any[]>([]);

// 字典数据
const projectRoles = ref<any[]>([]);
const projects = ref<any[]>([]);
const productSeriesOptions = ref<any[]>([]);
const allTasksOptions = ref<any[]>([]);

// 动态选择器列数据 (匹配 Vant Picker 格式)
const roleColumns = computed(() => projectRoles.value.map(r => ({ text: r.name, value: r.id })));
const projectColumns = computed(() => projects.value.filter(p => !p.isOld).map(p => ({ text: `${p.name} (${p.code})`, value: p.id, code: p.code })));
const productColumns = computed(() => productSeriesOptions.value.map(p => ({ 
  text: p.name ? (p.code ? `${p.code} - ${p.name}` : p.name) : p.code, 
  value: p.id 
})));

// 弹窗控制
const showAddPopup = ref(false);
const showRolePicker = ref(false);
const showProjectPicker = ref(false);
const showProductPicker = ref(false);
const showTaskPicker = ref(false);

// 新增表单状态
const addForm = reactive({
  laborClass: 1,
  projectRoleId: '',
  projectRoleName: '',
  projectId: '',
  projectName: '',
  projectCode: '-'
});

// 当前正在操作卡片的索引（用于选择产品/任务时知道是在修改哪一行）
const currentActionIndex = ref(-1);
const currentTaskColumns = ref<any[]>([]);

const totalHours = computed(() => {
  return recordList.value.reduce((acc, row) => acc + (Number(row.hours) || 0), 0);
});

onMounted(async () => {
  // 解析路由参数
  currentDate.value = route.query.date as string;
  isEdit.value = route.query.isEdit === '1';
  let detailIds: string[] = [];
  try {
    if (route.query.ids) detailIds = JSON.parse(route.query.ids as string);
  } catch (e) {}

  await loadInitialData(detailIds);
});

// 核心：初始化与数据回显逻辑 (严格复刻 PC 端)
const loadInitialData = async (detailIds: string[]) => {
  try {
    const [rRes, pRes] = await Promise.all([
      getProjectRoles({ maxResultCount: 1000 }),
      getProjects({ maxResultCount: 1000 }),
      loadProductSeries(),
      loadAllTasks()
    ]);
    
    projectRoles.value = rRes.items || rRes || [];
    projects.value = pRes.items || pRes || [];

    if (isEdit.value && detailIds.length > 0) {
      const serverDetails: any = await getLaborDetailsByIds(detailIds);
      if (serverDetails && Array.isArray(serverDetails)) {
        for (const item of serverDetails) {
          // 获取此条件下的可选任务
          let tasks = await fetchTasksForCondition(item.projectRoleId, item.laborClass);
          
          // 兜底任务逻辑
          if (item.laborCategoryId && !tasks.some((t: any) => t.id === item.laborCategoryId)) {
            const globalTask = allTasksOptions.value.find(t => t.id === item.laborCategoryId);
            if (globalTask) {
              tasks.push(globalTask);
            } else {
              tasks.push({ id: item.laborCategoryId, fullName: item.laborCategoryName || item.laborCategoryCode || item.laborCategoryId });
            }
          }

          // 兜底产品系列逻辑
          if (item.productSeriesId && !productSeriesOptions.value.some(p => p.id === item.productSeriesId)) {
            productSeriesOptions.value.push({
              id: item.productSeriesId,
              code: item.productSeriesCode || '',
              name: item.productSeriesName || item.productSeriesId
            });
          }

          const defaultHours = systemConfigStore.auditStatus ? (item.hoursFinance ?? item.hours) : item.hours;

          // 寻找展示用的 Name
          const pSeries = productSeriesOptions.value.find(p => p.id === item.productSeriesId);
          const taskObj = tasks.find((t:any) => t.id === item.laborCategoryId);

          recordList.value.push({
            id: item.detailId,
            laborClass: item.laborClass,
            projectId: item.projectId,
            projectCode: item.projectCode,
            projectName: item.projectName,
            projectRoleId: item.projectRoleId,
            projectRoleName: item.projectRoleName,
            
            productSeriesId: item.productSeriesId || null,
            productSeriesName: pSeries ? (pSeries.name ? `${pSeries.code} - ${pSeries.name}` : pSeries.code) : '',
            
            laborCategoryId: item.laborCategoryId,
            laborCategoryCode: item.laborCategoryCode,
            laborCategoryName: taskObj ? taskObj.fullName : '',
            
            jobresponsibilities: item.jobresponsibilities,
            hours: defaultHours, 
            status: item.status, 
            availableTasks: tasks 
          });
        }
      }
    }
  } catch (error) {
    showToast('无法加载该日期下的报工明细');
  } finally {
    pageLoading.value = false;
  }
};

const loadProductSeries = async () => {
  try {
    const res = await getProductSeriesList({ SkipCount: 0, MaxResultCount: 1000 });
    productSeriesOptions.value = res.items || res || [];
  } catch (error) {}
};

const loadAllTasks = async () => {
  try {
    const res = await getLeafCategories({ maxResultCount: 1000 });
    allTasksOptions.value = res.items || res || [];
  } catch (error) {}
};

// ================== 新增明细逻辑 ==================
const onLaborClassChange = () => {
  if (addForm.laborClass === 2) {
    addForm.projectId = '';
    addForm.projectName = '';
    addForm.projectCode = '-';
  }
};

const onRoleConfirm = ({ selectedOptions }: any) => {
  addForm.projectRoleName = selectedOptions[0].text;
  addForm.projectRoleId = selectedOptions[0].value;
  showRolePicker.value = false;
};

const onProjectConfirm = ({ selectedOptions }: any) => {
  addForm.projectName = selectedOptions[0].text.split(' (')[0];
  addForm.projectCode = selectedOptions[0].code;
  addForm.projectId = selectedOptions[0].value;
  showProjectPicker.value = false;
};

const confirmAddRow = async () => {
  if (addForm.laborClass === 1 && !addForm.projectId) return showToast('项目工时必须选择关联项目');

  showLoadingToast({ message: '加载任务配置...', forbidClick: true });
  const tasks = await fetchTasksForCondition(addForm.projectRoleId, addForm.laborClass);
  closeToast();

  if (tasks.length === 0) {
    return showToast('当前条件下未配置任何任务分类');
  }

  recordList.value.push({
    id: null,
    laborClass: addForm.laborClass,
    projectId: addForm.projectId || null,
    projectCode: addForm.projectCode,
    projectName: addForm.projectName || '-',
    projectRoleId: addForm.projectRoleId,
    projectRoleName: addForm.projectRoleName,
    productSeriesId: null, 
    productSeriesName: '',
    laborCategoryId: '',
    laborCategoryCode: '',
    laborCategoryName: '',
    jobresponsibilities: '',
    hours: 0.5, 
    status: -1,
    availableTasks: tasks 
  });

  // 重置新增表单状态
  addForm.projectRoleId = '';
  addForm.projectRoleName = '';
  addForm.projectId = '';
  addForm.projectName = '';
  addForm.projectCode = '-';
  showAddPopup.value = false;
};

const fetchTasksForCondition = async (roleId: string, lClass: number) => {
  const deptId = userStore.userInfo?.departmentId;
  try {
    const res = await getLeafCategories({ projectRoleId: roleId, departmentId: deptId, laborClass: lClass });
    return res.items || res || [];
  } catch (error) { return []; }
};

// ================== 卡片内编辑逻辑 ==================
const openPicker = (type: 'product' | 'task', index: number) => {
  const row = recordList.value[index];
  if (row.status === 0 || row.status === 3) return; // 拦截禁用状态

  currentActionIndex.value = index;
  if (type === 'product') {
    if (row.laborClass === 2) return;
    showProductPicker.value = true;
  } else {
    if (row.status !== -1) return;
    currentTaskColumns.value = row.availableTasks.map((t: any) => ({ text: t.fullName, value: t.id, taskObj: t }));
    showTaskPicker.value = true;
  }
};

const onProductConfirm = ({ selectedOptions }: any) => {
  const row = recordList.value[currentActionIndex.value];
  row.productSeriesName = selectedOptions[0].text;
  row.productSeriesId = selectedOptions[0].value;
  showProductPicker.value = false;
};

const onTaskConfirm = ({ selectedOptions }: any) => {
  const row = recordList.value[currentActionIndex.value];
  const task = selectedOptions[0].taskObj;
  
  row.laborCategoryName = task.fullName;
  row.laborCategoryId = task.id;
  row.laborCategoryCode = task.code;
  if (!row.jobresponsibilities) {
    row.jobresponsibilities = task.remark || '';
  }
  showTaskPicker.value = false;
};

// ================== 删除与撤回 ==================
const handleWithdraw = async (row: any, index: number) => {
  try {
    await showConfirmDialog({ title: '提示', message: '确定要撤回这条报工记录吗？' });
    await withdrawLaborDetail(row.id);
    showToast('撤回成功，可直接修改重新提交');
    row.status = 2; // 更新为撤回状态，界面解锁
  } catch (error) {}
};

const handleDelete = async (row: any, index: number) => {
  try {
    await showConfirmDialog({ title: '危险操作', message: '确定要永久删除该记录吗？' });
    if (row.id) {
      await deleteLaborDetail(row.id);
    }
    recordList.value.splice(index, 1);
    showToast('删除成功');
  } catch (error) {}
};

// ================== 保存提交 ==================
const submitReport = async () => {
  if (recordList.value.length === 0) return showToast('请至少添加一行报工明细');

  for (let i = 0; i < recordList.value.length; i++) {
    const row = recordList.value[i];
    if (!row.laborCategoryId) return showToast(`第 ${i + 1} 行请选择任务分类`);
    if (!row.jobresponsibilities) return showToast(`第 ${i + 1} 行请填写工作内容`);
  }

  if (systemConfigStore.auditStatus && totalHours.value > 8) {
    return showToast('当前审核规则限制：单日总工时不能超过8小时');
  }

  submitLoading.value = true;
  try {
    const payload = {
      reporterId: userStore.id,
      departmentId: userStore.userInfo?.departmentId,
      reportDate: currentDate.value,
      details: recordList.value.map(r => {
        let validProductSeriesId = null;
        if (r.productSeriesId && String(r.productSeriesId).trim() !== '' && r.productSeriesId !== 'null') {
            validProductSeriesId = r.productSeriesId;
        }

        const baseDetail: any = {
          id: r.id, 
          laborClass: r.laborClass,
          projectId: r.projectId,
          projectCode: r.projectCode,
          projectName: r.projectName,
          projectRoleId: r.projectRoleId,
          projectRoleName: r.projectRoleName,
          productSeriesId: validProductSeriesId, 
          laborCategoryId: r.laborCategoryId,
          laborCategoryCode: r.laborCategoryCode,
          jobresponsibilities: r.jobresponsibilities,
          status: 0 // 强制前端传递状态为0，确保后端知道是重新提交
        };
        
        if (systemConfigStore.auditStatus) {
          baseDetail.hoursFinance = r.hours;
        } else {
          baseDetail.hours = r.hours;
        }
        return baseDetail;
      })
    };
    
    await saveDailyLaborReport(payload);
    showToast('工时提报成功');
    router.back(); // 提交成功返回日历列表
  } catch (error) {
  } finally {
    submitLoading.value = false;
  }
};
</script>

<style scoped>
.mobile-detail {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 90px; /* 留出底部操作栏空间 */
}
.mt-4 {
  margin-top: 16px;
}

/* 卡片样式 */
.record-list {
  padding: 12px;
}
.record-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.04);
  margin-bottom: 16px;
  overflow: hidden;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f5f6f8;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.project-name {
  font-size: 14px;
  font-weight: bold;
  color: #323233;
}
.card-body {
  margin: 0; 
  padding-top: 8px;
  padding-bottom: 8px;
}
.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 16px;
  background-color: #fafbfc;
  border-top: 1px dashed #ebedf0;
}

/* 底部悬浮栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: #fff;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  z-index: 99;
  padding-bottom: env(safe-area-inset-bottom);
}
.total-info {
  font-size: 14px;
  color: #323233;
  font-weight: 500;
}
.total-info .hours {
  color: #ee0a24;
  font-size: 20px;
  font-weight: bold;
}
.actions {
  display: flex;
  gap: 10px;
}
.action-btn {
  height: 36px;
  padding: 0 16px;
}

/* 弹窗样式 */
.popup-header {
  text-align: center;
  font-size: 16px;
  font-weight: bold;
  padding: 16px;
  border-bottom: 1px solid #ebedf0;
}
.add-form {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>