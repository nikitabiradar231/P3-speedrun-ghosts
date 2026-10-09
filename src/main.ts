import './styles/index.css';
import { App } from './ui/App.ts';

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
