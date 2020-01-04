<template>
  <b-card no-body class="mb-1">
    <b-card-header header-tag="header" class="p-1" role="tab">
      <b-button block href="#" v-b-toggle.token variant="primary">Mod Token
        <fa class="when-opened" icon="chevron-up"></fa>
        <fa class="when-closed" icon="chevron-down"></fa>
        </b-button>
    </b-card-header>
    <b-collapse id="token" visible accordion="token" role="tabpanel">
      <b-card-body>
        <b-card-text>
          You need to copy the token bellow into the game mod/plugin settings. Follow the
          setup of the mod/plugin to find where to do it.
        </b-card-text>
        <b-input-group>
          <b-form-input
            type="text"
            v-model="getToken"
            :placeholder="getPlaceholder"
            readonly>
          </b-form-input>
          <b-input-group-append id="copy-wrapper" class="d-inline-block" tabindex="0">
            <b-button
              :pressed.sync="showingToken"
              variant="outline-secondary"
              :disabled="!loadedToken"
              :style="{ 'pointer-events': !loadedToken ? 'none': 'inherit'}">
              <fa v-show="!showingToken" icon="eye-slash"></fa>
              <fa v-show="showingToken" icon="eye"></fa>
            </b-button>
            <b-button
              v-clipboard:copy="token"
              variant="outline-info"
              :disabled="!loadedToken"
              :style="{ 'pointer-events': !loadedToken ? 'none': 'inherit'}">
              Copy
            </b-button>
          </b-input-group-append>
          <b-tooltip target="copy-wrapper" v-if="!loadedToken">
            Token hasn't loaded yet
          </b-tooltip>
        </b-input-group>
        <hr>
        <p>
          If you need to refresh the token you can use this button,
          the previous token will be invalidated.
        </p>
        <b-button @click="requestToken" variant="outline-danger">Refresh Token</b-button>
      </b-card-body>
    </b-collapse>
  </b-card>
</template>

<script>
import debounce from 'lodash/debounce';
import repeat from 'lodash/repeat';

import { SET_DEV } from '@/stores/mutation-types';

export default {
  name: 'config-token',
  data() {
    return {
      showingToken: false,
      loadedToken: false,
      token: 'Not loaded yet',
    };
  },
  methods: {
    requestToken: debounce(function request() {
      this.updateToken('token/create');
    }, 400, { leading: true, trailing: false }),
    updateToken(path = 'token') {
      this.axios.get(path, {
        headers: {
          authorization: `Bearer ${this.$twitchExtension.viewer.sessionToken}`,
        },
      }).then((result) => {
        if (result.data !== undefined) {
          this.token = result.data.token;
          if (path === 'token') {
            this.$store.commit(SET_DEV, result.data.dev);
          }
          this.loadedToken = true;
        } else {
          this.$bugsnag.notify(new Error('Can\'t get the mod token'));
          this.errorMsg('An error occured when fetching the token, try again later.');
        }
      }).catch((err) => {
        this.$bugsnag.notify(err);
        this.errorMsg('An error occured when fetching the token, try again later.');
      });
    },
    errorMsg(msg) {
      this.$bvModal.msgBoxOk(msg, {
        title: 'Error',
        size: 'sm',
        buttonSize: 'sm',
        okVariant: 'error',
        headerClass: 'p-2 border-bottom-0',
        footerClass: 'p-2 border-top-0',
        centered: true,
      }).catch((error) => {
        this.$bugsnag.notify(error);
        console.error(`An error ocurred: ${JSON.stringify(error)}`);
      });
    },
  },
  computed: {
    getToken() {
      return !this.showingToken ? '' : this.token;
    },
    getPlaceholder() {
      return repeat('*', 100);
    },
  },
  mounted() {
    this.updateToken();
  },
};
</script>

<style scoped>
</style>
