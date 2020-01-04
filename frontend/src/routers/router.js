import Vue from 'vue';
import Router from 'vue-router';
import ActionList from '@/views/ActionList.vue';
import SendBits from '@/views/SendBits.vue';

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: '/',
      name: 'home',
      component: ActionList,
    },
    {
      path: '/send-bits',
      name: 'send-bits',
      component: SendBits,
    },
  ],
});
