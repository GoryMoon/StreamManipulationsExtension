<template>
  <div>
    <span :class="[getBitColor, textClass]">
    <img
      :src="getBitImage"
      :alt="bits + 'bits'"
      :width="width" :height="height" />
      {{ bits }} Bits
    </span>
  </div>
</template>

<script>
import GrayStatic from '@/assets/1.png'
import PurpleStatic from '@/assets/100.png'
import GreenStatic from '@/assets/1000.png'
import BlueStatic from '@/assets/5000.png'
import RedStatic from '@/assets/10000.png'

import GrayAnimated from '@/assets/1.gif'
import PurpleAnimated from '@/assets/100.gif'
import GreenAnimated from '@/assets/1000.gif'
import BlueAnimated from '@/assets/5000.gif'
import RedAnimated from '@/assets/10000.gif'

export default {
    name: 'bits-display',
    props: {
        animated: {
            type: Boolean,
            default: false
        },
        bits: {
            type: Number,
            required: true
        },
        textClass: {
            type: String,
            default: 'h5'
        },
        width: {
            type: [Number, String],
            default: 30
        },
        height: {
            type: [Number, String],
            default: 30
        }
    },
    data () {
        return {
            icons: {
                static: {
                    gray: GrayStatic,
                    purple: PurpleStatic,
                    green: GreenStatic,
                    blue: BlueStatic,
                    red: RedStatic
                },
                animated: {
                    gray: GrayAnimated,
                    purple: PurpleAnimated,
                    green: GreenAnimated,
                    blue: BlueAnimated,
                    red: RedAnimated
                }
            }
        }
    },
    computed: {
        getBitImage () {
            const { bits } = this
            const icons = this.animated ? this.icons.animated : this.icons.static
            if (bits < 100) {
                return icons.gray
            } else if (bits < 1000) {
                return icons.purple
            } else if (bits < 5000) {
                return icons.green
            } else if (bits < 10000) {
                return icons.blue
            }
            return icons.red
        },
        getBitColor () {
            const { bits } = this
            if (bits < 100) {
                return 'bits-10'
            } else if (bits < 1000) {
                return 'bits-100'
            } else if (bits < 5000) {
                return 'bits-1000'
            } else if (bits < 10000) {
                return 'bits-5000'
            }
            return 'bits-10000'
        }
    }
}
</script>

<style lang="scss" scoped>
.bits {
    font-size: 25px;
    &-10 {
        color: #979797
    }
    &-100 {
        color: #9c3ee8
    }
    &-1000 {
        color: #1db2a5
    }
    &-5000 {
        color: #0099fe
    }
    &-10000 {
        color: #f43021
    }
}
</style>
