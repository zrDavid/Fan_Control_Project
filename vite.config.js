import { defineConfig } from 'vite'

export default defineConfig({
  base: './', 
  build: {
    assetsDir: './' // This tells Vite: "Don't put JS in an 'assets' folder, keep it in the root"
  }
})