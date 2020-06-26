const state = {
  list: {}
}

const mutations = {
  set(state, data) {
    state.list[data.usbID] = data;
  },
  remove(state, data) {
    delete state.list[data.usbID];
  },
  update(state, data) {
    state.list[data.usbID] = data;
  }
}

const getters = {
  all: (state) => state.list
}

export default {
  state,
  mutations
}
