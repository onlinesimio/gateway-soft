const state = {
  user: null,
  apikey: ''
}

const mutations = {
  SET_USER(state, user) {
    state.user = user;
  },
  SET_APIKEY(state, apikey) {
    state.apikey = apikey
  }
}

const getters = {
  getApiKey(state) {
    return state.apikey;
  },
  isLogined() {
    return state.user !== null;
  },
}

export default {
  state,
  mutations,
  getters
}
