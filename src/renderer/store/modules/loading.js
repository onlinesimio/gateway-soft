const state = {
    appLoading: false
};

const getters = {
    isAppLoading () {
        return state.appLoading;
    }
};

const actions = {
    setAppLoading({ commit, state }, status) {
        commit('setAppLoading', status);
    }
};

const mutations = {
    setAppLoading (state, status) {
        state.appLoading = status;
    }
};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
}
