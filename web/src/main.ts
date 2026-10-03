import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import { router } from './router'

// Pinia antes do router: o guard de rota usa a store de autenticação, e ela
// precisa existir antes da primeira navegação.
createApp(App).use(createPinia()).use(router).mount('#app')