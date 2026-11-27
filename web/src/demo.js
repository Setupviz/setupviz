// Only fixed audience names are passed to analytics. Other URL values stay out.
export function demoAudience(value){
  return ['gaming', 'remote-work', 'first-setup'].includes(value) ? value : '';
}

export function demoQuery(value){
  const demo = demoAudience(value);
  return demo ? '&demo=' + demo : '';
}
