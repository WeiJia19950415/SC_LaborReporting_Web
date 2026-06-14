<template>
  <div class="user-container">
    <el-form :inline="true" :model="queryParams" class="search-form">
      <el-form-item label="用户名/邮箱">
        <el-input v-model="queryParams.Filter" placeholder="请输入关键字" clearable />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="fetchUserList">查询</el-button>
        <el-button type="success" @click="handleOpenDetail()">新增用户</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="userList" v-loading="loading" border style="width: 100%">
      <el-table-column prop="userName" label="用户名" />
      <el-table-column prop="email" label="邮箱" />
      <el-table-column label="状态">
        <template #default="scope">
          <el-tag :type="scope.row.isActive ? 'success' : 'danger'">
            {{ scope.row.isActive ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="250">
        <template #default="scope">
          <el-button link type="primary" @click="handleOpenDetail(scope.row)">修改</el-button>
          <el-button link type="danger" @click="handleDelete(scope.row)">删除</el-button>
          <el-button link :type="scope.row.isActive ? 'warning' : 'success'" @click="handleToggleActive(scope.row)">
            {{ scope.row.isActive ? '禁用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
    v-model:current-page="currentPage"
    :page-size="queryParams.MaxResultCount"
    :total="totalCount"
    layout="total, prev, pager, next, jumper" 
    @current-change="fetchUserList"
    class="custom-pagination"
    />

    <el-dialog v-model="dialogVisible" :title="formId ? '修改用户' : '新增用户'">
      <Detail :user-id="formId" @close="dialogVisible = false" @success="fetchUserList" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getUserListApi } from '../../api';
import Detail from './detail.vue';

const userList = ref([]);
const loading = ref(false);
const totalCount = ref(0);
const currentPage = ref(1);
const dialogVisible = ref(false);
const formId = ref('');

const queryParams = ref({ Filter: '', MaxResultCount: 10, SkipCount: 0 });

const fetchUserList = async () => {
  loading.value = true;
  queryParams.value.SkipCount = (currentPage.value - 1) * queryParams.value.MaxResultCount;
  const res: any = await getUserListApi(queryParams.value);
  userList.value = res.items;
  totalCount.value = res.totalCount;
  loading.value = false;
};

const handleOpenDetail = (row: any = null) => {
  formId.value = row ? row.id : '';
  dialogVisible.value = true;
};

onMounted(fetchUserList);
</script>

<style scoped>
.user-container {
  background-color: #ffffff; /* 设置背景为白色 */
  padding: 20px;            /* 增加内边距，防止内容贴边 */
  border-radius: 8px;       /* 增加圆角，更显圆润 */
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1); /* 增加淡淡的阴影，让卡片看起来有浮起感 */
  min-height: 500px;        /* 设定最小高度，即便列表数据少，页面也不会看起来空荡荡 */
}

/* 优化查询表单与表格之间的间距 */
.search-form {
  padding-bottom: 20px;
  border-bottom: 1px solid #ebeef5; /* 增加一条分割线 */
  margin-bottom: 20px;
}

.custom-pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center; /* 实现水平居中 */
  padding-bottom: 10px;
}
</style>