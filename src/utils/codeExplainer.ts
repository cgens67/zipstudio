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
  const cleanName = filename.replace(/^.*[\\\/]/, '').toLowerCase();
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  // 1. .gitkeep (Specialized use case for keeping empty directory structure)
  if (cleanName === '.gitkeep') {
    if (lang === 'zh-CN') {
      return {
        title: `Git 空目录占位符 (${cleanName})`,
        simpleAnalogy: '把 .gitkeep 想象成一个专用的占位图钉：Git 机制默认完全忽略空文件夹，放置这个小文件即可强制 Git 将该目录结构纳入版本管理。',
        whatItDoes: 'Git 的设计原理只跟踪文件的增删改查，而从不单独跟踪空的文件夹。当你的项目需要保留 logs/、uploads/、temp/ 或 assets/cache/ 等空目录结构时，在里面放入 .gitkeep 即可确保代码推送到 GitHub 或其他协作者克隆时，目录层级完整保留。',
        details: [
          '解决 Git 无法跟踪空文件夹的底层机制限制。',
          '本身无需编写任何逻辑，体积为 0 或微小，对项目运行时没有任何副作用。',
          '在自动化部署、持续集成 (CI) 或文件上传模块中预留存放位置。',
        ],
      };
    }
    if (lang === 'ms') {
      return {
        title: `Penanda Folder Kosong Git (${cleanName})`,
        simpleAnalogy: 'Fikirkan .gitkeep seperti penanda tempat letak kereta: Git secara lalai mengabaikan folder yang kosong, jadi fail ini memaksa Git mengingati dan menjejaki struktur folder tersebut.',
        whatItDoes: 'Git hanya menjejaki fail dan bukannya direktori kosong. Meletakkan fail .gitkeep di dalam folder (seperti logs/, uploads/ atau cache/) memastikan susunan direktori kekal apabila ditolak ke GitHub atau dimuat turun oleh rakan sepasukan.',
        details: [
          'Mengatasi kekangan Git yang tidak menyimpan folder kosong tanpa fail.',
          'Konvensyen industri standard yang bersih tanpa memberi sebarang kesan sampingan kepada aplikasi.',
          'Memastikan folder sasaran untuk log atau muat naik fail sedia ada semasa pemasangan projek.',
        ],
      };
    }
    return {
      title: `Git Directory Placeholder (${cleanName})`,
      simpleAnalogy: 'Think of .gitkeep like a placeholder tent or a bookmark: Git fundamentally ignores completely empty folders, so this marker file forces Git to track and preserve the directory.',
      whatItDoes: 'Git is designed to track file contents rather than directory nodes. If a project requires an empty folder structure (like logs/, uploads/, temp/, or assets/cache/) to exist upon checkout, adding a .gitkeep file guarantees Git commits the folder to the repository.',
      details: [
        'Overcomes Git\'s core limitation of ignoring directories that contain zero files.',
        'Standard developer convention with no runtime overhead or code complexity.',
        'Ensures automated build scripts and CI pipelines find required output directories on fresh clones.',
      ],
    };
  }

  // 2. .gitignore (Specific use case for protecting secrets and avoiding bloat)
  if (cleanName === '.gitignore') {
    if (lang === 'zh-CN') {
      return {
        title: `Git 忽略规则清单 (${cleanName})`,
        simpleAnalogy: '把 .gitignore 想象成机场安检门卫的“禁运名单”：严格规定哪些临时文件、庞大依赖或涉密文件绝不能被打包提交到公共代码库。',
        whatItDoes: '明确通知 Git 忽略特定文件与目录。防止体积庞大的第三方依赖包 (node_modules/)、编译临时输出 (dist/, build/)、操作系统缓存 (.DS_Store) 以及最为关键的含有密码与 API 密钥的凭证文件 (.env) 意外上传到 GitHub。',
        details: [
          code.includes('node_modules') ? '排除了庞大的第三方依赖包，避免代码仓库体积膨胀数百兆。' : '规范了版本控制的跟踪范围。',
          code.includes('.env') ? '关键安全防御：阻止敏感的 API 密钥、数据库连接串及私钥泄漏到公开网络。' : '保护本地环境配置。',
          code.includes('dist') || code.includes('build') ? '忽略自动生成的打包产物，防止团队多人协作时产生无休止的文件冲突。' : '保持代码提交历史干净纯粹。',
        ],
      };
    }
    if (lang === 'ms') {
      return {
        title: `Senarai Pengecualian Git (${cleanName})`,
        simpleAnalogy: 'Fikirkan .gitignore seperti senarai tapisan keselamatan: ia memberitahu Git fail mana yang dilarang sama sekali daripada dimuat naik ke repositori.',
        whatItDoes: 'Menghalang fail sementara, folder pakej luar yang besar (node_modules/), fail binaan (dist/, build/), dan yang paling penting iaitu fail sulit seperti kata laluan atau kunci API (.env) daripada terdedah di GitHub.',
        details: [
          code.includes('node_modules') ? 'Mengecualikan folder pakej yang berat untuk memastikan repositori kekal ringan dan pantas.' : 'Menetapkan peraturan pengesanan fail.',
          code.includes('.env') ? 'Langkah keselamatan kritikal: menghalang kunci API dan rahsia pengkalan data daripada bocor.' : 'Melindungi tetapan peribadi.',
          code.includes('dist') || code.includes('build') ? 'Mengelakkan konflik kod antara rakan sepasukan daripada fail hasil kompilasi.' : 'Memastikan sejarah commit sentiasa bersih.',
        ],
      };
    }
    return {
      title: `Git Ignore Rules (${cleanName})`,
      simpleAnalogy: 'Think of .gitignore like a strict bouncer at the club door: it commands Git which files are forbidden from ever entering the repository.',
      whatItDoes: 'Instructs Git to intentionally untrack specific files and patterns. It prevents multi-gigabyte dependencies (node_modules/), build artifacts (dist/, build/), OS clutter (.DS_Store), and most importantly, secret API keys and database credentials (.env) from accidentally being committed and leaked publicly.',
      details: [
        code.includes('node_modules') ? 'Excludes heavy external package folders to keep Git clones lightning-fast.' : 'Filters tracked files.',
        code.includes('.env') ? 'Critical security shield: stops passwords, private tokens, and API credentials from leaking online.' : 'Safeguards local configurations.',
        code.includes('dist') || code.includes('build') ? 'Ignores generated bundles to avoid messy merge conflicts among team members.' : 'Keeps repository commit history pristine.',
      ],
    };
  }

  // 3. .jar (Java Archive)
  if (ext === 'jar') {
    if (lang === 'zh-CN') {
      return {
        title: `Java 归档程序包 (${cleanName})`,
        simpleAnalogy: '把 .jar 想象成一个精密封存的 Java 软件集装箱：把大量编译好的字节码类、资源图标和清单文件打包为一个单一的可分发文件。',
        whatItDoes: '基于 Zip 算法压缩打包的 Java 归档文件。它包含预先编译好的 Java 字节码 (.class) 与 META-INF/MANIFEST.MF 清单，既可以直接作为桌面/服务端程序由 JVM 执行，也可以作为第三方公共库在 Android 与 Spring 等项目中直接调用。',
        details: [
          '实现“一次编写，到处运行”的跨平台 Java 二进制分发规范。',
          '内置 MANIFEST.MF 清单指定程序入口主类 (Main-Class) 与签名安全信息。',
          '可作为独立应用程序运行，亦可作为安卓或后端工程的代码依赖库。',
        ],
      };
    }
    if (lang === 'ms') {
      return {
        title: `Pakej Arkib Java (${cleanName})`,
        simpleAnalogy: 'Fikirkan fail .jar seperti kontena perisian Java yang siap dimeterai: menggabungkan semua kelas kod terkompil, ikon dan manifes ke dalam satu fail mudah alih.',
        whatItDoes: 'Fail arkib termampat berasaskan format zip yang mengandungi baitkod Java (.class) yang telah dikompilkan bersama fail manifes META-INF/MANIFEST.MF. Boleh dijalankan secara langsung dengan JVM atau dijadikan pustaka rujukan untuk projek Android dan pelayan.',
        details: [
          'Mematuhi piawaian pengedaran Java yang boleh dijalankan pada mana-mana sistem pengendalian.',
          'Mengandungi fail manifes untuk menentukan kelas utama (Main-Class) dan maklumat keselamatan.',
          'Digunakan secara meluas sebagai pustaka modul dalam pembangunan perisian moden.',
        ],
      };
    }
    return {
      title: `Java Archive Executable/Library (${cleanName})`,
      simpleAnalogy: 'Think of a .jar file like a sealed shipping container for Java: it packs compiled bytecode classes, assets, and a manifest into a single portable package.',
      whatItDoes: 'A zip-compressed Java archive containing pre-compiled Java bytecode (.class files), resources, and a META-INF/MANIFEST.MF file. It can be executed directly as an application on any system with Java installed, or referenced as a dependency library in Android, Gradle, and enterprise applications.',
      details: [
        'Enables the "Write Once, Run Anywhere" cross-platform deployment model.',
        'Contains an internal MANIFEST.MF declaring the application\'s Main-Class entry point and version info.',
        'Serves either as an executable program or as a reusable code library.',
      ],
    };
  }

  // 4. .kts (Kotlin Script / Gradle Kotlin DSL)
  if (ext === 'kts' || cleanName.endsWith('.gradle.kts')) {
    if (lang === 'zh-CN') {
      return {
        title: `Kotlin 脚本与 Gradle 构建配置 (${cleanName})`,
        simpleAnalogy: '把 .kts 想象成用现代 Kotlin 语言编写的自动化工程施工说明书：安排下载哪些开源库、设置安卓编译版本并指导流水线打包。',
        whatItDoes: '这是基于 Kotlin 语言的脚本文件，广泛应用于现代 Android 与 Gradle 构建系统的 build.gradle.kts 和 settings.gradle.kts。相比旧版 Groovy 脚本，它具备严格的编译期类型安全、代码自动补全、即时错误排查及卓越的代码重构体验。',
        details: [
          code.includes('plugins') ? '声明并引入构建插件（如 Android 应用程序、Kotlin 编译器支持等）。' : '配置工程构建指令。',
          code.includes('dependencies') ? '定义从 Maven 或 Google 仓库下载的远程依赖第三方库及其确切版本。' : '管理构建依赖项。',
          code.includes('android') ? '指定 Android targetSdk、minSdk 版本及打包签名混淆策略。' : '提供类型安全的配置支持。',
        ],
      };
    }
    if (lang === 'ms') {
      return {
        title: `Skrip Kotlin & Konfigurasi Binaan Gradle (${cleanName})`,
        simpleAnalogy: 'Fikirkan .kts seperti manual arahan pembinaan moden dalam bahasa Kotlin: mengatur muat turun pustaka, versi sistem dan proses kompilasi projek.',
        whatItDoes: 'Fail skrip Kotlin yang digunakan secara meluas untuk fail konfigurasi binaan Gradle (build.gradle.kts). Menyediakan keselamatan jenis (type safety), cadangan kod automatik dalam IDE, dan semakan ralat segera berbanding skrip Groovy lama.',
        details: [
          code.includes('plugins') ? 'Mengisytiharkan pemalam binaan seperti Android dan sokongan pengkompil Kotlin.' : 'Menyusun arahan binaan.',
          code.includes('dependencies') ? 'Menentukan senarai pustaka luaran yang perlu dimuat turun untuk projek ini.' : 'Mengurus kebergantungan pakej.',
          code.includes('android') ? 'Menetapkan versi sasaran Android SDK dan konfigurasi pembungkusan aplikasi.' : 'Menyediakan skrip yang berstruktur.',
        ],
      };
    }
    return {
      title: `Kotlin Script & Gradle Build DSL (${cleanName})`,
      simpleAnalogy: 'Think of .kts like an automated construction manual written in modern Kotlin: it orchestrates dependencies, Android target versions, and compilation rules.',
      whatItDoes: 'A Kotlin script file primarily used for modern Gradle build configurations (build.gradle.kts and settings.gradle.kts) in Android and Kotlin multiplatform apps. It provides strict compile-time type safety, IDE code completion, and error detection far superior to legacy Groovy scripts.',
      details: [
        code.includes('plugins') ? 'Declares build plugins (e.g. Android Application, Kotlin Multiplatform).' : 'Defines build orchestration.',
        code.includes('dependencies') ? 'Specifies external libraries and packages to fetch from Maven/Google repositories.' : 'Declares software dependencies.',
        code.includes('android') ? 'Configures Android SDK versions (minSdk, targetSdk), build variants, and proguard rules.' : 'Ensures type-safe compilation settings.',
      ],
    };
  }

  // 5. .gradle (Groovy Gradle Build Script)
  if (ext === 'gradle') {
    if (lang === 'zh-CN') {
      return {
        title: `Gradle 构建系统脚本 (${cleanName})`,
        simpleAnalogy: '把 .gradle 想象成传统建筑工程的施工计划表：指挥自动化工具如何抓取外部包、编译源码并打包生成目标软件。',
        whatItDoes: '使用 Groovy 语言编写的自动化构建脚本。在 Android 和 Java 项目中负责拉取开源库依赖、配置编译器选项、管理多渠道打包以及执行自动化测试任务。',
        details: [
          code.includes('dependencies') ? '列出此项目依赖的外部第三方软件库清单。' : '管理构建流水线。',
          code.includes('android') ? '配置 Android 应用的包名、版本号 (versionCode) 及编译参数。' : '定义构建参数。',
          '由 Gradle 守护进程读取并在打包 APK、AAB 或发布版本时自动执行。',
        ],
      };
    }
    if (lang === 'ms') {
      return {
        title: `Skrip Binaan Sistem Gradle (${cleanName})`,
        simpleAnalogy: 'Fikirkan .gradle seperti pelan jadual pembinaan: mengarahkan sistem automasi memuat turun pakej, menyusun kod dan menghasilkan aplikasi.',
        whatItDoes: 'Skrip binaan berasaskan Groovy untuk projek Android dan Java. Bertanggungjawab mengurus pustaka luaran, menetapkan parameter kompilasi, dan menjana fail APK/AAB yang boleh dipasang.',
        details: [
          code.includes('dependencies') ? 'Menyenaraikan pustaka luar yang diperlukan untuk menjalankan projek.' : 'Mengatur kebergantungan.',
          code.includes('android') ? 'Menetapkan ID aplikasi, nombor versi, dan tetapan SDK Android.' : 'Menetapkan pilihan binaan.',
          'Dijalankan secara automatik oleh enjin Gradle semasa menghasilkan perisian.',
        ],
      };
    }
    return {
      title: `Gradle Build Script (${cleanName})`,
      simpleAnalogy: 'Think of .gradle like the project master blueprint: it tells the build system what libraries to download and how to assemble the software.',
      whatItDoes: 'A build automation script written in Groovy DSL for Android and Java ecosystems. It handles downloading external dependencies, configuring compilation settings, managing product flavors, and packaging output binaries like APKs and JARs.',
      details: [
        code.includes('dependencies') ? 'Specifies third-party libraries and SDKs required by the project.' : 'Manages dependencies.',
        code.includes('android') ? 'Configures Android applicationId, compileSdk, and versioning.' : 'Sets build parameters.',
        'Executed by the Gradle daemon during test, build, and packaging lifecycles.',
      ],
    };
  }

  // 6. .apk (Android Application Package)
  if (ext === 'apk' || ext === 'aab' || ext === 'xapk') {
    if (lang === 'zh-CN') {
      return {
        title: `Android 应用程序安装包 (${cleanName})`,
        simpleAnalogy: '把 .apk 想象成已打包好的安卓软件安装光盘：解压即用，可以直接安装到任何安卓手机或模拟器中运行。',
        whatItDoes: '安卓系统的原生应用安装包格式。它将编译好的 DEX 字节码、清单文件 (AndroidManifest.xml)、图标与布局资源 (res/) 以及 C/C++ 动态链接库 (lib/) 打包为一个可验证签名的安装文件。',
        details: [
          '可直接在 Android 手机、平板或模拟器上双击或侧载 (sideload) 安装。',
          '内部内置数字签名以确保软件未被第三方恶意篡改。',
          '在 ZipStudio 中可通过内置包检查器安全解包检视文件树或直接导出。',
        ],
      };
    }
    if (lang === 'ms') {
      return {
        title: `Pakej Pemasangan Aplikasi Android (${cleanName})`,
        simpleAnalogy: 'Fikirkan .apk seperti kotak pemasangan perisian untuk Android: pakej lengkap yang boleh dipasang terus ke dalam telefon atau emulator.',
        whatItDoes: 'Format pakej aplikasi rasmi untuk sistem operasi Android. Menggabungkan baitkod DEX yang telah dikompil, fail manifes, sumber visual grafik, dan pustaka sokongan ke dalam satu fail pemasangan.',
        details: [
          'Boleh dipasang secara terus pada peranti pintar Android atau emulator.',
          'Mengandungi sijil tandatangan digital bagi memastikan ketulenan perisian.',
          'Boleh diperiksa strukturnya dengan selamat dalam ZipStudio tanpa menyebabkan sebarang kerosakan.',
        ],
      };
    }
    return {
      title: `Android Application Package (${cleanName})`,
      simpleAnalogy: 'Think of an .apk file like a ready-to-install software box for Android: download it, tap install, and it runs immediately on any Android phone or emulator.',
      whatItDoes: 'The native package file format used by Android to distribute and install mobile apps. It bundles compiled Dalvik/ART bytecode (.dex), application manifest (AndroidManifest.xml), compiled resources (.arsc), visual assets, and native C++ libraries (.so) into a signed installable archive.',
      details: [
        'Directly installable or sideloadable onto Android devices and emulators.',
        'Cryptographically signed to verify developer authenticity and code integrity.',
        'Can be safely explored and downloaded inside ZipStudio without memory lag or crashes.',
      ],
    };
  }

  // 7. .env (Environment Variables)
  if (cleanName.startsWith('.env')) {
    if (lang === 'zh-CN') {
      return {
        title: `环境变量与秘密配置 (${cleanName})`,
        simpleAnalogy: '把 .env 想象成安全保险柜密码贴纸：存储仅在当前机器上生效的密码、端口号和 API 访问秘钥。',
        whatItDoes: '以“键=值”形式声明私密配置参数。让敏感的凭证（如数据库密码、GitHub 令牌、第三方 API Key）同核心源代码解耦分离，确保在更换服务器或部署上线时无需修改任何一行业务代码。',
        details: [
          '采用 KEY=VALUE 格式声明环境配置。',
          '严格由 .gitignore 排除，绝不提交至公共代码库以防机密泄漏。',
          '在开发与生产环境中无缝切换不同的配置参数。',
        ],
      };
    }
    if (lang === 'ms') {
      return {
        title: `Pembolehubah Persekitaran & Tetapan Rahsia (${cleanName})`,
        simpleAnalogy: 'Fikirkan fail .env seperti nota peti keselamatan peribadi: menyimpan kata laluan, nombor port dan kunci API rahsia hanya untuk peranti anda.',
        whatItDoes: 'Menyimpan konfigurasi rahsia dalam bentuk KUNCI=NILAI. Memisahkan data sulit daripada kod sumber utama supaya projek selamat dan boleh dikonfigurasikan dengan mudah di pelayan berbeza.',
        details: [
          'Format mudah berasaskan KUNCI=NILAI.',
          'Wajib dikecualikan oleh fail .gitignore bagi mengelakkan kebocoran maklumat rahsia.',
          'Memudahkan pertukaran tetapan antara mod ujian dan pelayan sebenar.',
        ],
      };
    }
    return {
      title: `Environment Variables & Secrets (${cleanName})`,
      simpleAnalogy: 'Think of .env like a private sticky note inside a safe: it holds the secret keys, passwords, and port settings needed by your local machine.',
      whatItDoes: 'Stores sensitive credentials and environment-specific settings in KEY=VALUE pairs. By decoupling secrets (like GitHub tokens, API keys, and database passwords) from the source code, your project stays secure and easily configurable across development and production servers.',
      details: [
        'Uses simple KEY=VALUE configuration syntax.',
        'Always kept local and excluded by .gitignore to prevent accidental credential leaks.',
        'Allows easy switching between local, staging, and production server environments.',
      ],
    };
  }

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
  if (ext === 'svg' || ext === 'xml' || cleanName.endsWith('.xml')) {
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
