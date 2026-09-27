import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  envDir: '../', // 🟢 Διαβάζει το .env από τη ρίζα του project (1 επίπεδο πάνω)
  server: {
    watch: {
      // Εξαιρεί ρητά όλο τον φάκελο του backend ή οποιοδήποτε json αρχείο εκτός frontend
      ignored: ['**/backend/**', '**/*.json'] 
    }
  }
})