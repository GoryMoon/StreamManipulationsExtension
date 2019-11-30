import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'
import store from '../store'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home,
    meta: {
      title: 'Stream Engineer - Dashboard',
      auth: false
    }
  },
  {
    path: '/replay',
    name: 'replay',
    component: () => import('../views/Replay.vue'),
    meta: {
      title: 'Stream Engineer - Replay Actions',
      auth: true
    }
  },
  {
    path: '/actions',
    name: 'actions',
    component: () => import('../views/Actions.vue'),
    meta: {
      title: 'Stream Engineer - Actions',
      auth: true
    }
  },
  {
    path: '/chat',
    name: 'chat',
    component: () => import('../views/Chat.vue'),
    meta: {
      title: 'Stream Engineer - Chat',
      auth: true
    }
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

router.beforeEach((to, from, next) => {
  if (to.matched.some(r => r.meta.auth)) {
    if (!store.getters.hasUser) {
      next('/')
      return
    }
  }
  document.title = to.meta.title || 'Stream Engineer'
  next()
})

export default router
