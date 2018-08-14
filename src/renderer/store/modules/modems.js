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
    state.list[modem.usbID] = modem;
  }
}

export default {
  state,
  mutations
}