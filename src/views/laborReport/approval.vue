<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryForm" :inline="true" v-show="showSearch" class="search-form">
      
      <el-form-item label="填报发起人" prop="reporterId">
        <el-select
          v-model="queryParams.reporterId"
          placeholder="请选择或输入搜索"
          filterable
          clearable
          style="width: 200px"
        >
          <el-option
            v-for="user in userOptions"
            :key="user.id"
            :label="user.name || user.userName"
            :value="user.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="发起部门" prop="departmentId">
        <el-tree-select
          v-model="queryParams.departmentId"
          :data="departmentOptions"
          node-key="id"
          :props="{ label: 'displayName', children: 'children' }"
          placeholder="请选择部门"
          clearable
          check-strictly
          style="width: 200px"
        />
      </el-form-item>

      <el-form-item label="关联项目" prop="projectId">
        <el-select
          v-model="queryParams.projectId"
          placeholder="请选择项目"
          filterable
          clearable
          style="width: 220px"
        >
          <el-option
            v-for="proj in projectOptions"
            :key="proj.id"
            :label="proj.name || proj.displayName"
            :value="proj.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        <!-- 新增历史记录按钮 -->
        <el-button type="info" plain icon="Clock" @click="handleOpenHistory">历史记录</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8" style="margin-bottom: 15px;">
      <el-col :span="1.5">
        <el-button
          type="success"
          plain
          icon="Check"
          :disabled="multiple"
          @click="handleBatchApprove"
        >批量处理</el-button>
      </el-col>
    </el-row>

    <el-table v-loading="loading" :data="approvalList" @selection-change="handleSelectionChange" border stripe>
      <el-table-column type="selection" width="55" align="center" />
      
      <el-table-column label="填报日期" align="center" prop="reportDate" width="130">
        <template #default="scope">
          <span>{{ parseTime(scope.row.reportDate, '{y}-{m}-{d}') }}</span>
        </template>
      </el-table-column>

      <el-table-column label="发起人" align="center" prop="reporterId" width="120">
        <template #default="scope">
          <span>{{ getUserName(scope.row.reporterId) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="发起部门" align="center" prop="departmentId" width="150">
        <template #default="scope">
          <span>{{ getDepartmentName(scope.row.departmentId) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="关联项目" align="center" prop="projectName" min-width="100" />
      <el-table-column label="工时类型" align="center" prop="laborCategoryName" min-width="120" />
      
      <el-table-column label="填报工时" align="center" prop="hours" width="100">
        <template #default="scope">
          <el-tag type="info">{{ scope.row.hours }} 小时</el-tag>
        </template>
      </el-table-column>

      <el-table-column label="工作内容" align="left" prop="jobresponsibilities" show-overflow-tooltip min-width="180" />
      
      <el-table-column label="操作" align="center" width="100" fixed="right">
        <template #default="scope">
          <el-button
            type="primary"
            link
            icon="Edit"
            @click="handleApprove(scope.row)"
          >审批</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog :title="dialogTitle" v-model="dialogVisible" width="500px" append-to-body>
      <el-form label-width="80px">
        <el-form-item label="审批意见">
          <el-input
            v-model="approvalComment"
            type="textarea"
            :rows="4"
            placeholder="请输入审批意见"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="danger" @click="submitApproval(false)">审批不通过</el-button>
          <el-button type="success" @click="submitApproval(true)">审 批 通 过</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 【新增】审批历史记录弹窗 -->
    <el-dialog title="我的审批历史记录" v-model="historyVisible" width="1100px" append-to-body>
      <!-- 历史记录专用搜索栏 -->
      <el-form :model="historyQueryParams" :inline="true" class="mb8" style="margin-bottom: 15px;">
        <el-form-item label="填报人">
          <el-select v-model="historyQueryParams.reporterId" placeholder="选择填报人" filterable clearable style="width: 150px">
            <el-option v-for="user in userOptions" :key="user.id" :label="user.name || user.userName" :value="user.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="部门">
          <el-tree-select
            v-model="historyQueryParams.departmentId"
            :data="departmentOptions"
            node-key="id"
            :props="{ label: 'displayName', children: 'children' }"
            placeholder="选择部门"
            clearable
            check-strictly
            style="width: 180px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="getHistoryList">查询</el-button>
          <el-button icon="Refresh" @click="resetHistoryQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 历史记录表格 -->
      <el-table v-loading="historyLoading" :data="historyList" border stripe max-height="500">
        <el-table-column label="审批时间" align="center" prop="approvalTime" width="160">
          <template #default="scope">
            <span>{{ parseTime(scope.row.approvalTime, '{y}-{m}-{d} {h}:{i}') }}</span>
          </template>
        </el-table-column>
        <el-table-column label="填报人" align="center" width="100">
          <template #default="scope">
            <span>{{ getUserName(scope.row.reporterId) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="所属部门" align="center" width="120">
          <template #default="scope">
            <span>{{ getDepartmentName(scope.row.departmentId) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="项目/任务" align="center" min-width="180">
          <template #default="scope">
            <div>{{ scope.row.projectName }}</div>
            <div style="font-size: 12px; color: #999">{{ scope.row.laborCategoryCode }}</div>
          </template>
        </el-table-column>
        <el-table-column label="工时" align="center" prop="hours" width="80" />
        <el-table-column label="审批结果" align="center" width="100">
          <template #default="scope">
            <!-- 1为已通过，2和3为不同意/退回。具体数字可根据后端枚举值微调 -->
            <el-tag v-if="scope.row.status === 1" type="success">已通过</el-tag>
            <el-tag v-else-if="scope.row.status === 2 || scope.row.status === 3" type="danger">已驳回</el-tag>
            <el-tag v-else type="info">未知状态</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审批意见" align="left" prop="approvalComment" show-overflow-tooltip />
      </el-table>

      <!-- 历史记录分页 -->
      <div style="display: flex; justify-content: flex-end; margin-top: 15px;">
        <el-pagination
          v-model:current-page="historyPagination.currentPage"
          v-model:page-size="historyPagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="historyTotal"
          @size-change="handleHistorySizeChange"
          @current-change="handleHistoryCurrentChange"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { 
  getPendingApprovals, 
  approveLaborReport, 
  getUserList, 
  getProjectList, 
  getDepartmentList,
  getApprovalHistory // 【新增】引入历史记录API，需在 api 文件中添加该方法
} from '../../api/laborReport';

// ----- 基础变量定义 -----
const loading = ref(true);
const showSearch = ref(true);
const ids = ref<any[]>([]);
const selectedRows = ref<any[]>([]);
const multiple = ref(true);

const approvalList = ref<any[]>([]);
const dialogVisible = ref(false);
const dialogTitle = ref('');
const approvalComment = ref('');
const currentProcessList = ref<any[]>([]); 

// 选择菜单底层选项源
const userOptions = ref<any[]>([]);
const projectOptions = ref<any[]>([]);
const departmentOptions = ref<any[]>([]);

// 文字映射字典
const userMap = new Map<string, string>();
const deptMap = new Map<string, string>();

const queryParams = reactive({
  reporterId: undefined,
  departmentId: undefined,
  projectId: undefined
});

// ----- 【新增】历史记录相关变量 -----
const historyVisible = ref(false);
const historyLoading = ref(false);
const historyList = ref<any[]>([]);
const historyTotal = ref(0);

const historyPagination = reactive({
  currentPage: 1,
  pageSize: 10
});

const historyQueryParams = reactive({
  reporterId: undefined,
  departmentId: undefined
});

// ----- 加载事件流 -----
onMounted(async () => {
  await loadSearchOptions();
  getList();
});

// ----- 基础数据加载与处理 -----
const loadSearchOptions = async () => {
  try {
    const [usersRes, projsRes, deptsRes] = await Promise.all([
      getUserList(),
      getProjectList(),
      getDepartmentList()
    ]);

    // 用户列表映射
    const users = usersRes.items || usersRes.data || usersRes;
    userOptions.value = Array.isArray(users) ? users : [];
    userOptions.value.forEach(u => userMap.set(u.id, u.name || u.userName));

    // 项目列表映射
    const projs = projsRes.items || projsRes.data || projsRes;
    projectOptions.value = Array.isArray(projs) ? projs : [];

    // 部门列表构建树
    const depts = deptsRes.items || deptsRes.data || deptsRes;
    const rawDepts = Array.isArray(depts) ? depts : [];
    rawDepts.forEach(d => deptMap.set(d.id, d.displayName));
    departmentOptions.value = buildFileTree(rawDepts);

  } catch (error) {
    console.error("基础选择框数据加载出现异常：", error);
  }
};

const buildFileTree = (list: any[]): any[] => {
  const map: { [key: string]: any } = {};
  const tree: any[] = [];
  list.forEach(item => {
    map[item.id] = { ...item, children: [] };
  });
  list.forEach(item => {
    if (item.parentId && map[item.parentId]) {
      map[item.parentId].children.push(map[item.id]);
    } else {
      tree.push(map[item.id]);
    }
  });
  return tree;
};

const getUserName = (userId: string) => userMap.get(userId) || userId;
const getDepartmentName = (deptId: string) => deptMap.get(deptId) || deptId;

// ----- 待审批主列表方法 -----
const getList = async () => {
  loading.value = true;
  try {
    const res = await getPendingApprovals(queryParams);
    approvalList.value = res.data || res.items || res;
  } catch (error) {
    console.error("主列表加载遇到异常：", error);
  } finally {
    loading.value = false;
  }
};

const handleQuery = () => {
  getList();
};

const resetQuery = () => {
  queryParams.reporterId = undefined;
  queryParams.departmentId = undefined;
  queryParams.projectId = undefined;
  handleQuery();
};

const handleSelectionChange = (selection: any[]) => {
  selectedRows.value = selection;
  ids.value = selection.map(item => item.detailId);
  multiple.value = !selection.length;
};

const handleApprove = (row: any) => {
  currentProcessList.value = [row];
  approvalComment.value = '';
  dialogTitle.value = '填报工时审批';
  dialogVisible.value = true;
};

const handleBatchApprove = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先勾选需要批量审批的项目');
    return;
  }
  currentProcessList.value = selectedRows.value;
  approvalComment.value = '';
  dialogTitle.value = `批量审批控制台 (已选 ${selectedRows.value.length} 项)`;
  dialogVisible.value = true;
};

const submitApproval = async (isApproved: boolean) => {
  let finalComment = approvalComment.value.trim();
  if (!finalComment) {
    finalComment = isApproved ? '同意' : '不同意';
  }

  loading.value = true;
  try {
    for (const item of currentProcessList.value) {
      await approveLaborReport({
        reportId: item.reportId,
        detailId: item.detailId,
        isApproved: isApproved,
        comment: finalComment
      });
    }
    
    ElMessage.success(`处理完成，成功审批 ${currentProcessList.value.length} 条记录`);
    dialogVisible.value = false;
    getList();
  } catch (error) {
    ElMessage.error('批量处理中途出现异常，部分审批可能未成功');
  } finally {
    loading.value = false;
  }
};

// ----- 【新增】历史记录方法 -----
const handleOpenHistory = () => {
  historyVisible.value = true;
  resetHistoryQuery();
};

const getHistoryList = async () => {
  historyLoading.value = true;
  try {
    // 转换为 ABP 默认的分页参数格式 (SkipCount 和 MaxResultCount)
    const payload = {
      reporterId: historyQueryParams.reporterId,
      departmentId: historyQueryParams.departmentId,
      MaxResultCount: historyPagination.pageSize,
      SkipCount: (historyPagination.currentPage - 1) * historyPagination.pageSize
    };
    
    const res = await getApprovalHistory(payload);
    historyList.value = res.items || [];
    historyTotal.value = res.totalCount || 0;
  } catch (error) {
    console.error("历史记录加载失败：", error);
    ElMessage.error("获取审批历史失败");
  } finally {
    historyLoading.value = false;
  }
};

const resetHistoryQuery = () => {
  historyQueryParams.reporterId = undefined;
  historyQueryParams.departmentId = undefined;
  historyPagination.currentPage = 1;
  getHistoryList();
};

const handleHistorySizeChange = (val: number) => {
  historyPagination.pageSize = val;
  historyPagination.currentPage = 1;
  getHistoryList();
};

const handleHistoryCurrentChange = (val: number) => {
  historyPagination.currentPage = val;
  getHistoryList();
};

// ----- 共有工具方法 -----
const parseTime = (time: string, pattern: string) => {
  if (!time) return '';
  const date = new Date(time);
  const year = date.getFullYear();
  const month = ('0' + (date.getMonth() + 1)).slice(-2);
  const day = ('0' + date.getDate()).slice(-2);
  const hours = ('0' + date.getHours()).slice(-2);
  const minutes = ('0' + date.getMinutes()).slice(-2);
  const seconds = ('0' + date.getSeconds()).slice(-2);
  return pattern
    .replace('{y}', String(year))
    .replace('{m}', month)
    .replace('{d}', day)
    .replace('{h}', hours)
    .replace('{i}', minutes)
    .replace('{s}', seconds);
};
</script>

<style scoped>
.app-container {
  padding: 20px;
  background-color: #fafafa;
  min-height: calc(100vh - 84px);
}
.search-form {
  background: #fff;
  padding: 18px 18px 4px 18px;
  border-radius: 4px;
  margin-bottom: 15px;
  box-shadow: 0 1px 4px rgba(0,21,41,.08);
}
.dialog-footer {
  display: flex;
  justify-content: center;
  gap: 30px;
}
</style>