import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import { listenForInstallPrompt } from './composables/useInstall.js'
import './style.css'

listenForInstallPrompt()
registerSW({ immediate: true })

createApp(App).use(createPinia()).mount('#app')
