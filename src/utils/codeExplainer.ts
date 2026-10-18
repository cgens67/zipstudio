/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CodeBlockExplanation {
  title: string;
  simpleAnalogy: string;
  whatItDoes: string;
  details: string[];
}

/**
 * Analyzes code and produces friendly, non-technical plain English explanations.
 * Perfect for people who can't understand code or are beginners.
 */
export function explainCodeInPlainEnglish(filename: string, code: string): CodeBlockExplanation {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (ext === 'html' || ext === 'htm') {
    return {
      title: `Webpage Skeleton (${filename})`,
      simpleAnalogy: 'Think of HTML like the steel frame and walls of a building before painting or furnishing.',
      whatItDoes: 'This file defines the visible structure of the webpage: headings, paragraphs, buttons, and layout containers that visitors see.',
      details: [
        code.includes('<head>') ? 'Contains page settings, title, and external stylesheets (like a blueprint header).' : 'Defines elements.',
        code.includes('<button') ? 'Has interactive buttons that visitors can click to trigger actions.' : 'Provides content sections.',
        code.includes('<img') ? 'Displays images or graphics on the screen.' : 'Organizes text and layout.',
      ],
    };
  }

  if (ext === 'css') {
    return {
      title: `Visual Styling & Design (${filename})`,
      simpleAnalogy: 'Think of CSS like the interior decorator: paint colors, fonts, spacing, shadows, and smooth animations.',
      whatItDoes: 'This file takes the raw HTML skeleton and makes it look beautiful with colors, padding, responsive sizes, and Material 3 design tokens.',
      details: [
        code.includes('@import') || code.includes('tailwindcss') ? 'Imports modern design systems and utility classes for fast, clean styling.' : 'Sets custom rules.',
        code.includes('var(') || code.includes('--') ? 'Uses design tokens/variables so you can tweak the theme in one place.' : 'Styles layout properties.',
        code.includes('@media') || code.includes('calc') ? 'Adapts the layout smoothly to mobile phones, tablets, and desktop screens.' : 'Controls element display.',
      ],
    };
  }

  if (ext === 'js' || ext === 'ts' || ext === 'jsx' || ext === 'tsx') {
    return {
      title: `Application Logic & Brains (${filename})`,
      simpleAnalogy: 'Think of JavaScript/TypeScript like the electrical wiring and engine: it reacts when buttons are pressed, fetches data, and updates the screen.',
      whatItDoes: 'This file powers the interactive features: handling user clicks, calculating values, saving state, and managing real-time events.',
      details: [
        code.includes('import ') ? 'Brings in specialized tools and components from other files or libraries.' : 'Self-contained code module.',
        code.includes('function') || code.includes('=>') ? 'Defines automated actions (recipes) that execute whenever an event occurs.' : 'Executes instructions sequentially.',
        code.includes('useState') || code.includes('useEffect') ? 'Remembers what the user has selected or typed, and updates the screen automatically.' : 'Handles data processing.',
      ],
    };
  }

  if (ext === 'json') {
    return {
      title: `Configuration & Settings (${filename})`,
      simpleAnalogy: 'Think of JSON like an organized recipe card or ID badge with key-value information.',
      whatItDoes: 'This file stores structured settings, version numbers, list of dependencies, or project preferences.',
      details: [
        code.includes('"dependencies"') ? 'Lists the packages and libraries required to run this project.' : 'Organizes settings.',
        'Uses pairs of names and values so computers and humans can read configuration without confusion.',
      ],
    };
  }

  return {
    title: `Project Asset (${filename})`,
    simpleAnalogy: 'A supporting document or configuration file.',
    whatItDoes: 'Provides assets or data used by the main application.',
    details: ['Read by the build system or runtime engine.'],
  };
}
