/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SupportedLanguage } from './i18n';

export interface CodeBlockExplanation {
  title: string;
  simpleAnalogy: string;
  whatItDoes: string;
  details: string[];
}

/**
 * Analyzes code and produces friendly, non-technical plain explanations
 * in English, Chinese (Simplified), and Malay.
 * Perfect for beginners or non-developers who want to understand what the code does.
 */
export function explainCodeInPlainEnglish(
  filename: string,
  code: string,
  lang: SupportedLanguage = 'en'
): CodeBlockExplanation {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const lowerName = filename.toLowerCase();

  // HTML
  if (ext === 'html' || ext === 'htm') {
    if (lang === 'zh-CN') {
      return {
        title: `网页结构骨架 (${filename})`,
        simpleAnalogy: '把 HTML 想象成大楼建好粉刷和装修前的钢筋混凝土与墙体结构。',
        whatItDoes: '这个文件定义了网页的展示框架：标题、段落、按钮和容器布局。',
        details: [
          code.includes('<head>') ? '包含页面标题、字符集和引用的样式表（相当于蓝图头部信息）。' : '包含网页各个组成部分。',
          code.includes('<button') ? '包含访客可以点击交互以触发操作的按钮。' : '提供内容区块与排版。',
          code.includes('<img') || code.includes('<svg') ? '在屏幕上展示图像或矢量图形。' : '组织文本段落与页面结构。',
        ],
      };
    }
    if (lang === 'ms') {
      return {
        title: `Rangka Laman Web (${filename})`,
        simpleAnalogy: 'Fikirkan HTML seperti kerangka keluli dan dinding bangunan sebelum dicat atau dihias.',
        whatItDoes: 'Fail ini mentakrifkan struktur asas laman web: tajuk, perenggan, butang dan susun atur bekas paparan.',
        details: [
          code.includes('<head>') ? 'Mengandungi tetapan halaman, tajuk dan lembaran gaya luaran (seperti tajuk pelan tindakan).' : 'Mentakrifkan elemen paparan.',
          code.includes('<button') ? 'Mempunyai butang interaktif yang boleh ditekan oleh pelawat untuk menjalankan tindakan.' : 'Menyediakan bahagian kandungan.',
          code.includes('<img') || code.includes('<svg') ? 'Memaparkan imej atau grafik pada skrin.' : 'Menyusun perenggan teks dan reka letak.',
        ],
      };
    }
    return {
      title: `Webpage Skeleton (${filename})`,
      simpleAnalogy: 'Think of HTML like the steel frame and walls of a building before painting or furnishing.',
      whatItDoes: 'This file defines the visible structure of the webpage: headings, paragraphs, buttons, and layout containers that visitors see.',
      details: [
        code.includes('<head>') ? 'Contains page settings, title, and external stylesheets (like a blueprint header).' : 'Defines elements.',
        code.includes('<button') ? 'Has interactive buttons that visitors can click to trigger actions.' : 'Provides content sections.',
        code.includes('<img') || code.includes('<svg') ? 'Displays images or graphics on the screen.' : 'Organizes text and layout.',
      ],
    };
  }

  // CSS / Styling
  if (ext === 'css' || ext === 'scss' || ext === 'less') {
    if (lang === 'zh-CN') {
      return {
        title: `视觉美化与设计样式 (${filename})`,
        simpleAnalogy: '把 CSS 想象成室内设计师：调配油漆颜色、字体设计、间距边距、阴影和丝滑过渡动效。',
        whatItDoes: '此文件为原本单调的 HTML 骨架注入美感：提供色彩、内边距、自适应尺寸和 Material 3 设计规范。',
        details: [
          code.includes('@import') || code.includes('tailwindcss') ? '引入现代设计系统与实用工具类，实现高质感整洁排版。' : '设定自定义设计规则。',
          code.includes('var(') || code.includes('--') ? '使用设计变量令牌，让全局换肤与调色更加便捷统一。' : '调整边距与排版属性。',
          code.includes('@media') || code.includes('calc') ? '让布局自适应手机屏幕、平板与桌面电脑显示。' : '控制元素的展示与动效。',
        ],
      };
    }
    if (lang === 'ms') {
      return {
        title: `Gaya Visual & Reka Bentuk (${filename})`,
        simpleAnalogy: 'Fikirkan CSS seperti penghias dalaman: warna cat, fon, jarak, bayang-bayang dan animasi yang lancar.',
        whatItDoes: 'Fail ini mengambil rangka asas HTML dan menjadikannya cantik dengan warna, jarak padding, saiz responsif, dan token reka bentuk Material 3.',
        details: [
          code.includes('@import') || code.includes('tailwindcss') ? 'Mengimport sistem reka bentuk moden dan kelas utiliti untuk penggayaan yang pantas.' : 'Menetapkan peraturan reka bentuk tersuai.',
          code.includes('var(') || code.includes('--') ? 'Menggunakan token pembolehubah reka bentuk supaya tema boleh diselaraskan di satu tempat.' : 'Menggayakan sifat susun atur.',
          code.includes('@media') || code.includes('calc') ? 'Menyesuaikan susun atur dengan lancar untuk telefon mudah alih, tablet dan komputer desktop.' : 'Mengawal paparan elemen.',
        ],
      };
    }
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

  // JS / TS / JSX / TSX
  if (ext === 'js' || ext === 'ts' || ext === 'jsx' || ext === 'tsx') {
    if (lang === 'zh-CN') {
      return {
        title: `应用逻辑与交互大脑 (${filename})`,
        simpleAnalogy: '把 JavaScript/TypeScript 想象成房屋的电路与发动机：点击开关通电发光、计算数据、与后台通信。',
        whatItDoes: '此文件负责驱动软件的交互功能：处理按钮点击、状态存储、数据运算和屏幕即时刷新。',
        details: [
          code.includes('import ') ? '从外部库或其它文件中载入专业工具和组件模块。' : '具备独立执行的逻辑代码。',
          code.includes('function') || code.includes('=>') ? '定义自动化任务程序（菜谱），当发生操作或事件时自动执行。' : '依次处理指令流。',
          code.includes('useState') || code.includes('useEffect') ? '记住用户输入或选择的内容，并在数据变动时自动重新渲染页面。' : '执行数据计算与管理。',
        ],
      };
    }
    if (lang === 'ms') {
      return {
        title: `Logik Aplikasi & Enjin Utama (${filename})`,
        simpleAnalogy: 'Fikirkan JavaScript/TypeScript seperti pendawaian elektrik dan enjin: ia bertindak balas apabila butang ditekan, mengambil data, dan mengemas kini skrin.',
        whatItDoes: 'Fail ini menggerakkan ciri interaktif: mengendalikan klik pengguna, mengira nilai, menyimpan status, dan mengurus acara masa nyata.',
        details: [
          code.includes('import ') ? 'Membawa masuk alat dan komponen khusus daripada fail atau perpustakaan lain.' : 'Modul kod kendiri.',
          code.includes('function') || code.includes('=>') ? 'Mentakrifkan tindakan automatik (resipi) yang dilaksanakan apabila peristiwa berlaku.' : 'Melaksanakan arahan mengikut susunan.',
          code.includes('useState') || code.includes('useEffect') ? 'Mengingati apa yang telah dipilih atau ditaip pengguna, dan mengemas kini skrin secara automatik.' : 'Mengendalikan pemprosesan data.',
        ],
      };
    }
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

  // JSON
  if (ext === 'json') {
    if (lang === 'zh-CN') {
      return {
        title: `参数配置与项目设定 (${filename})`,
        simpleAnalogy: '把 JSON 想象成整齐的身份证信息卡或配方清单，包含清晰的名-值对记录。',
        whatItDoes: '此文件保存结构化参数设置、版本号、依赖项包列表或用户的偏好设置。',
        details: [
          code.includes('"dependencies"') ? '记录运行此项目所需要下载安装的依赖包与第三方库。' : '包含配置选项。',
          '采用键值对标准格式，方便人类阅读，也让计算机能极速解析读取。',
        ],
      };
    }
    if (lang === 'ms') {
      return {
        title: `Konfigurasi & Tetapan Projek (${filename})`,
        simpleAnalogy: 'Fikirkan JSON seperti kad resipi atau lencana pengenalan yang tersusun rapi dengan maklumat kunci-nilai.',
        whatItDoes: 'Fail ini menyimpan tetapan berstruktur, nombor versi, senarai kebergantungan pakej, atau keutamaan projek.',
        details: [
          code.includes('"dependencies"') ? 'Menyenaraikan pakej dan perpustakaan yang diperlukan untuk menjalankan projek ini.' : 'Menyusun tetapan aplikasi.',
          'Menggunakan pasangan nama dan nilai supaya komputer dan manusia dapat membaca tetapan tanpa kekeliruan.',
        ],
      };
    }
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

  // Markdown
  if (ext === 'md' || ext === 'markdown') {
    if (lang === 'zh-CN') {
      return {
        title: `使用文档与项目说明 (${filename})`,
        simpleAnalogy: '把 Markdown 想象成通俗易懂的产品说明书或笔记指南。',
        whatItDoes: '此文件用简单的标记语法书写，向开发者和用户解释项目如何安装使用、更新日志及注意事项。',
        details: [
          code.includes('#') ? '包含标题层级划分，条理清晰。' : '包含文档说明。',
          code.includes('```') ? '包含代码示例和命令行运行指南。' : '提供详细文本介绍。',
        ],
      };
    }
    if (lang === 'ms') {
      return {
        title: `Dokumentasi & Nota Panduan (${filename})`,
        simpleAnalogy: 'Fikirkan Markdown seperti manual arahan produk atau buku nota panduan yang mudah dibaca.',
        whatItDoes: 'Fail ini ditulis menggunakan sintaks mudah untuk menerangkan cara memasang, menggunakan dan mengemaskini projek ini.',
        details: [
          code.includes('#') ? 'Mengandungi pembahagian tajuk yang tersusun dan jelas.' : 'Mengandungi nota panduan.',
          code.includes('```') ? 'Mengandungi blok contoh kod dan arahan terminal untuk dijalankan.' : 'Menyediakan teks penerangan terperinci.',
        ],
      };
    }
    return {
      title: `Documentation & Notes (${filename})`,
      simpleAnalogy: 'Think of Markdown like an easy-to-read product instruction manual or guide notebook.',
      whatItDoes: 'This file explains how the project works, installation steps, feature lists, and development notes.',
      details: [
        code.includes('#') ? 'Contains clear heading hierarchies and sections.' : 'Contains document text.',
        code.includes('```') ? 'Provides runnable code snippets and terminal commands.' : 'Provides clear explanations.',
      ],
    };
  }

  // XML / SVG
  if (ext === 'svg' || ext === 'xml' || lowerName.endsWith('.xml')) {
    const isVector = code.includes('<vector') || code.includes('<svg') || ext === 'svg';
    if (lang === 'zh-CN') {
      return {
        title: isVector ? `矢量图形与图标 (${filename})` : `结构化数据与布局 (${filename})`,
        simpleAnalogy: isVector
          ? '把矢量文件想象成几何作图公式，无论放大到手机还是广告牌都永不模糊。'
          : '把 XML 想象成带有标签的物品箱，井井有条地组织数据结构。',
        whatItDoes: isVector
          ? '定义图标、徽标或插图的几何路径、填充色彩与尺寸参数。'
          : '在 Android 或跨平台应用中配置界面布局或清单文件。',
        details: [
          code.includes('<path') ? '包含矢量路径绘制指令（曲线、直线与填充）。' : '包含数据节点标签。',
          '可以在不同屏幕分辨率下以最高精度无损渲染。',
        ],
      };
    }
    if (lang === 'ms') {
      return {
        title: isVector ? `Grafik Vektor & Ikon (${filename})` : `Data Berstruktur & Susun Atur (${filename})`,
        simpleAnalogy: isVector
          ? 'Fikirkan fail vektor seperti formula geometri matematik, tidak akan kabur sama ada dizum pada telefon atau papan iklan besar.'
          : 'Fikirkan XML seperti kotak berlabel kemas yang menyusun struktur data.',
        whatItDoes: isVector
          ? 'Mentakrifkan laluan geometri, warna isian dan parameter saiz untuk ikon atau ilustrasi.'
          : 'Mengkonfigurasi susun atur UI atau manifesto dalam aplikasi Android dan pelbagai platform.',
        details: [
          code.includes('<path') ? 'Mengandungi arahan lukisan laluan vektor (garisan lurus, lengkung dan isian).' : 'Mengandungi nod data XML.',
          'Boleh dipaparkan tanpa kehilangan kualiti pada sebarang resolusi skrin.',
        ],
      };
    }
    return {
      title: isVector ? `Vector Graphics & Icons (${filename})` : `Structured Data & Layout (${filename})`,
      simpleAnalogy: isVector
        ? 'Think of vector files like mathematical geometry formulas that stay crystal clear at any zoom level.'
        : 'Think of XML like neatly organized labeled storage boxes holding settings or data.',
      whatItDoes: isVector
        ? 'Defines shapes, fill colors, and vector paths for icons and interface graphics.'
        : 'Configures application UI layout or manifest properties in Android or cross-platform apps.',
      details: [
        code.includes('<path') ? 'Contains vector path commands (lines, curves, and fills).' : 'Contains XML data nodes.',
        'Renders smoothly without pixelation on any screen resolution.',
      ],
    };
  }

  // Python
  if (ext === 'py' || ext === 'pyw') {
    if (lang === 'zh-CN') {
      return {
        title: `Python 脚本与数据处理 (${filename})`,
        simpleAnalogy: '把 Python 想象成智能多功能工具箱：擅长自动化批处理、数据计算和人工智能任务。',
        whatItDoes: '执行后台计算、文本解析、自动化脚本或调用数据处理工具。',
        details: [
          code.includes('def ') ? '定义了可重复调用的计算函数或任务模块。' : '包含运行逻辑。',
          '语法简洁优雅，方便快速实现复杂算法与数据流。',
        ],
      };
    }
    if (lang === 'ms') {
      return {
        title: `Skrip & Pemprosesan Data Python (${filename})`,
        simpleAnalogy: 'Fikirkan Python seperti kotak alat pintar serbaguna: cemerlang dalam automasi, pengiraan data dan tugas kecerdasan buatan.',
        whatItDoes: 'Menjalankan pengiraan bahagian belakang, analisis teks, skrip automatik, atau memproses data.',
        details: [
          code.includes('def ') ? 'Mentakrifkan fungsi atau modul tugas yang boleh digunakan berulang kali.' : 'Mengandungi logik pelaksanaan.',
          'Sintaks yang bersih dan mudah dibaca untuk membina algoritma dengan pantas.',
        ],
      };
    }
    return {
      title: `Python Script & Data Processing (${filename})`,
      simpleAnalogy: 'Think of Python like a smart multi-tool: great for automation, data calculations, and back-end logic.',
      whatItDoes: 'Runs automation scripts, data transformations, calculations, or server processes.',
      details: [
        code.includes('def ') ? 'Defines reusable functions and task modules.' : 'Contains script logic.',
        'Clean syntax designed for readable and maintainable programming.',
      ],
    };
  }

  // Default Fallback
  if (lang === 'zh-CN') {
    return {
      title: `项目文件与资源 (${filename})`,
      simpleAnalogy: '这是支持主应用程序运行的配置文件或数据资源。',
      whatItDoes: '为应用程序提供必要的数据、静态资源或环境配置。',
      details: ['由构建系统、开发工具或运行时引擎读取解析。'],
    };
  }
  if (lang === 'ms') {
    return {
      title: `Aset & Fail Projek (${filename})`,
      simpleAnalogy: 'Ini adalah fail konfigurasi atau aset data yang menyokong aplikasi utama.',
      whatItDoes: 'Menyediakan data penting, aset statik, atau tetapan persekitaran untuk aplikasi.',
      details: ['Dibaca dan diproses oleh sistem binaan atau enjin aplikasi.'],
    };
  }

  return {
    title: `Project Asset (${filename})`,
    simpleAnalogy: 'A supporting document, configuration, or data asset.',
    whatItDoes: 'Provides essential assets, configuration, or data used by the main application.',
    details: ['Read and processed by the build system or runtime engine.'],
  };
}
