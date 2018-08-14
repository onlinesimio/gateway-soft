import store from '../../store';

export default (to, from, next) => {
    if (!store.getters["user/isLogined"]) {
        return next('/auth/login');
    }
    return next();
}
