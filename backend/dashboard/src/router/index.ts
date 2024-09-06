import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import Home from '@/views/Home.vue'
import { useUserStore } from '@/stores/user'
import { useLoadingStore } from '@/stores/loading'

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        name: 'home',
        component: Home,
        meta: {
            title: 'Stream Manipulations - Dashboard',
            auth: false,
        },
    },
    {
        path: '/history',
        name: 'history',
        component: () => import('@/views/History.vue'),
        meta: {
            title: 'Stream Manipulations - History',
            auth: true,
        },
    },
    {
        path: '/actions',
        name: 'actions',
        component: () => import('@/views/Actions.vue'),
        meta: {
            title: 'Stream Manipulations - Actions',
            auth: true,
        },
    },
    {
        path: '/channel_points',
        name: 'channel_points',
        component: () => import('@/views/ChannelPoints.vue'),
        meta: {
            title: 'Stream Manipulations - Channel Point Rewards',
            auth: true,
        },
    },
    {
        path: '/:path(.*)*',
        name: 'not_found',
        redirect: { name: 'home' }
    }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: routes,
})

router.beforeEach(async (to, from, next) => {
    useLoadingStore().start()
    const userStore = useUserStore()
    await userStore.loadUser()
    if (to.meta.auth) {
        const userStore = useUserStore()
        if (!userStore.hasUser) {
            next({ name: 'home' })
        }
    }
    next()
})

router.afterEach((to) => {
    useLoadingStore().finish()
    document.title = (to.meta.title as string) || 'Stream Manipulations'
})

export default router
