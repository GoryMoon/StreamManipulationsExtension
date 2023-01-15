import Vue from 'vue'
import devtools from '@vue/devtools'

Vue.config.devtools = process.env.NODE_ENV === 'development'

if (process.env.NODE_ENV === 'development') {
    devtools.connect('http://localhost', 8098)
}
