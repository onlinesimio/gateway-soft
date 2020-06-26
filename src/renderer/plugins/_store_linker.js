import store from "../store/index";

export function install(Vue) {
    Vue.myStore = Vue.prototype.$myStore = store;
}
