const customRegister = require('./customRegister');
const App = require('./CustomHome.svelte').default;

const { head, html, css } = App.render({
});

console.log(head, html, css);
