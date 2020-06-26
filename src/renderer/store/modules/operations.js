const state = {
  list: []
}

const mutations = {
  set(state, data) {
    state.list.push(data);
  },

}

const getters = {
  all: (state) => state.list
}

export default {
  state,
  mutations
}
