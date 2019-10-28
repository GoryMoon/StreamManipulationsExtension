import Vue from 'vue'
import BootstrapVue from 'bootstrap-vue'
import VueSocketIOExt from 'vue-socket.io-extended'
import io from 'socket.io-client'
import OverlayScrollbars from 'overlayscrollbars'
import 'overlayscrollbars/css/OverlayScrollbars.css'
import './assets/os-theme-thin-light.css'

import { library } from '@fortawesome/fontawesome-svg-core'
import {
  faLink, faUnlink
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

import App from './App.vue'
import store from './store'
import { SET_USER } from './store/mutation-types'
import './assets/custom.scss'
import router from './router'

Vue.config.productionTip = false
if (window.User !== undefined && window.User.length > 0) {
  store.commit(SET_USER, JSON.parse(window.User))
  window.User = undefined
}

Vue.use(BootstrapVue)
library.add(faLink, faUnlink)
Vue.component('fa', FontAwesomeIcon)

const socket = io(process.env.VUE_APP_URL + '/dashboard', { autoConnect: false })
Vue.use(VueSocketIOExt, socket, { store })

if (store.getters.hasUser) {
  socket.io.opts.query = {
    token: store.state.user.token
  }
  socket.connect()
}

new Vue({
  store,
  router,
  render: h => h(App)
}).$mount('#app')

OverlayScrollbars(document.body, {
  className: 'os-theme-thin-light'
})
