import { defineStore } from 'pinia'
import { useConnectionStore } from './connection'

interface User {
    id: string
    displayName: string
    username: string
    profileUrl: string
    photos: Array<UserPhoto>,
    token: string
}

interface UserPhoto {
    type: string
    value: string
}

interface State {
    user: User | null
}

const serverUrl = import.meta.env.DEV ? 'http://localhost:3000' : ''

export const useUserStore = defineStore('user', {
    state: (): State => {
        return {
            user: null,
        }
    },
    getters: {
        hasUser: state => state.user != null
    },
    actions: {
        setUser(user: User) {
            this.user = user
        },
        async loadUser(): Promise<void> {
            const conStore = useConnectionStore()
            try {
                const resp = await fetch(`${serverUrl}/dashboard/me`)
                if (resp.ok) {
                    const user = await resp.json()
                    this.setUser(user)
                    conStore.connect(user.token)
                }
                
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (e) { /* empty */ }
        }
    },
})
