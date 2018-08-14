import store from '../../store';
import Vue from 'vue';

export default (to, from, next) => {
    if (store.getters["loading/isAppLoading"]) {
        return next();
    }

    store.dispatch('loading/setAppLoading', true);

    let user = Vue.configStore.get("user");
    if (user) {
        store.commit("user/SET_USER", user);
        store.commit("user/SET_APIKEY", user.apikey);

        Vue.http.defaults.transformRequest.push((data, headers) => {
            headers.common["Apikey"] = "Bearer " + user.apikey;
            return data;
        });
        next();
    } else {
        next('/auth/login');
    }



}
