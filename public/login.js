const PASSWORD = 'Pro918';

function hideLoginScreen() {
  const loginScreen = document.getElementById('login-screen');
  const homeScreen = document.getElementById('home-screen');
  
  if (loginScreen) {
    loginScreen.style.display = 'none';
    loginScreen.style.visibility = 'hidden';
  }
  
  if (homeScreen) {
    homeScreen.style.display = 'flex';
    homeScreen.style.visibility = 'visible';
  }
}

function showLoginScreen() {
  const loginScreen = document.getElementById('login-screen');
  const homeScreen = document.getElementById('home-screen');
  
  if (loginScreen) {
    loginScreen.style.display = 'flex';
    loginScreen.style.visibility = 'visible';
  }
  
  if (homeScreen) {
    homeScreen.style.display = 'none';
    homeScreen.style.visibility = 'hidden';
  }
}

// Check if already authenticated on page load
window.addEventListener('DOMContentLoaded', function() {
  if (sessionStorage.getItem('authenticated') === 'true') {
    hideLoginScreen();
  } else {
    showLoginScreen();
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
      document.getElementById('password-input').value = '';
      document.getElementById('login-error').style.display = 'none';
      hideLoginScreen();
    } else {
      document.getElementById('login-error').style.display = 'block';
      document.getElementById('password-input').value = '';
    }
  });
}
