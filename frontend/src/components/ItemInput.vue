<template>
  <div>
    <h5>{{ data.title }}</h5>
    <small class="text-muted">{{ data.description }}</small>
    <div
      v-for="item in items" :key="item.key">
      <hr>
      <b-form-group
        label="Item Id"
        description="The id of the item"
        :label-for="`item_id_${item.key}`">
        <b-form-input
          type="text"
          :id="`item_id_${item.key}`"
          v-model="item.id"
          @input="$emit('input', getData)"
          placeholder="Id">
        </b-form-input>
      </b-form-group>
      <b-form-group
        label="Amount"
        description="The amount of items"
        :label-for="`item_amount_${item.key}`">
        <b-form-input
          type="number"
          :id="`item_amount_${item.key}`"
          v-model="item.amount"
          @input="$emit('input', getData)"
          placeholder="Amount">
        </b-form-input>
      </b-form-group>
      <b-button
        variant="danger"
        @click="removeItem(item.key)"
        ><fa icon="trash-alt"/> Remove Item</b-button>
    </div>
    <hr>
    <b-button
      variant="info"
      block
      @click="addItem">
      <fa icon="plus"/> Add item
    </b-button>
  </div>
</template>

<script>
import _findIndex from 'lodash/findIndex'
import _pick from 'lodash/pick'
import _map from 'lodash/map'

export default {
    name: 'item-input',
    props: [
        'value',
        'data'
    ],
    data () {
        return {
            items: []
        }
    },
    methods: {
        addItem () {
            this.items.push({ key: this.items.length, id: '', amount: '' })
            this.$emit('input', this.getData)
        },
        removeItem (key) {
            this.items.splice(_findIndex(this.items, ['key', key]), 1)
            this.$emit('input', this.getData)
        }
    },
    computed: {
        getData () {
            return JSON.stringify(_map(this.items, (item) => _pick(item, ['id', 'amount'])))
        }
    },
    mounted () {
        const data = this.value.length > 0 ? JSON.parse(this.value) : []
        let i = -1
        this.items = _map(data, (item) => ({ key: (i += 1), ...item }))
    }
}
</script>

<style>

</style>
