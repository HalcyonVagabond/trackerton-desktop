/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class', // Enable dark mode via a CSS class
  theme: {
    extend: {
      colors: {
        // Victorian Theme Colors
        'bg-gradient-start': 'var(--bg-gradient-start)',
        'bg-gradient-mid': 'var(--bg-gradient-mid)',
        'bg-gradient-end': 'var(--bg-gradient-end)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-label': 'var(--text-label)',
        'text-muted': 'var(--text-muted)',
        
        'container-bg': 'var(--container-bg)',
        'container-border': 'var(--container-border)',
        'container-shadow': 'var(--container-shadow)',
        
        'sidebar-bg': 'var(--sidebar-bg)',
        'panel-bg': 'var(--panel-bg)',
        'divider': 'var(--divider)',
        
        'header-gradient-start': 'var(--header-gradient-start)',
        'header-gradient-mid': 'var(--header-gradient-mid)',
        'header-gradient-end': 'var(--header-gradient-end)',
        'header-text': 'var(--header-text)',
        
        'card-bg': 'var(--card-bg)',
        'card-border': 'var(--card-border)',
        'card-shadow': 'var(--card-shadow)',
        
        'input-bg': 'var(--input-bg)',
        'input-border': 'var(--input-border)',
        'input-focus': 'var(--input-focus)',
        'input-shadow': 'var(--input-shadow)',
        
        'accent-gold': 'var(--accent-gold)',
        'accent-gold-hover': 'var(--accent-gold-hover)',
        'accent-gold-light': 'var(--accent-gold-light)',
        
        'item-hover': 'var(--item-hover)',
        'item-active': 'var(--item-active)',
        
        'button-green': 'var(--button-green)',
        'button-green-hover': 'var(--button-green-hover)',
        'button-blue': 'var(--button-blue)',
        'button-blue-hover': 'var(--button-blue-hover)',
        'button-red': 'var(--button-red)',
        'button-red-hover': 'var(--button-red-hover)',
        'button-gold': 'var(--button-gold)',
        'button-gold-hover': 'var(--button-gold-hover)',
        
        'timer-border': 'var(--timer-border)',
        'timer-text': 'var(--timer-text)',
        
        'modal-overlay': 'var(--modal-overlay)',
        'modal-bg': 'var(--modal-bg)',
        'modal-border': 'var(--modal-border)',
        
        // Menu bar specific
        'bg-body': 'var(--bg-body)',
        'button-bg': 'var(--button-bg)',
        'button-border': 'var(--button-border)',
        'button-hover-bg': 'var(--button-hover-bg)',
        
        'badge-border': 'var(--badge-border)',
        'badge-bg': 'var(--badge-bg)',
        'badge-running-border': 'var(--badge-running-border)',
        'badge-running-bg': 'var(--badge-running-bg)',
        'badge-running-text': 'var(--badge-running-text)',
        'badge-paused-border': 'var(--badge-paused-border)',
        'badge-paused-bg': 'var(--badge-paused-bg)',
        'badge-paused-text': 'var(--badge-paused-text)',
        
        'prompt-border': 'var(--prompt-border)',
        'prompt-bg': 'var(--prompt-bg)',
        'prompt-text': 'var(--prompt-text)',
        
        'link-color': 'var(--link-color)',
        'link-hover': 'var(--link-hover)',
      },
      backgroundImage: {
        'timer-gradient': 'var(--timer-bg)',
      }
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
}
