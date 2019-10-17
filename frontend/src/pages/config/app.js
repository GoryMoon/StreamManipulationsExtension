import Vue from 'vue';
import BootstrapVue from 'bootstrap-vue';
import axios from 'axios';
import VueAxios from 'vue-axios';
import VueClipboard from 'vue-clipboard2';
import Vuelidate from 'vuelidate';
// import devtools from '@vue/devtools';
import OverlayScrollbars from 'overlayscrollbars';
import { OverlayScrollbarsPlugin } from 'overlayscrollbars-vue';
import 'overlayscrollbars/css/OverlayScrollbars.css';
import '../../assets/os-theme-thin-light.css';

import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faExternalLinkAlt, faEyeSlash, faEye, faChevronDown, faChevronUp, faCheck,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import App from './app.vue';
import store from '@/stores/store';
import '../../assets/config.scss';

Vue.config.productionTip = false;
let URL;

if (process.env.NODE_ENV === 'development') {
  // devtools.connect('http://localhost', 8098);
  URL = 'http://localhost:3000/v1/';
} else {
  URL = 'https://seapi.gorymoon.se/v1/';
}

library.add(faExternalLinkAlt, faEyeSlash, faEye, faChevronDown, faChevronUp, faCheck);
Vue.component('fa', FontAwesomeIcon);

Vue.use(BootstrapVue);
Vue.use(VueAxios, axios.create({
  baseURL: URL,
  headers: { 'Access-Control-Allow-Origin': '*' },
}));
Vue.use(VueClipboard);
Vue.use(Vuelidate);
Vue.use(OverlayScrollbarsPlugin);

new Vue({
  store,
  axios,
  render: h => h(App),
}).$mount('#app');

OverlayScrollbars(document.body, {
  className: 'os-theme-thin-light',
});
