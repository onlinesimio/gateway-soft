import Vue from 'vue'
import Router from 'vue-router'

import AppInit from './guards/AppInit';
import IsLoggedIn from './guards/IsLoggedIn';

Vue.use(Router);

const router = new Router({
  routes: [
    {
      path: '/',
      name: 'main',
      component: require('@/templates/main').default,
      children: [
        {
          path: '/auth/login',
          name: 'login',
          component: require('@/pages/auth/login').default
        },
        {
          path: '/auth/register',
          name: 'register',
          component: require('@/pages/auth/register').default
        },
        {
          path: '/auth/logout',
          name: 'logout',
          component: require('@/pages/auth/logout').default,
          beforeEnter: IsLoggedIn
        },
        {
          path: '/profile',
          name: 'profile',
          component: require('@/pages/profile').default,
          beforeEnter: IsLoggedIn
        },
        {
          path: '/modems',
          name: 'modem-list',
          component: require('@/pages/modems').default,
          beforeEnter: IsLoggedIn
        },
      ]
    },
    {
      path: '*',
      redirect: '/auth/login'
    }
  ],
  linkActiveClass: "active"
});

router.beforeEach(AppInit);

export default router;
