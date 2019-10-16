<template>
  <b-card no-body class="mb-1">
    <b-card-header header-tag="header" class="p-1" role="tab">
      <b-button block href="#" v-b-toggle.actions variant="primary">Actions
        <fa class="when-opened" icon="chevron-up"></fa>
        <fa class="when-closed" icon="chevron-down"></fa>
        </b-button>
    </b-card-header>
    <b-collapse id="actions" accordion="actions" role="tabpanel">
      <b-card-body>
        <b-alert v-model="isChanged" variant="warning">
          <b-row>
            <b-col cols="auto" class="mr-auto">You have unsaved changes!</b-col>
            <b-col cols="auto">
              <b-button variant="outline-info" @click="undoChanges">Undo</b-button>
            </b-col>
          </b-row>
        </b-alert>
        <b-dropdown variant="info" right class="mr-1" text="Add Action">
          <b-dropdown-item
            v-for="(value, index) in gamedata"
            v-bind:key="index"
            @click="addAction(index)">
              {{ value.title }}
          </b-dropdown-item>
        </b-dropdown>
        <b-button variant="outline-success" @click="saveActions">Save Actions</b-button>
        <transition name="fade">
          <span v-if="show_saved" class="text-success ml-3">Saved <fa icon="check"></fa></span>
        </transition>
        <b-table
          :items="actions"
          :busy="bitProducts === null"
          :fields="fields"
          striped
          hover
          class="mt-2">
          <template v-slot:table-busy>
            <div class="text-center text-danger my-2">
              <b-spinner class="align-middle"></b-spinner>
              <strong>Loading...</strong>
            </div>
          </template>
          <template v-slot:cell(sku)="row">
            {{ getPrice(row.value) }}
          </template>
          <template v-slot:cell(actions)="row">
            <b-button
              variant="outline-info"
              class="mr-1"
              @click="editAction(row.index)">
                Edit
            </b-button>
            <b-button variant="outline-danger" @click="removeAction(row.index)">Remove</b-button>
          </template>
        </b-table>
      </b-card-body>
    </b-collapse>


    <b-modal
    ref="add_action_modal"
    v-model="modalShow"
    :busy="true"
    title="Add action"
    @hidden="resetModal"
    @show="$v.selectedAction.$touch()"
    @ok="saveAction">
      <b-form-group
      label="Title"
      description="The title to show to viewers"
      label-for="title_input">
        <b-form-input
        v-model="$v.selectedAction.title.$model"
        :state="$v.selectedAction.title.$dirty ? !$v.selectedAction.title.$error: null"
        aria-describedby="title-feedback"
        id="title_input">
        </b-form-input>
        <b-form-invalid-feedback id="title-feedback">
          You need to have a title for the viewer to see
        </b-form-invalid-feedback>
      </b-form-group>
      <b-form-group
      label="Description"
      description="The description to show the user"
      label-for="description_input">
        <b-form-input
        v-model="$v.selectedAction.description.$model"
        :state="$v.selectedAction.description.$dirty ? !$v.selectedAction.description.$error: null"
        aria-describedby="description-feedback"
        id="description_input">
        </b-form-input>
        <b-form-invalid-feedback id="description-feedback">
          You need to have a description for the viewer to see
        </b-form-invalid-feedback>
      </b-form-group>
      <hr>
      <b-form
      ref="modal_form"
      :novalidate="true"
      @submit.stop.prevent="saveAction">
        <b-form-group
        label="Bits"
        label-for="bits_input"
        class="mb-3">
          <b-form-select
          v-model="$v.selectedAction.sku.$model"
          :options="getBitOptions"
          :state="$v.selectedAction.sku.$dirty ? !$v.selectedAction.sku.$error: null"
          aria-describedby="bits-feedback"
          id="bits_input">
          </b-form-select>
          <b-form-invalid-feedback id="bits-feedback">
            You need to select the amount of bits needed for this action.
          </b-form-invalid-feedback>
        </b-form-group>
        <b-form-group
        v-if="selectedData.message"
        label="Message"
        description="Optional"
        label-for="message_input">
        <b-form-input
          id="message_input"
          v-model="selectedAction.message"
          :required="selectedData.message"
          placeholder="Enter the message to show in-game"></b-form-input>
        </b-form-group>
        <div v-if="selectedData.settings !== undefined">
          <hr>
          <b-form-group
          v-for="(value, index) in selectedData.settings"
          :key="index"
          :label="value.title"
          :description="value.description"
          :label-for="`settings_${index}`">
            <b-form-input
            :type="value.type"
            :id="`settings-${index}`"
            v-model="selectedAction.settings[value.key]"
            :min="value.min || 0"
            :max="value.max">
            </b-form-input>
          </b-form-group>
        </div>
      </b-form>
      <template v-slot:modal-footer="{ ok, cancel, hide }">
        <b-button
        class="mt-3"
        variant="outline-success"
        block
        @click="ok()"
        :disabled="$v.selectedAction.$invalid">
          Done
        </b-button>
      </template>
    </b-modal>
  </b-card>
</template>

<script>
import { required } from 'vuelidate/lib/validators';
import isEqual from 'lodash.isequal';
import cloneDeep from 'lodash.clonedeep';

export default {
  name: 'ConfigActions',
  data() {
    return {
      gamedata: [],
      actions: [],
      defaultActions: [],
      configVersion: '',
      bitProducts: null,
      fields: [
        { key: 'title', sortable: false },
        { key: 'sku', label: 'Bits', sortable: false },
        'actions'],
      selectedData: {},
      selectedAction: {},
      selectedActionIndex: -1,
      modalShow: false,
      show_saved: false,
    };
  },
  validations: {
    selectedAction: {
      title: {
        required,
      },
      description: {
        required,
      },
      sku: {
        required,
      },
    },
  },
  methods: {
    getActionData() {
      this.axios.get('game/spaceengineers').then((result) => {
        this.gamedata = result.data.data;
      });
    },
    addAction(index) {
      this.selectedData = this.gamedata[index];
      this.selectedAction = {
        action: this.selectedData.action,
        title: this.selectedData.title,
        description: this.selectedData.description,
        sku: null,
      };
      if (this.selectedData.settings) {
        this.selectedAction.settings = {};
        this.selectedData.settings.forEach((data) => {
          this.selectedAction.settings[data.key] = cloneDeep(data.default);
        });
      }
      this.modalShow = true;
    },
    editAction(index) {
      this.selectedAction = this.actions[index];
      this.selectedData = this.gamedata.find(d => d.action === this.selectedAction.action);
      this.selectedActionIndex = index;
      this.modalShow = true;
    },
    removeAction(index) {
      this.actions.splice(index, 1);
    },
    resetModal() {
      this.selectedActionIndex = -1;
    },
    undoChanges() {
      this.actions = cloneDeep(this.defaultActions);
    },
    saveAction(bvModalEvt) {
      bvModalEvt.preventDefault();

      this.$v.selectedAction.$touch();
      if (this.$v.selectedAction.$anyError) {
        return;
      }

      if (this.selectedActionIndex === -1) {
        this.actions.push(this.selectedAction);
      } else {
        this.$set(this.actions, this.selectedActionIndex, this.selectedAction);
      }

      this.$nextTick(() => {
        this.$refs.add_action_modal.hide();
      });
    },
    saveActions() {
      this.$twitchExtension.configuration.set('broadcaster', '1.0', JSON.stringify(this.actions));
      this.axios.post('/actions/spaceengineers', { config: this.actions });
      this.show_saved = true;
      this.defaultActions = cloneDeep(this.actions);
      setTimeout(() => { this.show_saved = false; }, 1500);
    },
    getPrice(sku) {
      const product = this.bitProducts.find(p => p.sku === sku);
      return (product && product.cost.amount) || 0;
    },
    tap(value, fn) {
      fn(value);
      return value;
    },
    getOptions(value) {
      const ret = [];
      value.options.forEach((option) => {
        ret.push({ value: option.type, text: option.title });
      });
      return ret;
    },
  },
  computed: {
    getBitOptions() {
      return this.bitProducts !== null
        ? this.tap(this.bitProducts.map(o => ({ value: o.sku, text: o.cost.amount })), m => m.unshift({ value: null, text: 'Select the amount of bits for this action', disabled: true }))
        : {};
    },
    isChanged() {
      return !isEqual(this.actions, this.defaultActions);
    },
  },
  beforeMount() {
    this.getActionData();
    const conf = this.$twitchExtension.configuration.broadcaster;
    this.actions = conf !== undefined ? JSON.parse(conf.content) : [];
    this.defaultActions = cloneDeep(this.actions);
    this.configVersion = conf !== undefined ? conf.version : '0';
    this.$twitchExtension.bits.getProducts().then((data) => {
      this.bitProducts = data;
      this.bitProducts.sort((a, b) => a.cost.amount - b.cost.amount);
    });
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity .5s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}
</style>
