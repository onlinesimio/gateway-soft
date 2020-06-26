import Vue from 'vue'
import Vuex from 'vuex'

import modules from './modules'
import { createPersistedState, createSharedMutations } from "vuex-electron"


Vue.use(Vuex)

export default new Vuex.Store({
  modules,
  strict: process.env.NODE_ENV !== 'production',
  plugins: [
    createPersistedState(),
    createSharedMutations()
  ],
})
