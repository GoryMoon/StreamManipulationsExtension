import { createApp } from 'vue'
// import '@/devtools'; // Import before vuex to make state listener work
import BootstrapVue3 from 'bootstrap-vue-3'

// Replace with ky?
import axios from 'axios'
import VueAxios from 'vue-axios'

import simpleBar from 'simplebar-vue'
import 'simplebar/dist/simplebar.css'

import Bugsnag from '@bugsnag/js'
import BugsnagPluginVue from '@bugsnag/plugin-vue'

import { library } from '@fortawesome/fontawesome-svg-core'
import {
    faAngleLeft
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

import router from '@/routers/router'
import store from '@/stores/store'
import App from './app.vue'
import '@/assets/component.scss'

// Vue.config.devtools = process.env.NODE_ENV === 'development
Bugsnag.start({
    apiKey: '132bdbeb27fb56546d9529e9000eda79',
    plugins: [new BugsnagPluginVue()],
    collectUserIp: false,
    autoNotify: (process.env.NODE_ENV !== 'development'),
    appVersion: '1.0.4'
})
const bugsnagVue = Bugsnag.getPlugin('vue')

let URL
if (process.env.NODE_ENV !== 'development') {
    URL = 'https://smapi.gorymoon.se/v2/'
} else {
    URL = 'http://localhost:3000/v2/'
}

library.add(faAngleLeft)

createApp(App)
    .use(store)
    .use(router)
    .use(BootstrapVue3)
    .use(VueAxios, axios.create({
        baseURL: URL,
        headers: { 'Access-Control-Allow-Origin': '*' }
    }))
    .use(bugsnagVue)
    .component('simpleBar', simpleBar)
    .component('fa', FontAwesomeIcon)
    .mount('#app')
