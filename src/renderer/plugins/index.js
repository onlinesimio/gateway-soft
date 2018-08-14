import Vue from 'vue'

let time = Math.floor(Date.now() / 1000);
let plugins = {};
let index = 0;

const files = require.context('./', false, /\.js$/)

files.keys().forEach(key => {
  if (key === './index.js') return
  let plugin = {
    name: key.replace(/^\.\//, '').replace(/\.js$/, ''),
    time_init: time,
    index: index++,
    install: files(key).install || files(key).default
  };
  if (plugin.hasOwnProperty('init')) plugin.init();
  if (plugin.install) {
    Vue.use(plugin);
    plugins[plugin.name] = plugin;
  }
});

export default plugins