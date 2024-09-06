import { orderBy } from 'lodash'
import { defineStore } from 'pinia'
import moment from 'moment'

import { socket } from '@/socket'
import type { IDashAction } from '@/types'
import { useRoute } from 'vue-router'

interface State {
    actions: Map<string, IDashAction>
    unwatchedActions: string[]
}

export const useHistoryStore = defineStore('history', {
    state: (): State => {
        return {
            actions: new Map<string, IDashAction>(),
            unwatchedActions: [],
        }
    },
    getters: {
        getActions() {
            return (game: string) => {
                return orderBy(
                    Object.values(this.actions).filter(action => action.game === game),
                    o => moment(o.createdAt),
                    ['desc'],
                )
            }
        },
        getUnwatchedAmount(): number {
            return this.unwatchedActions.length
        },
        getUnwatchedActions() {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            return (_game: string) => this.unwatchedActions
        },
    },
    actions: {
        bindEvents() {
            socket.on('connect', () => {
                this.loadMore()
            })

            const route = useRoute()
            socket.on('dash_action', action => {
                this.actions.set(action._id, action)
                if (route.name !== 'actions') this.addUnwatched(action._id)
            })
        },

        /** Loads more actions */
        async loadMore() {
            const actions = await socket.emitWithAck('load_actions', this.actions.size)

            actions.forEach(this.addAction)
        },

        /** Adds an action to the action history */
        addAction(action: IDashAction) {
            this.actions.set(action._id, action)
        },

        /** Adds and action id to the unwatched list */
        addUnwatched(id: string) {
            this.unwatchedActions.push(id)
        },

        /** Clears all unwatched actions */
        clearUnwatched() {
            this.unwatchedActions = []
        },
    },
})
