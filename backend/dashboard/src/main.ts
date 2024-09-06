import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createBootstrap } from 'bootstrap-vue-next'

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue-next/dist/bootstrap-vue-next.css'

import 'overlayscrollbars/overlayscrollbars.css'

import { library } from '@fortawesome/fontawesome-svg-core'
import { faLink, faUnlink } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

import App from '@/App.vue'
import router from './router'
import { OverlayScrollbars } from 'overlayscrollbars'

library.add(faLink, faUnlink)

createApp(App)
    .component('fa', FontAwesomeIcon)
    .use(createBootstrap())
    .use(createPinia())
    .use(router)
    .mount('#app')

OverlayScrollbars(document.body, {
    scrollbars: { autoHide: 'scroll', theme: 'os-theme-light' }
})