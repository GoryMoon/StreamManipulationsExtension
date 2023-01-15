<template>
  <b-card no-body>
    <b-card-header header-tag="header" class="p-1" role="tab">
      <b-button block href="#" v-b-toggle.actions variant="primary">Actions
        <fa class="when-opened" icon="chevron-up"></fa>
        <fa class="when-closed" icon="chevron-down"></fa>
      </b-button>
    </b-card-header>
    <b-collapse id="actions" accordion="actions" role="tabpanel">
      <b-card-body>
        <div v-if="games !== null">
          <h5 class="text-center mb-3">Game</h5>
          <v-select
            :options="getFilteredGames"
            v-model="selectedGame"
            @input="selectGame"
            label="name"
            placeholder="Select Game"
          ></v-select>
          <hr>
        </div>
        <div v-else>
          <b-spinner class="text-center"></b-spinner>
        </div>
        <div
          v-if="actions !== null && bitProducts !== null">
          <h5 class="text-center mb-3">Actions</h5>
          <b-alert :show="selectedGame !== null && selectedGame.dev" variant="warning">
              <h4 class="alert-heading">Game in Dev Mode!</h4>
              This game is in dev mode, actions for games in this mode doesn't take any bits.
            </b-alert>
          <transition name="fade">
            <b-alert v-model="show_update" variant="warning">
              <b-row>
                <b-col cols="auto" class="mr-auto">
                  <h4 class="alert-heading">Config update required!</h4>
                  Save actions below or press the update button to the right
                  </b-col>
                <b-col cols="auto">
                  <b-button variant="info" @click="saveActions">Update</b-button>
                </b-col>
              </b-row>
            </b-alert>
          </transition>
          <transition name="fade">
            <b-alert v-model="areActionsChanged" variant="warning">
              <b-row>
                <b-col cols="auto" class="mr-auto">You have unsaved changes!</b-col>
                <b-col cols="auto">
                  <b-button variant="info" @click="undoChanges">Undo</b-button>
                </b-col>
              </b-row>
            </b-alert>
          </transition>
          <b-row>
            <b-col cols="4">
              <v-select
                label="title"
                :options="actionData"
                v-model="selectedInputData"
                placeholder="Add Action"
                @input="addAction"
              ></v-select>
            </b-col>
            <b-col cols="8">
              <b-button variant="outline-success" @click="saveActions">Save Actions</b-button>
              <transition name="fade">
                <span
                v-if="show_saved"
                class="text-success ml-3">
                Saved <fa icon="check"></fa></span>
              </transition>
            </b-col>
          </b-row>
          <b-table-simple
            v-if="actions.length > 0"
            striped
            hover
            class="mt-2">
            <b-thead>
              <b-tr>
                <b-th>#</b-th>
                <b-th>Action</b-th>
                <b-th>Bits</b-th>
                <b-th>Tools</b-th>
              </b-tr>
            </b-thead>
            <draggable
            tag="b-tbody"
            v-model="actions"
            ghost-class="ghost">
              <tr v-for="action in actions" :key="action.key" class="draggable_action">
                <td><fa class="action_icon" icon="grip-lines"></fa> </td>
                <td>
                  {{ action.title }}<br>
                  <small>Type: <span class="text-info">{{ action.action }}</span></small>
                </td>
                <td>
                  <bits-display
                   :bits="getPrice(action.sku)"
                   text-class="h6"
                   :animated="true"
                   width="25"
                   height="25">
                  </bits-display>
                </td>
                <td>
                  <b-button
                    variant="info"
                    class="mr-1"
                    @click="editAction(action.key)">
                    <fa icon="wrench"/> Edit
                  </b-button>
                  <b-button
                    variant="outline-danger"
                    @click="removeAction(action.key)">
                    <fa icon="trash-alt"/> Remove</b-button>
                </td>
              </tr>
            </draggable>
          </b-table-simple>
          <div
          v-else
          class="text-center mt-4">
              <h5>No actions</h5>
              <small class="text-muted">Start by adding an action above</small>
            </div>
        </div>
        <div v-else-if="selectedGame !== null" class="text-center mt-3">
          <h4 class="pb-2">Loading actions</h4>
          <b-spinner variant="info"></b-spinner>
        </div>
        <div v-else class="text-center mt-3">
          <h4>Select a game to continue</h4>
        </div>
      </b-card-body>
    </b-collapse>

    <b-modal
    ref="add_action_modal"
    v-model="modalShow"
    :busy="true"
    @hidden="resetModal"
    @show="showModal"
    @shown="shownModal"
    @ok="saveAction">
      <template v-slot:modal-title="{}">
        {{ selectedData.title }}<br>
        <small class="text-muted">{{ selectedData.description }}</small>
      </template>
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
        description="(Optional) Will show in-game"
        label-for="message_input">
        <b-form-input
          id="message_input"
          v-model="selectedAction.message"
          :required="selectedData.message"
          placeholder="Enter the message to show in-game"></b-form-input>
        </b-form-group>
        <div v-if="selectedData.settings !== undefined">
          <hr>
          <input-component
            v-for="(value, index) in selectedData.settings"
            :key="index"
            :index="index"
            :data="value"
            :id="`settings_${index}`"
            v-model="selectedAction.settings[value.key]">
          </input-component>
        </div>
      </b-form>
      <template v-slot:modal-footer="{ ok }">
        <b-button
        :variant="$v.selectedAction.$invalid ? 'outline-success': 'success'"
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
import _cloneDeep from 'lodash/cloneDeep'
import _debounce from 'lodash/debounce'
import _pick from 'lodash/pick'
import _map from 'lodash/map'
import _find from 'lodash/find'
import _findIndex from 'lodash/findIndex'
import draggable from 'vuedraggable'
import { required } from 'vuelidate/lib/validators'
import { mapState, mapGetters } from 'vuex'
import Simplebar from 'simplebar'

import { GET_GAMES, GET_ACTION_DATA, GET_GAME_ACTIONS } from '@/stores/action-types'
import {
    SET_ACTIONS, SET_DEFAULT_ACTIONS, SET_BIT_PRODUCTS,
    ADD_ACTION, SET_ACTION, REMOVE_ACTION
} from '@/stores/mutation-types'
import InputComponent from './InputComponent.vue'
import BitsDisplay from './BitsDisplay.vue'

export default {
    name: 'config-actions',
    components: {
        draggable,
        InputComponent,
        BitsDisplay
    },
    data () {
        return {
            selectedGame: null,
            selectedInputData: null,
            selectedData: {},
            selectedAction: {},
            selectedActionIndex: -1,
            modalShow: false,
            show_saved: false,
            show_update: false
        }
    },
    validations: {
        selectedAction: {
            title: {
                required
            },
            description: {
                required
            },
            sku: {
                required
            }
        }
    },
    methods: {
        selectGame (game) {
            if (game !== null) {
                this.$store.dispatch(GET_ACTION_DATA, game.id)
                this.$store.dispatch(GET_GAME_ACTIONS, game.id)
            } else {
                this.$store.commit(SET_ACTIONS, null)
                this.$store.commit(SET_DEFAULT_ACTIONS, null)
            }
        },
        addAction (action) {
            this.selectedData = action
            this.selectedAction = {
                action: this.selectedData.action,
                title: this.selectedData.title,
                description: this.selectedData.description,
                sku: null
            }
            if (this.selectedData.settings) {
                this.selectedAction.settings = {}
                this.selectedData.settings.forEach((data) => {
                    this.selectedAction.settings[data.key] = _cloneDeep(data.default)
                })
            }
            this.modalShow = true
            this.selectedInputData = null
        },
        editAction (key) {
            const index = _findIndex(this.actions, ['key', key])
            this.selectedAction = _cloneDeep(this.actions[index])
            this.selectedData = _find(this.actionData, ['action', this.selectedAction.action])
            this.selectedActionIndex = index
            this.modalShow = true
        },
        removeAction (key) {
            const index = _findIndex(this.actions, ['key', key])
            this.$store.commit(REMOVE_ACTION, index)
        },
        showModal () {
            this.$v.selectedAction.$touch()
        },
        shownModal (modal) {
            // eslint-disable-next-line no-new
            new Simplebar(modal.vueTarget.$refs.modal)
        },
        resetModal () {
            this.selectedActionIndex = -1
        },
        undoChanges () {
            this.$store.commit(SET_ACTIONS, _cloneDeep(this.defaultActions))
        },
        saveAction (bvModalEvt) {
            bvModalEvt.preventDefault()

            this.$v.selectedAction.$touch()
            if (this.$v.selectedAction.$anyError) {
                return
            }

            if (this.selectedActionIndex === -1) {
                this.selectedAction.key = this.actions.length
                this.$store.commit(ADD_ACTION, this.selectedAction)
            } else {
                this.$store.commit({
                    type: SET_ACTION,
                    index: this.selectedActionIndex,
                    action: this.selectedAction
                })
            }

            this.$nextTick(() => {
                this.$refs.add_action_modal.hide()
            })
        },
        saveActions: _debounce(function request () {
            const newActions = _map(this.actions,
                (val) => _pick(val, ['action', 'description', 'message', 'settings', 'sku', 'title']))
            this.axios.post(`/actions/${this.selectedGame.id}`, { config: newActions }, {
                headers: {
                    authorization: `Bearer ${this.$twitchExtension.viewer.sessionToken}`
                }
            })
            this.show_saved = true
            this.show_update = false
            this.$store.commit(SET_DEFAULT_ACTIONS, _cloneDeep(this.actions))
            setTimeout(() => { this.show_saved = false }, 1500)
        }, 400, { leading: true, trailing: false }),
        tap (value, fn) {
            fn(value)
            return value
        },
        getOptions (value) {
            const ret = []
            value.options.forEach((option) => {
                ret.push({ value: option.type, text: option.title })
            })
            return ret
        }
    },
    computed: {
        getBitOptions () {
            return this.bitProducts !== null && this.selectedGame !== null
                ? this.tap(this.bitProducts
                    .filter((prod) => (this.selectedGame.dev && prod.inDevelopment !== undefined) ||
          (!this.selectedGame.dev && prod.inDevelopment === undefined))
                    .map((o) => ({ value: o.sku, text: (this.selectedGame.dev ? '(Dev) ' : '') + o.cost.amount })),
                (m) => m.unshift({ value: null, text: 'Select the amount of bits for this action', disabled: true }))
                : {}
        },
        actions: {
            get () {
                return this.$store.state.actions
            },
            set (value) {
                this.$store.commit(SET_ACTIONS, value)
            }
        },
        getFilteredGames () {
            return this.games.filter((game) => game.dev === false || game.dev === this.dev)
        },
        ...mapGetters([
            'areActionsChanged',
            'getPrice'
        ]),
        ...mapState([
            'defaultActions',
            'actionData',
            'bitProducts',
            'games',
            'dev'
        ])
    },
    beforeMount () {
        this.$store.dispatch(GET_GAMES)
        const dev = this.$twitchExtension.configuration.developer
        if (dev !== undefined && dev.version !== undefined) {
            if (dev.version === '1.0') {
                this.show_update = true
            }
        }
        this.$twitchExtension.bits.getProducts().then((data) => {
            const products = data
            products.sort((a, b) => a.cost.amount - b.cost.amount)
            this.$store.commit(SET_BIT_PRODUCTS, products)
        })
    }
}
</script>

<style lang="scss" scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity .5s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}

.draggable_action {
  transform: inherit !important;
  cursor: move;

  td {
    vertical-align: middle;
  }

  .action_icon {
    font-size: 18pt;
    text-align: center;
    vertical-align: middle;
  }
}

.ghost {
  opacity: 0.1;
}

</style>
