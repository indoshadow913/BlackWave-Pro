const PASSWORD = 'Pro918';

document.getElementById('login-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const input = document.getElementById('password-input').value;
  
  if (input === PASSWORD) {
    sessionStorage.setItem('authenticated', 'true');
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('home-screen').style.display = 'flex';
  } else {
    document.getElementById('login-error').style.display = 'block';
    document.getElementById('password-input').value = '';
  }
});

// Check if already authenticated
if (sessionStorage.getItem('authenticated') === 'true') {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('home-screen').style.display = 'flex';
}
