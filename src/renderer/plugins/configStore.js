import ConfigStore from 'electron-store';

const configStore = new ConfigStore();

export default function (Vue) {
    Vue.prototype.$configStore = Vue.configStore = configStore;
}
