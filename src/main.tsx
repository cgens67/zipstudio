// Ensure CustomElementRegistry does not throw when duplicate element definitions occur
if (typeof window !== 'undefined' && window.customElements) {
  const origDefine = window.customElements.define.bind(window.customElements);
  window.customElements.define = (
    name: string,
    constructor: CustomElementConstructor,
    options?: ElementDefinitionOptions
  ) => {
    if (!window.customElements.get(name)) {
      try {
        origDefine(name, constructor, options);
      } catch (e) {
        console.warn('Custom element already defined:', name);
      }
    }
  };
}

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
