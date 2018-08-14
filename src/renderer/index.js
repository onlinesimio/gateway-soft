import Vue from 'vue'

import App from './App'
import store from './store'
import router from './router'
import _ from './plugins/index';

Vue.config.productionTip = false

/* eslint-disable no-new */
new Vue({
  components: { App },
  router,
  store,
  template: '<App/>'
}).$mount('#app')
