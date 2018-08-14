import { ModemManager } from "@/../../lib/manager";
import { ipcRenderer } from 'electron';
import ConfigStore from 'electron-store';

const configStore = new ConfigStore();

let path = ipcRenderer.sendSync('getDbPath')

//const db = new DB(path);

// fs.readFile('./mncmcc.txt', function (err, data) {
//   console.error(err);

//   let pardata = data.toString().split('\n');
//   pardata.forEach(line => {
//     let obj = JSON.parse(line)
//     db.table('sim_identification').insert({
//       mcc: obj.mcc,
//       mnc: obj.mnc,
//       iso: obj.iso,
//       country: obj.country,
//       operator: obj.network
//     }).then(() => {
//       console.log('inserted');
//     })
//   })
// });



export default function (Vue) {
  Vue.prototype.$modems = new ModemManager(path, configStore.get('mncmcc'));
}