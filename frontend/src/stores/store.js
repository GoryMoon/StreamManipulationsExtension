import Vue from 'vue';
import Vuex from 'vuex';
import { ExtensionPlugin } from 'twitchext-vuex/src/index';

Vue.use(Vuex);

const store = new Vuex.Store({

});

Vue.use(ExtensionPlugin, { store });

export default store;
