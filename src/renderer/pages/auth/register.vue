<template>
  <div id="register" class="ui middle aligned center aligned grid">
    <div class="column">
      <h2 class="ui teal header">
        <div class="content">Create new account</div>
      </h2>
      <sui-message icon="exclamation" header="Attention!" color="teal">
        Your account will be further verified to work with us
      </sui-message>
      <sui-message v-if="errors" icon="exclamation triangle" header="Error!" color="red">
        {{ errors }}
      </sui-message>
      <sui-form @submit.prevent="register" size="large">
        <div class="ui stacked segment">
          <sui-form-field>
            <sui-input v-model="form.name" placeholder="Login" icon="user" icon-position="left" />
          </sui-form-field>
          <sui-form-field>
            <sui-input v-model="form.email" type="email" placeholder="mail@mail" icon="envelope" icon-position="left" />
          </sui-form-field>
          <sui-form-field>
            <sui-input v-model="form.password" type="password" placeholder="Password" icon="lock" icon-position="left" />
          </sui-form-field>
          <sui-form-field>
            <sui-input v-model="form.telegram" placeholder="Telegram username" icon="telegram plane" icon-position="left" />
          </sui-form-field>
          <sui-button type="submit" color="teal" fluid content="Register"></sui-button>
        </div>
        <div class="ui message">
          Already registered? <router-link to="/auth/login">Sign In</router-link>
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
        name: "",
        email: "",
        password: "",
        telegram: ""
      }
    };
  },

  methods: {
    register() {
      this.$http
        .post("api/auth/register", this.form)
        .then(response => {
          this.errors = "";
          // this.$store.commit("user/SET_USER", response.data.data);
          //this.$store.commit('user/SET_APIKEY', response.data.data.apikey);
          // this.$configStore.set("user", response.data.data);
          this.$router.push("/auth/login");
        })
        .catch(err => {
          if (err.response) {
            if (err.response.status === 422) {
              this.errors = err.response.data;
              return;
            }
          }
          console.log(err);
        });
    }
  }
};
</script>


<style>
#register {
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

