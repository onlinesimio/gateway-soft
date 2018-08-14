<template>
  <div id="login" class="ui middle aligned center aligned grid">
    <div class="column">
      <h2 class="ui teal image header">
        <div class="content">Log-in to your account</div>
      </h2>
      <sui-message v-if="errors" icon="exclamation triangle" header="Error!" color="red">
        {{ errors }}
      </sui-message>
      <sui-form @submit.prevent="login" size="large">
        <div class="ui stacked segment">
          <sui-form-field>
            <sui-input v-model="form.email" placeholder="mail@mail" type="email" icon="envelope" icon-position="left" />
          </sui-form-field>
          <sui-form-field>
            <sui-input v-model="form.password" type="password" placeholder="Password" icon="lock" icon-position="left" />
          </sui-form-field>
          <sui-button type="submit" @click.prevent="login" color="teal" fluid content="Login"></sui-button>
        </div>
        <div class="ui message">
          New to us? <router-link to="/auth/register">Sign Up</router-link>
        </div>
      </sui-form>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      errors: "",
      form: {
        email: "",
        password: ""
      }
    };
  },

  methods: {
    login() {
      console.log("api/auth/login");
      this.$http
        .post("api/auth/login", {
          email: this.form.email,
          password: this.form.password
        })
        .then(response => {
          let user = response.data.user;
          this.errors = "";
          this.$store.commit("user/SET_USER", user);
          this.$store.commit("user/SET_APIKEY", user.apikey);
          this.$configStore.set("user", user);
          this.$http.defaults.transformRequest.push((data, headers) => {
            headers.common["Apikey"] = "Bearer " + user.apikey;
            return data;
          });
          this.$router.push("/profile");
        })
        .catch(err => {
          if (err.response) {
            if (err.response.status === 422) {
              this.errors = err.response.data;
              return;
            }
            if (err.response.status === 401) {
              this.errors = "Invalid login or password";
            }
          }
          console.log(err);
        });
    }
  }
};
</script>


<style>
#login {
  height: 100%;
  background-color: #dadada;
}
body > #app {
  height: 100%;
}
#app > .grid {
  height: 100%;
}
.column {
  max-width: 450px;
}
</style>

