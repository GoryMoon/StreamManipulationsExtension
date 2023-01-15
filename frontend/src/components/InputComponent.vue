<template>
  <b-form-group
    v-if="data.type === 'number'"
    :label="data.title"
    :description="data.description"
    :label-for="id">
    <b-form-input
      type="number"
      :id="id"
      :min="data.min || 0"
      :max="data.max"
      :value="value"
      @input="$emit('input', $event)">
    </b-form-input>
    </b-form-group>
  <b-form-group
    v-else-if="data.type === 'text'"
    :label="data.title"
    :description="data.description"
    :label-for="id">
    <b-form-input
      type="text"
      :id="id"
      :value="value"
      @input="$emit('input', $event)">
    </b-form-input>
    </b-form-group>
  <b-form-group
    v-else-if="data.type === 'checkbox'"
    :description="data.description"
    :label-for="id">
    <b-form-checkbox
      :id="id"
      :checked="value"
      :switch="true"
      @input="$emit('input', $event)">
      {{ data.title }}
    </b-form-checkbox>
  </b-form-group>
  <item-input
    v-else-if="data.type === 'item'"
    :data="data"
    :value="value"
    @input="$emit('input', $event)">>
  </item-input>
  <action-input
    v-else-if="data.type === 'action'"
    :data="data"
    :value="value"
    @input="$emit('input', $event)">>
  </action-input>
</template>

<script>
import ItemInput from './ItemInput.vue'
import ActionInput from './ActionInput.vue'

export default {
    name: 'input-component',
    props: [
        'value',
        'data',
        'index',
        'id'
    ],
    components: {
        ItemInput,
        ActionInput
    }
}
</script>

<style>

</style>
