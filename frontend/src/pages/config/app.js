import Vue from 'vue';
import '@/devtools'; // Import before vuex to make state listener to work
import Vuex from 'vuex';
import BootstrapVue from 'bootstrap-vue';
import axios from 'axios';
import VueAxios from 'vue-axios';
import VueClipboard from 'vue-clipboard2';
import Vuelidate from 'vuelidate';
import vSelect from 'vue-select';
import simplebar from 'simplebar-vue';
import 'simplebar/dist/simplebar.css';
import bugsnag from '@bugsnag/js';
import bugsnagVue from '@bugsnag/plugin-vue';

import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faExternalLinkAlt, faEyeSlash, faEye, faChevronDown, faChevronUp, faCheck,
  faGripLines, faPlus, faTrashAlt, faWrench,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import App from './app.vue';
import store from '@/stores/store';
import '@/assets/config.scss';

Vue.config.productionTip = false;
Vue.config.devtools = process.env.NODE_ENV === 'development';
const bugsnagClient = bugsnag({
  apiKey: '132bdbeb27fb56546d9529e9000eda79',
  collectUserIp: false,
  autoNotify: process.env.NODE_ENV === 'production',
});
bugsnagClient.use(bugsnagVue, Vue);
Vue.prototype.$bugsnag = bugsnagClient;

let URL;
if (process.env.NODE_ENV === 'development') {
  URL = 'http://localhost:3000/v2/';
} else {
  URL = 'https://seapi.gorymoon.se/v2/';
}

library.add(faExternalLinkAlt, faEyeSlash, faEye, faChevronDown, faChevronUp, faCheck,
  faGripLines, faPlus, faTrashAlt, faWrench);
Vue.component('fa', FontAwesomeIcon);
Vue.component('simplebar', simplebar);
Vue.component('v-select', vSelect);

Vue.use(BootstrapVue);
Vue.use(VueAxios, axios.create({
  baseURL: URL,
  headers: { 'Access-Control-Allow-Origin': '*' },
}));
Vue.use(VueClipboard);
Vue.use(Vuelidate);

const app = new Vue({
  store,
  axios,
  render: (h) => h(App),
}).$mount('#app');
Vuex.Store.prototype.$vm = app;
