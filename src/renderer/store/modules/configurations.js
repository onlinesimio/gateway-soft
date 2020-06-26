const state = {
  list: {}
}

const mutations = {
  set(state, data) {
    state.list[data.vendorID+'_'+data.deviceID] = data;
    state.list[data.imei] = data;
  },
  remove(state, data) {
    delete state.list[data.vendorID+'_'+data.deviceID];
    delete state.list[data.imei];
  },
  update(state, data) {
    state.list[data.vendorID+'_'+data.deviceID] = data;
    state.list[data.imei] = data;
  }
}

const getters = {
  all: (state) => state.list
}

export default {
  state,
  mutations
}
