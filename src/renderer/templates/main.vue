<template>
  <div id="main" :class="{'sidebar-open': active}">
    <!-- <a href="#" @click.prevent="toggleSidebar" class="sidebar-toggler" :class="{'visible': toggler, 'hidden': !toggler}">
      <sui-icon name="bars"/>
    </a> -->
    <sui-sidebar animation="push" :visible="active" width="wide" class="inverted">
      <!-- <div class="item"  @click.prevent="toggleSidebar">
        <a href="#" @click.prevent>
          <sui-icon name="bars"/>
          Close sidebar
        </a>
      </div> -->
      <div class="item">
        Reselling
      </div>
      <router-link class="item" to="/modems">
          <sui-icon name="mobile"/>
          Modems list
      </router-link>
    </sui-sidebar>
    <router-view></router-view>
  </div>
</template>

<script>
import { mapState } from "vuex";
export default {
  data() {
    return {
      active: true,
      toggler: false
    };
  },
  computed: {
    user() {
      return this.$store.state.user.user;
    }
  },
  methods: {
    toggleSidebar() {
      this.active = !this.active;
    }
  }
};
</script>

<style>
#main {
  height: 100%;
}
.sidebar-toggler {
  position: fixed;
  top: 20px;
  left: 20px;
}
.sidebar-open {
  margin-left: 260px;
}
</style>


