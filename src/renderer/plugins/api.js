import Axios from 'axios';

export default function (Vue) {
  Vue.http = Vue.prototype.$http = Axios.create({
    baseURL: process.env.API_URL,
  });
}
