<template>
  <div id="profile" class="ui middle aligned center aligned grid">
    <div class="row">
      <div class="column">
        <h2 class="ui teal header">
          <div class="content">Profile</div>
        </h2>
        <div class="ui stacked segment">
          <sui-form>
            <sui-form-field inline>
              <label>Name</label>
              <sui-input v-model="name" disabled icon="user" icon-position="left" />
            </sui-form-field>
            <sui-form-field inline>
              <label>Email</label>
              <sui-input v-model="email" disabled icon="envelope" icon-position="left" />
            </sui-form-field>
            <sui-form-field inline>
              <label>Block</label>
              <sui-input v-model="blocked" disabled icon="lock" icon-position="left" />
            </sui-form-field>
          </sui-form>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="column" v-if="balance">
        <h2 class="ui teal header">
          <div class="content">Balance</div>
        </h2>
        <div class="ui stacked segment">
          <sui-message v-if="errors" icon="exclamation triangle" header="Error!" color="red">
            {{ errors }}
          </sui-message>
          <sui-form>
            <!-- <sui-form-field inline>
              <label>Blocked</label>
              <sui-input v-model="balance.block" disabled />
            </sui-form-field> -->
            <sui-form-field inline>
              <label>Income</label>
              <sui-input v-model="balance.income" disabled />
            </sui-form-field>
            <sui-form-field inline>
              <label>Wallet</label>
              <sui-input v-model="balance.wallet" disabled/>
            </sui-form-field>
            <sui-form-field>
              <sui-form-fields inline>
                <sui-form-field inline>
                  <label>Withdraw</label>
                  <sui-input v-model="amount"/>
                </sui-form-field>
                <sui-form-field>
                  <sui-button @click.prevent="withdraw" color="teal" fluid content="Withdraw"></sui-button>
                </sui-form-field>
              </sui-form-fields>
            </sui-form-field>
            <!-- <sui-button type="submit" @click.prevent="save" color="teal" fluid content="Login"></sui-button> -->
          </sui-form>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="column">
        <h2 class="ui teal header">
          <div class="content">Support</div>
        </h2>
        <div class="ui stacked segment">
          <sui-message v-if="message" icon="info" header="Success" color="green">
            {{ message }}
          </sui-message>
          <sui-message icon="question" header="Info" color="blue">
            Here you can send us the program logs. You must send the logs only after you use the section modems!
            Logs will help us complete the development faster.
          </sui-message>
          <sui-button @click.prevent="sendLogs" :loading="loading" :disabled="loading" color="teal" fluid content="Send logs"></sui-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ipcRenderer } from "electron";
export default {
  data() {
    return {
      name: "",
      email: "",
      balance: {},
      block: false,
      amount: 0,
      errors: "",
      loading: false,
      message: ""
    };
  },
  computed: {
    user() {
      return this.$store.state.user.user;
    },
    blocked() {
      if (this.block) return "yes";
      return "no";
    }
  },
  methods: {
    loadProfile() {
      this.$http
        .get("api/auth/me")
        .then(response => {
          this.name = response.data.name;
          this.email = response.data.email;
          this.block = response.data.block;
          this.balance = response.data.balance;
        })
        .catch(err => {
          console.error(err);
        });
    },
    withdraw() {
      this.errors = "Insufficient funds";
      setTimeout(() => {
        this.errors = "";
      }, 5000);
    },
    sendLogs() {
      this.loading = true;
      let log = ipcRenderer.sendSync("getLog");
      if (log.length < 1) {
        this.loading = false;
        this.message = "logs sended!";
        return;
      }

      this.$http
        .post("/api/log", {
          log
        })
        .then(response => {
          ipcRenderer.sendSync("clearLog");
          this.loading = false;
          this.message = "logs sended!";
          console.log(response);
        });
    }
  },
  created() {
    this.loadProfile();
  }
};
</script>

<style>
#profile {
  margin-top: 15%;
}
</style>


