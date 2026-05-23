const PASSWORD = 'Pro918';
let isAuthenticated = false;

function removeLoginScreen() {
  const loginScreen = document.getElementById('login-screen');
  const homeScreen = document.getElementById('home-screen');
  
  if (loginScreen) {
    loginScreen.remove();
    console.log('[Login] Login screen removed from DOM');
  }
  
  // Ensure home-screen is visible
  if (homeScreen) {
    homeScreen.style.display = 'flex';
    homeScreen.style.visibility = 'visible';
    homeScreen.style.pointerEvents = 'auto';
    console.log('[Login] Home screen made visible');
  }
}

function handleAuthentication() {
  isAuthenticated = true;
  sessionStorage.setItem('authenticated', 'true');
  localStorage.setItem('authenticated', 'true');
  
  // Small delay to ensure DOM is ready
  setTimeout(() => {
    removeLoginScreen();
  }, 100);
  
  console.log('[Login] Authentication successful');
}

// Check if already authenticated on page load
window.addEventListener('DOMContentLoaded', function() {
  console.log('[Login] DOMContentLoaded event fired');
  
  const sessionAuth = sessionStorage.getItem('authenticated') === 'true';
  const localAuth = localStorage.getItem('authenticated') === 'true';
  
  if (sessionAuth || localAuth || isAuthenticated) {
    console.log('[Login] Already authenticated, removing login screen');
    setTimeout(() => {
      removeLoginScreen();
    }, 100);
  } else {
    console.log('[Login] Not authenticated, showing login screen');
  }
});

// Handle login form submission
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const input = document.getElementById('password-input').value;
    
    console.log('[Login] Form submitted');
    
    if (input === PASSWORD) {
      console.log('[Login] Password correct');
      handleAuthentication();
    } else {
      console.log('[Login] Password incorrect');
      const errorEl = document.getElementById('login-error');
      if (errorEl) {
        errorEl.style.display = 'block';
      }
      document.getElementById('password-input').value = '';
    }
  });
} else {
  console.log('[Login] Login form not found');
}

// Also check on window load
window.addEventListener('load', function() {
  console.log('[Login] Window load event fired');
  
  const sessionAuth = sessionStorage.getItem('authenticated') === 'true';
  const localAuth = localStorage.getItem('authenticated') === 'true';
  
  if ((sessionAuth || localAuth || isAuthenticated) && document.getElementById('login-screen')) {
    console.log('[Login] Removing login screen on window load');
    removeLoginScreen();
  }
});
