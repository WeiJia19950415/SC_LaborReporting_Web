<template>
  <div class="system-config-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>系统业务全局配置</span>
        </div>
      </template>

      <el-form 
        ref="configFormRef"
        :model="configForm" 
        :rules="rules"
        label-width="160px"
        v-loading="loading"
        status-icon
      >
        <el-form-item label="考勤期间起始日期" prop="attendanceStartDate">
          <el-input-number 
            v-model="configForm.attendanceStartDate" 
            :min="1" 
            :max="31" 
            :step="1"
            step-strictly
          />
          <span class="tip-text">（请输入 1-31 之间的正整数，通常为 1）</span>
        </el-form-item>

        <el-form-item label="考勤期间截至日期" prop="attendanceEndDate">
          <el-input-number 
            v-model="configForm.attendanceEndDate" 
            :min="1" 
            :max="31" 
            :step="1"
            step-strictly
          />
          <span class="tip-text">（请输入 1-31 之间的正整数，通常为 31）</span>
        </el-form-item>

        <el-form-item label="全局审计状态" prop="auditStatus">
          <el-switch 
            v-model="configForm.auditStatus" 
            active-text="开启审计" 
            inactive-text="关闭审计" 
          />
          <span class="tip-text">（开启后系统将应用严格的审计与修改校验规则）</span>
        </el-form-item>

        <el-divider content-position="left">企业微信集成配置</el-divider>

        <el-form-item label="企业微信 CorpID" prop="weComCorpId">
          <el-input 
            v-model="configForm.weComCorpId" 
            placeholder="请输入企业微信的 CorpID (企业ID)"
            clearable
          />
        </el-form-item>

        <el-form-item label="应用 AgentId" prop="weComAgentId">
          <el-input 
            v-model="configForm.weComAgentId" 
            placeholder="请输入自建应用的的 AgentId"
            clearable
          />
        </el-form-item>

        <el-form-item label="应用 Secret" prop="weComSecret">
          <el-input 
            v-model="configForm.weComSecret" 
            type="password"
            show-password
            placeholder="请输入自建应用的 Secret"
            clearable
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="submitLoading" @click="submitConfig">
            保存配置
          </el-button>
          <el-button @click="loadConfig" :disabled="submitLoading">重置为当前值</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { getSystemConfigApi, updateSystemConfigApi } from '../../api/systemConfig';
import { useSystemConfigStore } from '../../stores/systemConfig';

const systemConfigStore = useSystemConfigStore();
const configFormRef = ref<FormInstance>();
const loading = ref(false);
const submitLoading = ref(false);

const configForm = reactive({
  attendanceStartDate: 1,
  attendanceEndDate: 31,
  auditStatus: false,
  weComCorpId: '',
  weComAgentId: '',
  weComSecret: ''
});

const rules = reactive<FormRules>({
  attendanceStartDate: [
    { required: true, message: '请输入考勤起始日期', trigger: 'blur' },
    { type: 'number', min: 1, max: 31, message: '日期必须在 1 到 31 之间', trigger: 'blur' }
  ],
  attendanceEndDate: [
    { required: true, message: '请输入考勤截至日期', trigger: 'blur' },
    { type: 'number', min: 1, max: 31, message: '日期必须在 1 到 31 之间', trigger: 'blur' }
  ],
  weComCorpId: [
    { required: true, message: '请输入企业微信 CorpID', trigger: 'blur' }
  ],
  weComAgentId: [
    { required: true, message: '请输入自建应用的 AgentId', trigger: 'blur' }
  ],
  weComSecret: [
    { required: true, message: '请输入自建应用的 Secret', trigger: 'blur' }
  ]
});

const loadConfig = async () => {
  loading.value = true;
  try {
    const res: any = await getSystemConfigApi();
    if (res) {
      configForm.attendanceStartDate = res.attendanceStartDate;
      configForm.attendanceEndDate = res.attendanceEndDate;
      configForm.auditStatus = res.auditStatus;
      configForm.weComCorpId = res.weComCorpId || '';
      configForm.weComAgentId = res.weComAgentId || '';
      configForm.weComSecret = res.weComSecret || '';
    }
  } catch (error) {
    ElMessage.error('加载系统配置失败，请检查网络或联系管理员');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const submitConfig = async () => {
  if (!configFormRef.value) return;
  await configFormRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true;
      try {
        await updateSystemConfigApi({
          attendanceStartDate: configForm.attendanceStartDate,
          attendanceEndDate: configForm.attendanceEndDate,
          auditStatus: configForm.auditStatus,
          weComCorpId: configForm.weComCorpId,
          weComAgentId: configForm.weComAgentId,
          weComSecret: configForm.weComSecret
        });
        
        ElMessage.success('配置保存成功！');
        
        // ✨ 重点：保存成功后，主动刷新全局 Pinia 里的缓存，让系统其他页面瞬间生效 ✨
        await systemConfigStore.fetchSystemConfig();
      } catch (error: any) {
        ElMessage.error(error.response?.data?.error?.message || '配置保存失败，请检查后端校验');
        console.error(error);
      } finally {
        submitLoading.value = false;
      }
    }
  });
};

onMounted(() => {
  loadConfig();
});
</script>

<style scoped>
.system-config-container {
  padding: 20px;
}
.box-card {
  max-width: 800px;
  margin: 0 auto;
}
.card-header {
  font-weight: bold;
  font-size: 16px;
  display: flex;
  align-items: center;
}
.card-header::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 16px;
  background-color: #409EFF;
  margin-right: 10px;
  border-radius: 2px;
}
.tip-text {
  margin-left: 15px;
  color: #909399;
  font-size: 13px;
}
/* 给企微输入框加一个合适的宽度，避免撑满整行显得不美观 */
.el-input {
  max-width: 400px;
}
</style>