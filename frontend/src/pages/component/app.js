import Vue from 'vue';
// import '@/devtools'; // Import before vuex to make state listener work
import Vuex from 'vuex';
import BootstrapVue from 'bootstrap-vue';
import axios from 'axios';
import VueAxios from 'vue-axios';
import simplebar from 'simplebar-vue';
import 'simplebar/dist/simplebar.css';
import bugsnag from '@bugsnag/js';
import bugsnagVue from '@bugsnag/plugin-vue';

import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faAngleLeft,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import router from '@/routers/router';
import store from '@/stores/store';
import App from './app.vue';
import '@/assets/component.scss';

Vue.config.productionTip = false;
Vue.config.devtools = process.env.NODE_ENV === 'development';
const bugsnagClient = bugsnag({
  apiKey: '132bdbeb27fb56546d9529e9000eda79',
  collectUserIp: false,
  autoNotify: (process.env.NODE_ENV !== 'development'),
  appVersion: '1.0.3',
});
bugsnagClient.use(bugsnagVue, Vue);
Vue.prototype.$bugsnag = bugsnagClient;

let URL;
if (process.env.NODE_ENV !== 'development') {
  URL = 'https://smapi.gorymoon.se/v2/';
} else {
  URL = 'http://localhost:3000/v2/';
}

library.add(faAngleLeft);
Vue.component('fa', FontAwesomeIcon);
Vue.component('simplebar', simplebar);
Vue.use(BootstrapVue);
Vue.use(VueAxios, axios.create({
  baseURL: URL,
  headers: { 'Access-Control-Allow-Origin': '*' },
}));

const app = new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount('#app');
Vuex.Store.prototype.$vm = app;
