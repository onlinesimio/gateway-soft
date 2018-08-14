
/**
 * The file enables `@/store/index.js` to import all vuex modules
 * in a one-shot manner. There should not be any reason to edit this file.
 */

const files = require.context('.', false, /\.js$/)
const modules = {}

files.keys().forEach(key => {
  if (key === './index.js') return
  let name = key.replace(/(\.\/|\.js)/g, '');
  modules[name] = files(key).default;
  modules[name]['namespaced'] = true;
})

export default modules