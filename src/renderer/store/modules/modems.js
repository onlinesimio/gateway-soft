const state = {
  list: {}
}

const mutations = {
  addModem(state, modem) {
    state.list[modem.usbID] = modem;
  },
  removeModem(state, usbID) {
    delete state.list[usbID];
  },
  updateModem(state, modem) {
    if(!state.list[modem.usbID]) return;
    for (let i in modem) {
      state.list[modem.usbID][i] = modem[i];
    }
  }
}

const getters = {
  modems: (state) => state.list
}

export default {
  state,
  mutations
}
