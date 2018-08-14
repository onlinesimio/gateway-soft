<template>
  <div></div>
</template>

<script>
export default {
  created() {
    this.$store.commit("user/SET_USER", null);
    this.$store.commit("user/SET_APIKEY", null);
    this.$configStore.set("user", null);
      this.$http.defaults.transformRequest.push((data, headers) => {
          delete headers.common["Apikey"];
          return data;
      });
    this.$router.push("/auth/login");

  }
};
</script>

