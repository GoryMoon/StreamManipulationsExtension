import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersist from 'vuex-persist'
import moment from 'moment'
import orderBy from 'lodash.orderby'
import remove from 'lodash.remove'
import localforage from 'localforage'

import router from '@/router'
import {
  ADD_ACTION, ADD_ACTIONS, ADD_UNWATCHED, CLEAR_UNWATCHED, SET_USER,
  UPDATE_ANIMATED_ICONS, SOCKET_UPDATE_GAME_CONNECTION, SOCKET_CONFIG,
  SOCKET_CHAT_MSG, SOCKET_UPDATE_CHAT_STATUS
} from './mutation-types'

Vue.use(Vuex)

const vuexStorage = new VuexPersist({
  strictMode: process.env.NODE_ENV !== 'production',
  key: 'stream_engineer',
  storage: localforage,
  asyncStorage: true,
  reducer: (state) => ({ animatedIcons: state.animatedIcons })
})

export default new Vuex.Store({
  strict: process.env.NODE_ENV !== 'production',
  plugins: [vuexStorage.plugin],
  state: {
    user: null,
    config: [],
    actions: {},
    unwatchedActions: [],
    chatMessages: [],
    chatStatus: false,
    animatedIcons: true,
    gameConnected: false
  },
  getters: {
    hasUser: state => {
      return state.user !== null
    },
    getActions: (state) => (game) => {
      return orderBy(Object.values(state.actions).filter(action => action.game === game), (o) => {
        return moment(o.createdAt)
      }, ['desc'])
    },
    getChat: (state) => {
      return state.chatMessages
    },
    getUnwatchedAmount: (state) => {
      return state.unwatchedActions.length
    },
    getUnwatchedActions: (state) => (game) => {
      return state.unwatchedActions
    },
    getConfig: (state) => {
      return state.config
    }
  },
  mutations: {
    [SET_USER] (state, user) {
      state.user = user
    },
    [ADD_ACTIONS] (state, actions) {
      actions.forEach(action => {
        Vue.set(state.actions, action._id, action)
      })
    },
    [ADD_ACTION] (state, action) {
      Vue.set(state.actions, action._id, action)
    },
    [ADD_UNWATCHED] (state, id) {
      state.unwatchedActions.push(id)
    },
    [CLEAR_UNWATCHED] (state) {
      state.unwatchedActions = []
    },
    [UPDATE_ANIMATED_ICONS] (state, value) {
      state.animatedIcons = value
    },
    [SOCKET_UPDATE_GAME_CONNECTION] (state, value) {
      state.gameConnected = value
    },
    [SOCKET_CONFIG] (state, config) {
      state.config = config
    },
    [SOCKET_CHAT_MSG] (state, msg) {
      if (state.chatMessages.some(m => m.id === msg.id)) {
        remove(state.chatMessages, (m) => m.id === msg.id)
      }
      state.chatMessages.unshift(msg)
    },
    [SOCKET_UPDATE_CHAT_STATUS] (state, status) {
      state.chatStatus = status
    },
    RESTORE_MUTATION: vuexStorage.RESTORE_MUTATION
  },
  actions: {
    socket_connectActions ({ commit }, data) {
      commit(ADD_ACTIONS, data)
    },
    socket_action ({ commit }, data) {
      commit(ADD_ACTION, data)
      if (router.currentRoute.name !== 'actions') {
        commit(ADD_UNWATCHED, data._id)
      }
    },
    load_more_actions ({ state }) {
      const amount = Object.values(state.actions).length
      this._vm.$socket.client.emit('more-actions', amount)
    }
  }
})
