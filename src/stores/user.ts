import { defineStore } from "pinia";

interface UserState {
  token: string | null;
  username: string | null;
}

export const useUserStore = defineStore("user", {
  state: (): UserState => ({
    token: localStorage.getItem("token"),
    username: null,
  }),
  actions: {
    login(token: string, username: string) {
      this.token = token;
      this.username = username;
      localStorage.setItem("token", token);
    },
    logout() {
      this.token = null;
      this.username = null;
      localStorage.removeItem("token");
    },
  },
});