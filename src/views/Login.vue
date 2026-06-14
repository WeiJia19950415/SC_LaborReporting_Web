<template>
  <div class="login-page">
    <h2>登录</h2>
    <form @submit.prevent="handleLogin">
      <input v-model="form.userNameOrEmailAddress" placeholder="用户名/邮箱" required />
      <input v-model="form.password" type="password" placeholder="密码" required />
      <label>
        <input type="checkbox" v-model="form.rememberMe" /> 记住我
      </label>
      <button type="submit">登录</button>
    </form>
    <p v-if="errorMessage" style="color:red">{{ errorMessage }}</p>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref } from "vue";
import request from "../utils/request";
import { useUserStore } from "../stores/user";
import { useRouter } from "vue-router";

export default defineComponent({
  setup() {
    const form = reactive({
      userNameOrEmailAddress: "",
      password: "",
      rememberMe: true,
    });
    const errorMessage = ref("");
    const router = useRouter();
    const userStore = useUserStore();

    const handleLogin = async () => {
      errorMessage.value = "";
      try {
        const res = await request.post("/account/login", form);
        if (res.result === 1) {
          // 假设返回 description 就是 token
          userStore.login(res.description, form.userNameOrEmailAddress);
          router.push("/"); // 登录成功跳首页
        } else {
          errorMessage.value = res.description || "登录失败";
        }
      } catch (err: any) {
        errorMessage.value = err.message || "网络错误";
      }
    };

    return { form, handleLogin, errorMessage };
  },
});
</script>

<style scoped>
.login-page {
  width: 300px;
  margin: 100px auto;
}
.login-page input {
  display: block;
  width: 100%;
  margin-bottom: 10px;
}
</style>