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
          You need to copy the token bellow into the <code>TWITCH_TOKEN</code> field in the
          <code>token-settings.toml</code> file for the plugin.
        </b-card-text>
        <b-input-group>
          <b-form-input type="text" v-model="getToken" readonly></b-form-input>
          <b-input-group-append>
            <b-button :pressed.sync="showingToken" variant="outline-secondary">
              <fa v-show="!showingToken" icon="eye-slash"></fa>
              <fa v-show="showingToken" icon="eye"></fa>
            </b-button>
            <b-button
              v-clipboard:copy="token"
              variant="outline-info">
              Copy
            </b-button>
          </b-input-group-append>
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
import debounce from 'lodash.debounce';

export default {
  name: 'ConfigToken',
  data() {
    return {
      showingToken: false,
      token: 'Not loaded yet',
    };
  },
  methods: {
    requestToken: debounce(function request() {
      this.updateToken('token/create');
    }, 400, { leading: true, trailing: false }),
    updateToken(path = 'token') {
      const that = this;
      this.axios.get(path, {
        headers: {
          authorization: `Bearer ${this.$twitchExtension.viewer.sessionToken}`,
        },
      }).then((result) => {
        that.token = result.data.token;
      });
    },
  },
  computed: {
    getToken() {
      return !this.showingToken ? '********************************' : this.token;
    },
  },
  mounted() {
    this.updateToken();
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
