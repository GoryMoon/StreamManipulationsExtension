import { socket } from '@/socket'
import type { IConfigData } from '@/types'
import { defineStore } from 'pinia'

interface State {
    configs: IConfigData[]
}

export const useConfigStore = defineStore('config', {
    state: (): State => {
        return {
            configs: [],
        }
    },

    getters: {
        getActions() {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            return (_game: string) => {
                return this.configs
            }
        },
    },

    actions: {
        bindEvents() {
            socket.on('config', configData => {
                this.configs = configData
            })
        },
    },
})
