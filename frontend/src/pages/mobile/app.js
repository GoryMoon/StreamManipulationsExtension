import Vue from 'vue';
import BootstrapVue from 'bootstrap-vue';
import axios from 'axios';
import VueAxios from 'vue-axios';
import devtools from '@vue/devtools';
import OverlayScrollbars from 'overlayscrollbars';
import { OverlayScrollbarsPlugin } from 'overlayscrollbars-vue';
import 'overlayscrollbars/css/OverlayScrollbars.css';
import '../../assets/os-theme-thin-light.css';

import App from './app.vue';
import router from '@/routers/router';
import store from '@/stores/store';
import '../../assets/component.scss';

Vue.config.productionTip = false;
let URL;

if (process.env.NODE_ENV === 'development') {
  devtools.connect('http://localhost', 8098);
  URL = 'http://localhost:3000/v1/';
} else {
  URL = 'https://seapi.gorymoon.se/v1/';
}

Vue.use(BootstrapVue);
Vue.use(VueAxios, axios.create({
  baseURL: URL,
  headers: { 'Access-Control-Allow-Origin': '*' },
}));
Vue.use(OverlayScrollbarsPlugin);

new Vue({
  router,
  store,
  render: h => h(App),
}).$mount('#app');

OverlayScrollbars(document.body, {
  className: 'os-theme-thin-light',
  scrollbars: {
    autoHide: 'move',
  },
});
