const PASSWORD = 'Pro918';

function hideLoginScreen() {
  const loginScreen = document.getElementById('login-screen');
  
  if (loginScreen) {
    // Remove from DOM completely to avoid z-index issues
    loginScreen.remove();
  }
}

// Check if already authenticated on page load
window.addEventListener('DOMContentLoaded', function() {
  if (sessionStorage.getItem('authenticated') === 'true') {
    hideLoginScreen();
  }
});

// Handle login form submission
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const input = document.getElementById('password-input').value;
    
    if (input === PASSWORD) {
      sessionStorage.setItem('authenticated', 'true');
      hideLoginScreen();
    } else {
      const errorEl = document.getElementById('login-error');
      if (errorEl) {
        errorEl.style.display = 'block';
      }
      document.getElementById('password-input').value = '';
    }
  });
}
