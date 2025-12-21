// Toast notification utility
let toastTimeout = null;

export function showToast(message, type = 'error') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  
  if (!toast || !toastMessage) return;
  
  // Clear any existing timeout
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }
  
  // Set message and type
  toastMessage.textContent = message;
  toast.className = 'toast';
  
  if (type === 'success') {
    toast.classList.add('success');
  }
  
  // Show toast
  toast.classList.remove('hidden');
  
  // Hide after 3 seconds
  toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}
