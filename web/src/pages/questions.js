// The three optional questions (grip, hand and use) run this one script, inlined into each page.
// An answer is saved as 'sv-' plus its radio group's name.
var radios = document.querySelectorAll('input[type="radio"]');
var key = 'sv-' + radios[0].name;
document.getElementById('skip').onclick = function(){ localStorage.removeItem(key); };
var saved = localStorage.getItem(key);
radios.forEach(function(input){
  input.checked = input.value === saved;
  input.addEventListener('change', function(){ localStorage.setItem(key, input.value); });
});
