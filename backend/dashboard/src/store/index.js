import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersist from 'vuex-persist'
import moment from 'moment'
import orderBy from 'lodash.orderby'
import localforage from 'localforage'

import router from '@/router'
import { ADD_ACTION, ADD_ACTIONS, ADD_UNWATCHED, CLEAR_UNWATCHED, SET_USER, UPDATE_ANIMATED_ICONS, SOCKET_UPDATE_GAME_CONNECTION } from './mutation-types'

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
    actions: {},
    unwatchedActions: [],
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
    getUnwatchedAmount: (state) => {
      return state.unwatchedActions.length
    },
    getUnwatchedActions: (state) => (game) => {
      return state.unwatchedActions
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
