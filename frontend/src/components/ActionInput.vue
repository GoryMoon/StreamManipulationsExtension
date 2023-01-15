<template>
  <div>
    <h5>{{ data.title }}</h5>
    <small class="text-muted">{{ data.description }}</small>
    <div
      v-for="action in actions" :key="action.key">
      <hr>
      {{ action.title }}<br>
      <small class="text-muted">{{ action.description }}</small>
      <b-form-group
        v-if="data.random"
        class="mt-3"
        label="Weight"
        description="The weight of this item"
        :label-for="`action_weight_${id}_${action.key}`">
        <b-form-input
          type="number"
          :id="`action_weight_${id}_${action.key}`"
          v-model="action.weight"
          @input="$emit('input', getData)"
          placeholder="Weight">
        </b-form-input>
      </b-form-group>
      <b-button-group>
        <b-button
          variant="info"
          @click="editAction(action.key)"
          ><fa icon="wrench"/> Edit Action</b-button>
        <b-button
          variant="outline-danger"
          @click="removeAction(action.key)"
          ><fa icon="trash-alt"/> Remove Action</b-button>
      </b-button-group>
    </div>
    <hr>
    <v-select
      label="title"
      :options="actionData"
      v-model="selectedInputData"
      placeholder="Add Action"
      @input="addAction"
    ></v-select>

    <b-modal
    ref="add_action_modal"
    v-model="modalShow"
    :busy="true"
    @hidden="resetModal"
    @ok="saveAction">
      <template v-slot:modal-title="{}">
        {{ selectedData.title }}<br>
        <small class="text-muted">{{ selectedData.description }}</small>
      </template>
      <b-form
      :ref="`modal_form_${id}`"
      :novalidate="true"
      @submit.stop.prevent="saveAction">
        <div v-if="selectedData.settings !== undefined">
          <input-component
            v-for="(value, index) in selectedData.settings"
            :key="index"
            :index="index"
            :data="value"
            :id="`settings_${id}_${index}`"
            v-model="selectedAction.action[value.key]">
          </input-component>
        </div>
        <div v-else>
          <h5>There are no additional seetings for this action</h5>
        </div>
      </b-form>
      <template v-slot:modal-footer="{ ok }">
        <b-button
        variant="outline-success"
        block
        @click="ok()">
          Done
        </b-button>
      </template>
    </b-modal>
  </div>
</template>

<script>
import _findIndex from 'lodash/findIndex'
import _omit from 'lodash/omit'
import _map from 'lodash/map'
import _cloneDeep from 'lodash/cloneDeep'
import _find from 'lodash/find'
import { mapState } from 'vuex'

export default {
    name: 'action-input',
    props: [
        'value',
        'data'
    ],
    components: {
        'input-component': () => import('./InputComponent.vue')
    },
    data () {
        return {
            id: null,
            actions: [],
            modalShow: false,
            selectedData: {},
            selectedAction: {},
            selectedActionIndex: -1,
            selectedInputData: null
        }
    },
    methods: {
        addAction (action) {
            this.selectedData = _cloneDeep(action)
            this.selectedAction = {
                title: this.selectedData.title,
                description: this.selectedData.description,
                type: this.selectedData.action,
                weight: 0
            }
            this.addMessageField()

            if (this.selectedData.settings) {
                this.selectedAction.action = {}
                this.selectedData.settings.forEach((data) => {
                    this.selectedAction.action[data.key] = _cloneDeep(data.default)
                })
            }

            this.modalShow = true
            this.selectedInputData = null
        },
        editAction (key) {
            const index = _findIndex(this.actions, ['key', key])
            this.selectedAction = _cloneDeep(this.actions[index])
            this.selectedData = _cloneDeep(_find(this.actionData, ['action', this.selectedAction.type]))
            this.addMessageField()
            this.selectedActionIndex = index
            this.modalShow = true
        },
        resetModal () {
            this.selectedActionIndex = -1
        },
        saveAction (bvModalEvt) {
            bvModalEvt.preventDefault()

            if (this.selectedActionIndex === -1) {
                this.selectedAction.key = this.actions.length
                this.actions.push(this.selectedAction)
            } else {
                this.$set(this.actions, this.selectedActionIndex, this.selectedAction)
            }

            this.$nextTick(() => {
                this.$refs.add_action_modal.hide()
            })
            this.$emit('input', this.getData)
        },
        removeAction (key) {
            this.actions.splice(_findIndex(this.actions, ['key', key]), 1)
            this.$emit('input', this.getData)
        },
        addMessageField () {
            if (this.selectedData.message) {
                if (!this.selectedData.settings) {
                    this.selectedData.settings = []
                }
                this.selectedData.settings.unshift({
                    title: 'Message',
                    description: '(Optional) Will show in-game',
                    key: 'message',
                    type: 'text',
                    default: ''
                })
            }
        }
    },
    computed: {
        getData () {
            return JSON.stringify(_map(this.actions, (item) => _omit(item, ['key', 'title', 'description'])))
        },
        ...mapState([
            'defaultActions',
            'actionData'
        ])
    },
    beforeMount () {
        this.id = Math.random().toString(36).substr(2, 9)
    },
    mounted () {
        const input = this.value.length > 0 ? JSON.parse(this.value) : []
        let i = 0
        this.actions = _map(input, (action) => {
            const data = _cloneDeep(_find(this.actionData, ['action', action.type]))
            const key = i
            i += 1
            return ({
                key,
                title: data.title,
                description: data.description,
                ...action
            })
        })
    }
}
</script>

<style>

</style>
