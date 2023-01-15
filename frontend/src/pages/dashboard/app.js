import Vue from 'vue'
import store from '@/stores/store'
import App from './app.vue'

Vue.config.productionTip = false

new Vue({
    store,
    render: (h) => h(App)
}).$mount('#app')
