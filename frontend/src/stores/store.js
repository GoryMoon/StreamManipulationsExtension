import Vue from 'vue'
import Vuex from 'vuex'
import { ExtensionPlugin } from 'twitchext-vuex'
import cloneDeep from 'lodash/cloneDeep'
import _isEqual from 'lodash/isEqual'

import {
    SET_MAINTENANCE, SET_LOADED, SET_GAMES, SET_ACTIONS, SET_DEFAULT_ACTIONS,
    SET_ACTION_DATA, REMOVE_ACTION, SET_BIT_PRODUCTS, ADD_ACTION, SET_ACTION,
    SET_ACTIVE_GAME, SET_SELECTED_ACTION, SET_TRANSACTION_STATUS, SET_ANONYMOUS_SENDER,
    SET_DEV
} from './mutation-types'
import { GET_GAMES, GET_GAME_ACTIONS, GET_ACTION_DATA } from './action-types'

Vue.config.devtools = process.env.NODE_ENV !== 'production'
Vue.use(Vuex)

const store = new Vuex.Store({
    state: {
        maintenance: false,
        loaded: false,
        games: null,
        actions: null,
        defaultActions: null,
        actionData: [],
        bitProducts: null,
        activeGame: null,
        selectedAction: null,
        transactionStatus: false,
        sendAnonymously: false,
        dev: false
    },
    getters: {
        areActionsChanged: (state) => !_isEqual(state.actions, state.defaultActions),
        getPrice: (state) => (sku) => {
            const product = state.bitProducts.find((p) => p.sku === sku)
            return (product && product.cost.amount) || 0
        }
    },
    actions: {
        [GET_GAMES] ({ commit, dispatch }) {
            this.$vm.axios.get('games', {
                headers: {
                    authorization: `Bearer ${this.$vm.$twitchExtension.viewer.sessionToken}`
                }
            }).then((result) => {
                if (result.data !== undefined) {
                    commit(SET_GAMES, result.data)
                } else {
                    this.$vm.$bugsnag.notify(new Error('Can\'t load games'))
                    dispatch('errorMsg', 'An error occured when fetching games, try again later.')
                }
            }).catch((err) => {
                this.$vm.$bugsnag.notify(err)
                dispatch('errorMsg', 'An error occured when fetching games, try again later.')
            })
        },
        [GET_GAME_ACTIONS] ({ commit, dispatch }, game) {
            commit(SET_ACTIONS, null)
            commit(SET_DEFAULT_ACTIONS, null)

            this.$vm.axios.get(`actions/${game}`, {
                headers: {
                    authorization: `Bearer ${this.$vm.$twitchExtension.viewer.sessionToken}`
                }
            }).then((result) => {
                if (result.data !== undefined) {
                    const actions = result.data.data
                    actions.forEach((e, i) => {
                        e.key = i
                    })
                    commit(SET_ACTIONS, actions)
                    commit(SET_DEFAULT_ACTIONS, cloneDeep(actions))
                } else {
                    this.$vm.$bugsnag.notify(new Error(`Can't load actions for game ${game}`))
                    dispatch('errorMsg', 'An error occured when fetching game actions, try again later.')
                }
            }).catch((err) => {
                this.$vm.$bugsnag.notify(err)
                dispatch('errorMsg', 'An error occured when fetching game actions, try again later.')
            })
        },
        [GET_ACTION_DATA] ({ commit, dispatch }, game) {
            this.$vm.axios.get(`game/${game}`, {
                headers: {
                    authorization: `Bearer ${this.$vm.$twitchExtension.viewer.sessionToken}`
                }
            }).then((result) => {
                if (result.data !== undefined) {
                    const gamedata = result.data.data
                    gamedata.forEach((e, i) => {
                        e.id = i
                    })
                    commit(SET_ACTION_DATA, gamedata)
                } else {
                    this.$vm.$bugsnag.notify(new Error(`Can't load data for game ${game}`))
                    dispatch('errorMsg', 'An error occured when fetching action data, try again later.')
                }
            }).catch((err) => {
                this.$vm.$bugsnag.notify(err)
                dispatch('errorMsg', 'An error occured when fetching action data, try again later.')
            })
        },
        errorMsg (_, msg) {
            this.$vm.$bvModal.msgBoxOk(msg, {
                title: 'Error',
                size: 'sm',
                buttonSize: 'sm',
                okVariant: 'error',
                headerClass: 'p-2 border-bottom-0',
                footerClass: 'p-2 border-top-0',
                centered: true
            }).catch((error) => {
                this.$vm.$bugsnag.notify(error)
                console.error(`An error ocurred: ${JSON.stringify(error.response)}`)
            })
        }
    },
    mutations: {
        [SET_MAINTENANCE] (state, value) {
            state.maintenance = value
        },
        [SET_LOADED] (state, value) {
            state.loaded = value
        },
        [SET_GAMES] (state, games) {
            state.games = games
        },
        [SET_ACTIONS] (state, actions) {
            state.actions = actions
        },
        [SET_DEFAULT_ACTIONS] (state, actions) {
            state.defaultActions = actions
        },
        [SET_ACTION_DATA] (state, actions) {
            state.actionData = actions
        },
        [SET_BIT_PRODUCTS] (state, products) {
            state.bitProducts = products
        },
        [ADD_ACTION] (state, action) {
            state.actions.push(action)
        },
        [SET_ACTION] (state, { index, action }) {
            Vue.set(state.actions, index, action)
        },
        [REMOVE_ACTION] (state, index) {
            state.actions.splice(index, 1)
        },
        [SET_ACTIVE_GAME] (state, game) {
            state.activeGame = game
        },
        [SET_TRANSACTION_STATUS] (state, status) {
            state.transactionStatus = status
        },
        [SET_SELECTED_ACTION] (state, action) {
            state.selectedAction = action
        },
        [SET_ANONYMOUS_SENDER] (state, status) {
            state.sendAnonymously = status
        },
        [SET_DEV] (state, status) {
            state.dev = status
        }
    },
    strict: process.env.NODE_ENV !== 'production',
    devtools: process.env.NODE_ENV !== 'production'
})

Vue.use(ExtensionPlugin, {
    store,
    settings: {
        forceFlags: {
            forceIsBitsEnabled: false
        }
    }
})

export default store
