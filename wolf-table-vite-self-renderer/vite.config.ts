
import { defineConfig } from 'vite'
import path from 'path'       

export default defineConfig({
  resolve: {
    alias: {
      '@wolf-table/table-renderer': path.resolve(__dirname, './table-renderer') 
    } 
  }
})
