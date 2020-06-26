import { ModemManager } from "@/../../lib/manager";
import ConfigStore from 'electron-store';

const configStore = new ConfigStore();

export default function (Vue) {
  Vue.prototype.$modems = new ModemManager(configStore.get('mncmcc'));
}
