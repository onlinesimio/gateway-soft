import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router);

const router = new Router({
  routes: [
    {
      path: '/',
      name: 'main',
      component: require('@/templates/main').default,
      children: [
        {
          path: '/modems',
          name: 'modem-list',
          component: require('@/pages/modems').default
        },
      ]
    },
    {
      path: '*',
      redirect: '/'
    }
  ],
  linkActiveClass: "active"
});

export default router;
