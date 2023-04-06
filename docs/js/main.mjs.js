
// https://2030nlp.github.io/SpaCE2023/

// 基本信息 变量
const APP_NAME = "SpaCE2023";
const APP_VERSION = "23-0404-00";

// 开发环境 和 生产环境 的 控制变量
const DEVELOPING = location?.hostname=="2030nlp.github.io" ? 0 : 1;
if (DEVELOPING) {
  console.log("DEVELOPING");
} else {
  console.log("PRODUCTION");
};

// 引入依赖的模块

import {
  reactive,
  // readonly,
  // ref,
  // toRef,
  toRefs,
  computed,
  onMounted,
  // onUpdated,
  createApp as Vue_createApp,
  watch,
  // h,
} from './modules_lib/vue_3.2.31_.esm-browser.prod.min.js';
import axios from './modules_lib/axios_0.26.1_.mjs.js';
import __Wrap_of_marked__ from './modules_lib/marked_4.0.2_.min.mjs.js';

// import hljs from './modules_lib/highlight.js/lib/core';
// import javascript from './modules_lib/highlight.js/lib/languages/javascript';
// hljs.registerLanguage('javascript', javascript);

import hljs from './modules_lib/Highlight_11.5.0_.mjs.js';
import javascript from './modules_lib/Highlight_11.5.0_lang_javascript.mjs.js';
import json from './modules_lib/Highlight_11.5.0_lang_json.mjs.js';
// import python from './modules_lib/Highlight_11.5.0_lang_python.mjs.js';
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
// hljs.registerLanguage('python', python);



const escapeTest = /[&<>"']/;
const escapeReplace = /[&<>"']/g;
const escapeTestNoEncode = /[<>"']|&(?!#?\w+;)/;
const escapeReplaceNoEncode = /[<>"']|&(?!#?\w+;)/g;
const escapeReplacements = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};
const getEscapeReplacement = (ch) => escapeReplacements[ch];
function myEscape(html, encode) {
  if (encode) {
    if (escapeTest.test(html)) {
      return html.replace(escapeReplace, getEscapeReplacement);
    }
  } else {
    if (escapeTestNoEncode.test(html)) {
      return html.replace(escapeReplaceNoEncode, getEscapeReplacement);
    }
  }

  return html;
}

const unescapeTest = /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig;

/**
 * @param {string} html
 */
function myUnescape(html) {
  // explicitly match decimal, hex, and named HTML entities
  return html.replace(unescapeTest, (_, n) => {
    n = n.toLowerCase();
    if (n === 'colon') return ':';
    if (n.charAt(0) === '#') {
      return n.charAt(1) === 'x'
        ? String.fromCharCode(parseInt(n.substring(2), 16))
        : String.fromCharCode(+n.substring(1));
    }
    return '';
  });
}


const myTokenizer = {};

const myRenderer = {

  // https://marked.js.org/using_pro#renderer
  // https://github.com/markedjs/marked/blob/master/src/Renderer.js

  code(code, infostring, escaped) {

    // console.log(code);

    const lang = (infostring || '').match(/\S*/)[0];
    if (this.options.highlight) {
      const out = this.options.highlight(code, lang);
      if (out != null && out !== code) {
        // escaped = true;
        code = out;
      }
    }

    code = code.replace(/\n$/, '') + '\n';

    const escapedCode = escaped ? code : myEscape(code, true);
    // console.log(escapedCode);

    if (!lang) {
      return '<div class="code-block-wrap"><pre><code>'
        + escapedCode
        + '</code></pre></div>\n';
    }

    return '<div class="code-block-wrap"><pre><code class="'
      + this.options.langPrefix
      + myEscape(lang, true)
      + '">'
      + escapedCode
      + '</code></pre></div>\n';
  },


  /**
   * @param {string} text
   * @param {string} level
   * @param {string} raw
   * @param {any} slugger
   */
  heading(text, level, raw, slugger) {
    const mm = {
      // "1": "mt-5 mb-4",
      // "2": "mt-4 mb-3",
      // "3": "mt-3 mb-2",
      // "4": "mt-2 mb-1",
      // "5": "my-1",
      // "6": "my-1",
    };
    let idText = "";
    if (this.options.headerIds) {
      const id = this.options.headerPrefix + slugger.slug(raw);
      idText = ` id="${id}"`;
    }
    return `<h${level} class="h${level} ${mm[level]}"${idText}>${text}</h${level}>\n`;
  },

  /**
   * @param {string} header
   * @param {string} body
   */
  table(header, body) {
    if (body) {body = `<tbody>${body}</tbody>`;};
    return `<div class="table-wrap"><table class="table table-bordered">\n`
      + `<thead>\n${header}</thead>\n`
      + body
      + `</table></div>\n`;
  },

};


const RootComponent = {
  setup() {

    const mkd = marked;

    const myExtension = {
      tokenizer: myTokenizer,
      renderer: myRenderer,
    };

    mkd.use(myExtension);

    mkd.use({
      pedantic: false,
      gfm: true,
      breaks: true,
      headerIds: true,
      highlight: it=>it,
      sanitize: false,
      smartLists: true,
      smartypants: false,
      xhtml: true,
    });  // https://marked.js.org/using_advanced#options

    // 一个 axios 实例，方便在控制台调试
    const anAxios = axios.create({
      headers: {'Cache-Cotrol': 'no-cache'},
    });

    const localData = reactive({
      pageName: "",
      mdContent: "",
    });

    onMounted(()=>{updateMD()});

    const pages = {
      'index': {name: "index", title: "首页", href: "./index.html", md: "md/index.md"},
      'news': {name: "news", title: "最新消息", href: "./news.html", md: "md/news.md"},
      'leaderboard': {name: "leaderboard", title: "排行榜", href: "./leaderboard.html", md: "md/leaderboard.md"},
    };

    const pageNames = Object.keys(pages);

    const pageName = () => {
      let tmpLL = location.pathname.split("/").filter(it=>it.length);
      // console.log(tmpLL);
      let that = tmpLL[tmpLL.length-1].replace(/\.html$/g, "");
      // console.log(that);
      if (!pageNames.includes(that)) {that = "index"};
      return that;
    };

    // 更新 MD
    const updateMD = async () => {
      localData.pageName = pageName();

      let mdUrl = pages[localData.pageName].md;
      mdUrl = `${mdUrl}?x=${Math.ceil(Math.random()*999999999)}`;
      console.log(mdUrl);

      let wrap;
      try {
        let response = await anAxios.request({
          url: mdUrl,
          headers: {'Cache-Cotrol': 'no-cache'},
          method: 'get',
        });
        wrap = (response.data);
        // console.log(wrap);
        localData.mdContent = mkd.parse(wrap);
        await updateHLJS();
        document.title = `SpaCE2023 | ${pages[localData.pageName].title}`;
      } catch (error) {
        throw error;
        return;
      };
    };

    const updateHLJS = async () => {
      // console.log("highlight");
      setTimeout(()=>{
        document.querySelectorAll('pre code').forEach((el) => {
          hljs.highlightElement(el);
        }, 0);
      });
    };

    // watch(()=>localData.mdContent, async ()=>{
    //   console.log("11");
    //   await updateHLJS();
    //   console.log("22");
    // });



    return {
      //
      mkd,
      hljs,
      axios,
      anAxios,
      localData,
      pages,
      pageName,
      //
    };
  },
  template: `
    <div class="page-main">
      <div class="container">
        <main class="container main mt-4 mb-2 pt-3 pb-5 rounded">
          <!--<div class="row text-center">
            <div class="col">
              <div class="rounded overflow-hidden"><img src="./images/banner.png"></div>
            </div>
          </div>-->
          <div class="row text-center">
            <div class="col">
              <div class="rounded overflow-hidden py-4" style="border: 1px var(--pku-red) solid; color: var(--pku-red); --background:#4188bb;">
                <div class="h1 fw-bold m-0 p-0">SpaCE2023</div>
                <div>第三届中文空间语义理解评测</div>
              </div>
            </div>
          </div>
          <div class="row my-2">
            <div class="col">
              <ul class="nav nav-pills --nav-tabs justify-content-center">
                <li class="nav-item" v-for="page in pages">
                  <a class="nav-link" :class="{active: pageName()==page.name}" :href="page.href">{{page.title}}</a>
                </li>
                <li class="nav-item">
                  <!--<a class="nav-link" href="./register.html">立即报名</a>-->
                </li>
              </ul>
            </div>
          </div>
          <div class="row">
            <div class="col">
              <div class="md-wrap p-2" v-html="localData.mdContent"></div>
            </div>
          </div>
          <div class="row pb-5"></div>
          <div class="d-none d-md-block row mt-2 py-5"></div>
        </main>
      </div>

      <footer class=" text-center --rounded overflow-hidden py-5 text-light" style="border: 1px var(--pku-red) solid; background:var(--pku-red);">
        <p class="small fw-bold"><a class="text-decoration-none text-light" href="https://2030nlp.github.io/SpaCE2023">第三届中文空间语义理解评测  SpaCE2023</a></p>
        <!--<p class="small">主办单位： <a class="text-decoration-none text-light" href="https://www.pku.edu.cn" target="_blank">北京大学</a></p>-->
        <p class="small"><a class="text-decoration-none text-light" href="https://chinese.pku.edu.cn/" target="_blank">北京大学中文系</a></p>
        <p class="small"><a class="text-decoration-none text-light" href="http://ccl.pku.edu.cn/" target="_blank">北京大学中国语言学研究中心</a></p>
        <p class="small"><a class="text-decoration-none text-light" href="https://icl.pku.edu.cn/" target="_blank">北京大学计算语言学研究所</a></p>
        <p class="small"><a class="text-decoration-none text-light" href="https://klcl.pku.edu.cn/" target="_blank">北京大学计算语言学教育部重点实验室</a></p>
        <div class="mt-4 hstack gap-5 justify-content-center">
          <div><a class="text-decoration-none text-light" href="https://www.pku.edu.cn" target="_blank"><img src="./images/pku-logo.png" height="30"></a></div>
          <div><a class="text-decoration-none text-light" href="http://cips-cl.org/static/CCL2023/index.html" target="_blank"><img src="./images/ccl2023.png" height="30"> CCL2023</a></div>
        </div>
      </footer>

    </div>
  `,
};

const the_app = Vue_createApp(RootComponent);

const app = the_app.mount('#bodywrap');
window.app = app;

export default app;
