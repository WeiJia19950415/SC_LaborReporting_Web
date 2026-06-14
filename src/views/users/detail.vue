<template>
  <el-form :model="formData" label-width="80px">
    <el-form-item label="用户名">
      <el-input v-model="formData.userName" />
    </el-form-item>
    <el-form-item label="邮箱">
      <el-input v-model="formData.email" />
    </el-form-item>
    <el-form-item>
      <el-button @click="$emit('close')">取消</el-button>
      <el-button type="primary" @click="saveUser">保存</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{ userId: string }>();
const emit = defineEmits(['close', 'success']);
const formData = ref({ userName: '', email: '' });

// 监听 userId 变化，如果 userId 有值，则调用接口获取详情填入表单
watch(() => props.userId, (newId) => {
  if (newId) {
    // 调用获取单体详情的接口
  } else {
    formData.value = { userName: '', email: '' };
  }
}, { immediate: true });

const saveUser = () => {
  // 调用新增或修改接口
  emit('success');
  emit('close');
};
</script>