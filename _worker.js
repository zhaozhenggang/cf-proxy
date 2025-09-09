addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  thisProxyServerUrlHttps = `${url.protocol}//${url.hostname}/`;
  thisProxyServerUrl_hostOnly = url.host;
  event.respondWith(handleRequest(event.request))
})

const str = "/";
const lastVisitProxyCookie = "__PROXY_VISITEDSITE__";
const passwordCookieName = "__PROXY_PWD__";
const proxyHintCookieName = "__PROXY_HINT__";
const password = "";
const showPasswordPage = true;
const replaceUrlObj = "__location__yproxy__"
const injectedJsId = "__yproxy_injected_js_id__"

var thisProxyServerUrlHttps;
var thisProxyServerUrl_hostOnly;

// 预编译正则表达式 - 性能优化 (保持原有)
const urlRegexHttp = /http:\/\//g;
const urlRegexHttps = /https:\/\//g;
const windowLocationRegex = /window\.location/g;
const documentLocationRegex = /document\.location/g;

// 优化的内容过滤 - 扩展跳过列表 (保持原有功能)
const SKIP_CONTENT_TYPES = new Set(['image/', 'font/', 'audio/', 'application/octet-stream']);
const SKIP_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.webp', '.svg', '.mp3', '.wav', '.ogg']);

// 视频相关的 MIME 类型和扩展名 (保持完整)
const VIDEO_MIME_TYPES = new Set([
  'video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 'video/wmv', 
  'video/flv', 'video/mkv', 'video/3gp', 'video/m4v', 'video/ts', 'video/m3u8',
  'application/vnd.apple.mpegurl', 'application/x-mpegURL', 'application/dash+xml'
]);

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv', 
  '.3gp', '.m4v', '.ts', '.m3u8', '.mpd'
]);

// 优化：批量 URL 替换，减少循环次数
const URL_REPLACEMENTS = [
  [urlRegexHttp, () => thisProxyServerUrlHttps + "http://"],
  [urlRegexHttps, () => thisProxyServerUrlHttps + "https://"]
];

const LOCATION_REPLACEMENTS = [
  [windowLocationRegex, "window." + replaceUrlObj],
  [documentLocationRegex, "document." + replaceUrlObj]
];

function shouldSkipProcessing(contentType, url) {
  // 快速检查内容类型 - 保持原逻辑
  if (contentType) {
    for (const skipType of SKIP_CONTENT_TYPES) {
      if (contentType.includes(skipType)) return true;
    }
  }
  
  // 快速检查文件扩展名
  const pathname = url.pathname.toLowerCase();
  for (const ext of SKIP_EXTENSIONS) {
    if (pathname.endsWith(ext)) return true;
  }
  
  return false;
}

// 增强的视频流检测 (保持原有完整功能)
function isVideoStream(contentType, url, headers) {
  // 检查 Content-Type
  if (contentType) {
    const lowerType = contentType.toLowerCase();
    for (const videoType of VIDEO_MIME_TYPES) {
      if (lowerType.includes(videoType)) return true;
    }
  }
  
  // 检查文件扩展名
  const pathname = url.pathname.toLowerCase();
  for (const ext of VIDEO_EXTENSIONS) {
    if (pathname.includes(ext)) return true;
  }
  
  // 检查 YouTube 和其他视频平台的特殊路径
  if (url.pathname.includes('/videoplayback')) return true;
  if (url.pathname.includes('/video/')) return true;
  if (url.pathname.includes('/stream/')) return true;
  if (url.searchParams.has('mime') && url.searchParams.get('mime').includes('video')) return true;
  if (url.searchParams.has('itag')) return true; // YouTube specific
  
  // 检查响应头中的视频相关标识
  if (headers) {
    const contentDisposition = headers.get('content-disposition');
    if (contentDisposition && contentDisposition.includes('video')) return true;
  }
  
  return false;
}

// 检查是否为 Range 请求 (保持原有)
function isRangeRequest(request) {
  return request.headers.has('Range') || request.headers.has('range');
}

const proxyHintInjection = `
function toEntities(str) {
  return str.split("").map(ch => \`&#\${ch.charCodeAt(0)};\`).join("");
}

setTimeout(() => {
  var hint = \`Warning: You are currently using a web proxy, so do not log in to any website. Click to close this hint.\`;
  
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    document.body.insertAdjacentHTML('afterbegin', 
      \`<div style="position:fixed;left:0px;top:0px;width:100%;margin:0px;padding:0px;display:block;z-index:99999999999999999999999;user-select:none;cursor:pointer;" id="__PROXY_HINT_DIV__" onclick="this.remove();">
        <span style="position:relative;display:block;width:calc(100% - 20px);min-height:30px;font-size:14px;color:yellow;background:rgb(180,0,0);text-align:center;border-radius:5px;padding:10px;">
          \${toEntities(hint)}
          <br>
          <a href="https://github.com/1234567Yang/cf-proxy-ex/" style="color:rgb(250,250,180);">GitHub Project</a>
        </span>
      </div>\`
    );
  }
}, 3000);
`;

// 优化的客户端注入脚本 - 保持所有原有功能但提升性能
var httpRequestInjection = `
//---***========================================***---Core Proxy Functions---***========================================***---
var nowURL = new URL(window.location.href);
var proxy_host = nowURL.host;
var proxy_protocol = nowURL.protocol;
var proxy_host_with_schema = proxy_protocol + "//" + proxy_host + "/";
var original_website_url_str = window.location.href.substring(proxy_host_with_schema.length);
var original_website_url = new URL(original_website_url_str);
var original_website_href = nowURL.pathname.substring(1);
if(!original_website_href.startsWith("http")) original_website_href = "https://" + original_website_href;
var original_website_host = original_website_url_str.substring(original_website_url_str.indexOf("://") + "://".length).split('/')[0];
var original_website_host_with_schema = original_website_url_str.substring(0, original_website_url_str.indexOf("://")) + "://" + original_website_host + "/";

// 优化：缓存处理结果
var urlCache = new Map();
function changeURL(relativePath){
  if(relativePath == null) return null;
  
  // 缓存检查
  if(urlCache.has(relativePath)) return urlCache.get(relativePath);
  
  try{
    if(relativePath.startsWith("data:") || relativePath.startsWith("mailto:") || relativePath.startsWith("javascript:") || relativePath.startsWith("chrome") || relativePath.startsWith("edge")) {
      urlCache.set(relativePath, relativePath);
      return relativePath;
    }
  }catch{ 
    urlCache.set(relativePath, relativePath);
    return relativePath; 
  }
  
  try{
    if(relativePath && relativePath.startsWith(proxy_host_with_schema)) relativePath = relativePath.substring(proxy_host_with_schema.length);
    if(relativePath && relativePath.startsWith(proxy_host + "/")) relativePath = relativePath.substring(proxy_host.length + 1);
    if(relativePath && relativePath.startsWith(proxy_host)) relativePath = relativePath.substring(proxy_host.length);
  }catch{ /* ignore */ }
  
  try {
    var absolutePath = new URL(relativePath, original_website_url_str).href;
    absolutePath = absolutePath.replace(window.location.href, original_website_href);
    absolutePath = absolutePath.replace(encodeURI(window.location.href), encodeURI(original_website_href));
    absolutePath = absolutePath.replace(encodeURIComponent(window.location.href), encodeURIComponent(original_website_href));
    absolutePath = absolutePath.replace(proxy_host, original_website_host);
    absolutePath = absolutePath.replace(encodeURI(proxy_host), encodeURI(original_website_host));
    absolutePath = absolutePath.replace(encodeURIComponent(proxy_host), encodeURIComponent(original_website_host));
    absolutePath = proxy_host_with_schema + absolutePath;
    
    // 缓存结果
    if(urlCache.size < 1000) urlCache.set(relativePath, absolutePath);
    return absolutePath;
  } catch (e) {
    urlCache.set(relativePath, relativePath);
    return relativePath;
  }
}

function getOriginalUrl(url){
  if(url == null) return null;
  if(url.startsWith(proxy_host_with_schema)) return url.substring(proxy_host_with_schema.length);
  return url;
}

//---***========================================***---Network Injection (保持完整功能)---***========================================***---
(function(){
  var originalOpen = XMLHttpRequest.prototype.open;
  var originalFetch = window.fetch;
  
  XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
    arguments[1] = changeURL(url);
    return originalOpen.apply(this, arguments);
  };

  window.fetch = function(input, init) {
    var url = typeof input === 'string' ? input : input.url;
    url = changeURL(url);
    return typeof input === 'string' ? originalFetch(url, init) : originalFetch(new Request(url, input), init);
  };
})();

//---***========================================***---Media Source Extensions Support (保持完整)---***========================================***---
(function(){
  // 支持 Media Source Extensions (MSE) 用于视频流
  if (window.MediaSource) {
    const originalAddSourceBuffer = MediaSource.prototype.addSourceBuffer;
    MediaSource.prototype.addSourceBuffer = function(mimeType) {
      return originalAddSourceBuffer.call(this, mimeType);
    };
  }
  
  // 支持 HTML5 Video API
  const originalLoad = HTMLMediaElement.prototype.load;
  HTMLMediaElement.prototype.load = function() {
    if (this.src) {
      this.src = changeURL(this.src);
    }
    return originalLoad.call(this);
  };
  
  // 支持 Video 元素的 src 属性
  try {
    const videoSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, 'src') || 
                              Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
    if (videoSrcDescriptor) {
      Object.defineProperty(HTMLVideoElement.prototype, 'src', {
        get: function() {
          return getOriginalUrl(videoSrcDescriptor.get.call(this));
        },
        set: function(url) {
          videoSrcDescriptor.set.call(this, changeURL(url));
        },
        configurable: true
      });
    }
  } catch(e) { /* ignore */ }
  
  // 支持 Audio 元素
  try {
    const audioSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLAudioElement.prototype, 'src') || 
                              Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
    if (audioSrcDescriptor) {
      Object.defineProperty(HTMLAudioElement.prototype, 'src', {
        get: function() {
          return getOriginalUrl(audioSrcDescriptor.get.call(this));
        },
        set: function(url) {
          audioSrcDescriptor.set.call(this, changeURL(url));
        },
        configurable: true
      });
    }
  } catch(e) { /* ignore */ }
})();

//---***========================================***---Window & DOM Injection (保持完整)---***========================================***---
(function(){
  const originalOpen = window.open;
  window.open = function (url, name, specs) {
      return originalOpen.call(window, changeURL(url), name, specs);
  };

  // 优化：批量处理属性
  const originalSetAttribute = HTMLElement.prototype.setAttribute;
  HTMLElement.prototype.setAttribute = function (name, value) {
      if ((name === "src" || name === "href") && value) {
        value = changeURL(value);
      }
      return originalSetAttribute.call(this, name, value);
  };

  const originalGetAttribute = HTMLElement.prototype.getAttribute;
  HTMLElement.prototype.getAttribute = function (name) {
    const val = originalGetAttribute.call(this, name);
    if ((name === "href" || name === "src") && val) {
      return getOriginalUrl(val);
    }
    return val;
  };

  // 优化的 anchor href 处理 (保持完整功能)
  try {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, 'href');
    Object.defineProperty(HTMLAnchorElement.prototype, 'href', {
      get: function () {
        return getOriginalUrl(descriptor.get.call(this));
      },
      set: function (val) {
        descriptor.set.call(this, changeURL(val));
      },
      configurable: true
    });
  } catch(e) { /* ignore */ }
})();

//---***========================================***---Location Object (保持完整)---***========================================***---
class ProxyLocation {
  constructor(originalLocation) {
      this.originalLocation = originalLocation;
  }

  getStrNPosition(string, subString, index) {
    return string.split(subString, index).join(subString).length;
  }
  
  getOriginalHref() {
    return window.location.href.substring(this.getStrNPosition(window.location.href,"/",3)+1);
  }

  reload(forcedReload) { this.originalLocation.reload(forcedReload); }
  replace(url) { this.originalLocation.replace(changeURL(url)); }
  assign(url) { this.originalLocation.assign(changeURL(url)); }

  get href() { return this.getOriginalHref(); }
  set href(url) { this.originalLocation.href = changeURL(url); }
  
  get protocol() { return original_website_url.protocol; }
  set protocol(value) { 
    original_website_url.protocol = value;
    window.location.href = proxy_host_with_schema + original_website_url.href;
  }
  
  get host() { return original_website_url.host; }
  set host(value) { 
    original_website_url.host = value;
    window.location.href = proxy_host_with_schema + original_website_url.href;
  }
  
  get hostname() { return original_website_url.hostname; }
  set hostname(value) { 
    original_website_url.hostname = value;
    window.location.href = proxy_host_with_schema + original_website_url.href;
  }
  
  get port() { return original_website_url.port; }
  set port(value) { 
    original_website_url.port = value;
    window.location.href = proxy_host_with_schema + original_website_url.href;
  }
  
  get pathname() { return original_website_url.pathname; }
  set pathname(value) { 
    original_website_url.pathname = value;
    window.location.href = proxy_host_with_schema + original_website_url.href;
  }
  
  get search() { return original_website_url.search; }
  set search(value) { 
    original_website_url.search = value;
    window.location.href = proxy_host_with_schema + original_website_url.href;
  }
  
  get hash() { return original_website_url.hash; }
  set hash(value) { 
    original_website_url.hash = value;
    window.location.href = proxy_host_with_schema + original_website_url.href;
  }
  
  get origin() { return original_website_url.origin; }
}

// Location 对象替换 (保持完整)
(function(){
  try {
    Object.defineProperty(document, 'URL', {
      get: function () { return original_website_url_str; },
      set: function (url) { document.URL = changeURL(url); }
    });

    Object.defineProperty(document, '${replaceUrlObj}', {
        get: function () { return new ProxyLocation(window.location); },  
        set: function (url) { window.location.href = changeURL(url); }
    });

    Object.defineProperty(window, '${replaceUrlObj}', {
        get: function () { return new ProxyLocation(window.location); },
        set: function (url) { window.location.href = changeURL(url); }
    });
  } catch(e) { /* ignore */ }
})();

//---***========================================***---History API (保持完整)---***========================================***---
(function(){
  const originalPushState = History.prototype.pushState;
  const originalReplaceState = History.prototype.replaceState;

  History.prototype.pushState = function (state, title, url) {
    if(!url) return;
    if(url.startsWith("/" + original_website_url.href)) url = url.substring(("/" + original_website_url.href).length);
    if(url.startsWith("/" + original_website_url.href.substring(0, original_website_url.href.length - 1))) url = url.substring(("/" + original_website_url.href).length - 1);
    return originalPushState.apply(this, [state, title, changeURL(url)]);
  };

  History.prototype.replaceState = function (state, title, url) {
    if(!url) return;
    if(url.startsWith("/" + original_website_url.href)) url = url.substring(("/" + original_website_url.href).length);
    if(url.startsWith("/" + original_website_url.href.substring(0, original_website_url.href.length - 1))) url = url.substring(("/" + original_website_url.href).length - 1);
    if(url.startsWith("/" + original_website_url.href.replace("://", ":/"))) url = url.substring(("/" + original_website_url.href.replace("://", ":/")).length);
    if(url.startsWith("/" + original_website_url.href.substring(0, original_website_url.href.length - 1).replace("://", ":/"))) url = url.substring(("/" + original_website_url.href).replace("://", ":/").length - 1);
    return originalReplaceState.apply(this, [state, title, changeURL(url)]);
  };
})();

//---***========================================***---DOM Observer (保持完整功能)---***========================================***---
(function(){
  function removeIntegrityAndConvert(element){
    if (element.hasAttribute && element.hasAttribute('integrity')) {
      element.removeAttribute('integrity');
    }
    
    var relativePath = "";
    var setAttr = "";
    if (element instanceof HTMLElement && element.hasAttribute("href")) {
      relativePath = element.getAttribute("href");
      setAttr = "href";
    }
    if (element instanceof HTMLElement && element.hasAttribute("src")) {
      relativePath = element.getAttribute("src");
      setAttr = "src";
    }

    if (setAttr !== "" && relativePath && relativePath.indexOf(proxy_host_with_schema) !== 0 && !relativePath.includes("*")) {
      try {
        element.setAttribute(setAttr, changeURL(relativePath));
      } catch (e) { /* ignore */ }
    }
  }

  function processNode(node) {
    if (node instanceof HTMLElement) {
      removeIntegrityAndConvert(node);
      // 优化：减少 querySelectorAll 调用
      const elements = node.querySelectorAll('[href], [src]');
      for(let i = 0; i < elements.length; i++) {
        removeIntegrityAndConvert(elements[i]);
      }
    }
  }

  // 页面加载完成后处理现有元素
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const elements = document.querySelectorAll('[href], [src]');
      for(let i = 0; i < elements.length; i++) {
        removeIntegrityAndConvert(elements[i]);
      }
    });
  } else {
    const elements = document.querySelectorAll('[href], [src]');
    for(let i = 0; i < elements.length; i++) {
      removeIntegrityAndConvert(elements[i]);
    }
  }

  // 观察新添加的元素
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(processNode);
    });
  });
  
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  // 定期处理脚本标签（优化频率）
  setInterval(() => {
    const scripts = document.querySelectorAll('script[src]:not([data-processed])');
    for(let i = 0; i < scripts.length; i++) {
      removeIntegrityAndConvert(scripts[i]);
      scripts[i].setAttribute('data-processed', 'true');
    }
  }, 5000); // 从3秒改为5秒

  // 错误恢复机制 (保持完整)
  window.addEventListener('error', event => {
    var element = event.target;
    if (element && element.tagName === 'SCRIPT' && element.src && !element.alreadyChanged) {
      removeIntegrityAndConvert(element);
      var newScript = document.createElement("script");
      newScript.src = element.src;
      newScript.async = element.async;
      newScript.defer = element.defer;
      newScript.alreadyChanged = true;
      document.head.appendChild(newScript);
    }
  }, true);
})();
`;

// 优化：预编译注入脚本
httpRequestInjection = `
(function () {
  ${httpRequestInjection}
  setTimeout(() => {
    const script = document.getElementById("${injectedJsId}");
    if (script) script.remove();
  }, 1);
})();
`;

// 主页面 HTML (保持完整功能)
const mainPage = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Enhanced Video Proxy</title>
  <style>
    body{background:rgb(150,10,10);color:rgb(240,240,0);font-family:Arial,sans-serif;margin:0;padding:20px;}
    a{color:rgb(250,250,180);text-decoration:none;}
    a:hover{text-decoration:underline;}
    .center{text-align:center;}
    .container{max-width:800px;margin:0 auto;}
    .important{font-weight:bold;font-size:1.2em;}
    form[id=urlForm] {max-width:400px;margin:20px auto;padding:20px;background:rgba(0,0,0,0.3);border-radius:8px;}
    input[id=targetUrl] {background-color:rgb(240,240,0);color:#000;width:100%;padding:12px;margin:10px 0;border:none;border-radius:4px;font-size:16px;}
    button[id=jumpButton] {background-color:rgb(240,240,0);color:#000;padding:12px 24px;border:none;border-radius:4px;cursor:pointer;font-size:16px;font-weight:bold;}
    button[id=jumpButton]:hover{background-color:rgb(220,220,0);}
    .feature-box{background:rgba(0,0,0,0.3);padding:20px;margin:20px 0;border-radius:8px;}
    .feature-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;margin:20px 0;}
    .feature-item{background:rgba(0,0,0,0.2);padding:15px;border-radius:5px;}
  </style>
</head>
<body>
  <div class="container">
    <h2 class="center">🚀 Enhanced Video Streaming Proxy</h2>
    
    <div class="feature-box center">
        <h3>⚡ Enhanced Video Support</h3>
        <div class="feature-list">
            <div class="feature-item">
                <strong>📺 Video Streaming</strong><br>
                YouTube, Vimeo, Dailymotion<br>
                Range request support<br>
                Optimized buffering
            </div>
            <div class="feature-item">
                <strong>🎬 Media Formats</strong><br>
                MP4, WebM, OGG, AVI<br>
                HLS (m3u8) streaming<br>
                DASH video support
            </div>
            <div class="feature-item">
                <strong>🛡️ Security & Privacy</strong><br>
                No request logging<br>
                Safe browsing warnings<br>
                Client-side processing
            </div>
            <div class="feature-item">
                <strong>🌐 Universal Access</strong><br>
                Bypass network restrictions<br>
                Access blocked websites<br>
                Full JavaScript support
            </div>
        </div>
    </div>
    
    <form id="urlForm" onsubmit="redirectToProxy(event)">
        <h3 class="center" style="margin-top:0;">🌍 Access Any Website</h3>
        <input type="text" id="targetUrl" placeholder="Enter URL (e.g., youtube.com, bilibili.com)..." required>
        <div class="center">
            <button type="submit" id="jumpButton">🚀 Access Website</button>
        </div>
    </form>
    
    <div class="feature-box">
        <h3 class="center">📋 Video Playback Instructions</h3>
        <ol style="max-width:600px;margin:0 auto;text-align:left;">
            <li>Enter the video website URL (YouTube, Bilibili, etc.)</li>
            <li>Click "Access Website" to open the proxied site</li>
            <li>Videos should now play properly with full buffering support</li>
            <li><span class="important">⚠️ Never login to accounts through any proxy!</span></li>
        </ol>
    </div>
    
    <div class="center" style="margin-top:30px;">
        <p>Enhanced for video streaming | <a href="https://github.com/1234567Yang/cf-proxy-ex/">📖 Source Code</a></p>
    </div>
  </div>
    
  <script>
    function redirectToProxy(event) {
        event.preventDefault();
        let targetUrl = document.getElementById('targetUrl').value.trim();
        
        if (!targetUrl) return;
        
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            targetUrl = 'https://' + targetUrl;
        }
        
        window.open(window.location.origin + '/' + targetUrl, '_blank');
    }
    
    // Enter key support
    document.getElementById('targetUrl').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            redirectToProxy(e);
        }
    });
  </script>
</body>
</html>
`;

// 密码页面 (保持完整)
const pwdPage = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Authentication Required</title>
    <style>
        body{background:rgb(150,10,10);color:rgb(240,240,0);font-family:Arial,sans-serif;text-align:center;padding:50px;margin:0;}
        .auth-container{max-width:300px;margin:0 auto;background:rgba(0,0,0,0.3);padding:30px;border-radius:8px;}
        input{width:100%;padding:12px;margin:10px 0;border:none;border-radius:4px;font-size:16px;}
        button{background:rgb(240,240,0);color:#000;padding:12px 20px;border:none;border-radius:4px;cursor:pointer;font-size:16px;font-weight:bold;}
        button:hover{background:rgb(220,220,0);}
    </style>
    <script>
        function setPassword() {
            try {
                var cookieDomain = window.location.hostname;
                var password = document.getElementById('password').value;
                var oneWeekLater = new Date();
                oneWeekLater.setTime(oneWeekLater.getTime() + (7 * 24 * 60 * 60 * 1000));
                document.cookie = "${passwordCookieName}" + "=" + password + "; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + cookieDomain;
                document.cookie = "${passwordCookieName}" + "=" + password + "; expires=" + oneWeekLater.toUTCString() + "; path=/; domain=" + cookieDomain;
                location.reload();
            } catch(e) {
                alert('Authentication failed: ' + e.message);
            }
        }
        
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('password').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') setPassword();
            });
        });
    </script>
</head>
<body>
    <div class="auth-container">
        <h2>🔐 Authentication Required</h2>
        <input id="password" type="password" placeholder="Enter Password" autofocus>
        <button onclick="setPassword()">Submit</button>
    </div>
</body>
</html>
`;

const redirectError = `
<html><head><meta charset="UTF-8"><title>Redirect Error</title></head>
<body style="background:rgb(150,10,10);color:rgb(240,240,0);font-family:Arial,sans-serif;padding:50px;text-align:center;">
<h2>❌ Redirect Error</h2>
<p>The website contains invalid redirect information that cannot be processed.</p>
</body></html>
`;

// 增强的视频流处理 - 支持 Range 请求 (保持完整功能，优化性能)
async function handleVideoStream(request, response, actualUrl) {
  const newHeaders = new Headers();
  
  // 批量设置必要头部
  const videoHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS, POST, PUT',
    'Access-Control-Allow-Headers': 'Range, Content-Range, Content-Length, Content-Type',
    'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
    'Accept-Ranges': 'bytes',
    'Cache-Control': response.headers.get('Cache-Control') || 'public, max-age=3600'
  };
  
  // 复制原有头部
  for (const [key, value] of response.headers.entries()) {
    newHeaders.set(key, value);
  }
  
  // 设置视频头部
  for (const [key, value] of Object.entries(videoHeaders)) {
    newHeaders.set(key, value);
  }
  
  // 删除可能阻止视频播放的头部
  const restrictiveHeaders = [
    'Cross-Origin-Resource-Policy',
    'Cross-Origin-Embedder-Policy', 
    'X-Frame-Options',
    'Content-Security-Policy',
    'Permissions-Policy'
  ];
  
  restrictiveHeaders.forEach(header => newHeaders.delete(header));
  
  // 确保正确的 MIME 类型
  const contentType = response.headers.get('Content-Type');
  if (contentType && !contentType.includes('video/') && actualUrl.pathname.includes('.mp4')) {
    newHeaders.set('Content-Type', 'video/mp4');
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

// 优化的文本处理 - 批量替换
function processTextContent(text, contentType) {
  // 基础 URL 替换
  for (const [regex, replacement] of URL_REPLACEMENTS) {
    text = text.replace(regex, replacement);
  }
  
  // HTML 和 JavaScript 特殊处理
  if (contentType && (contentType.includes("html") || contentType.includes("javascript"))) {
    for (const [regex, replacement] of LOCATION_REPLACEMENTS) {
      text = text.replace(regex, replacement);
    }
  }
  
  return text;
}

// 优化的请求头处理 - 减少循环
async function processRequestHeaders(request, actualUrl) {
  const headers = new Headers();
  const urlStr = actualUrl.href;
  const host = actualUrl.host;
  
  // 批量处理头部
  const headerEntries = [...request.headers.entries()];
  for (const [key, value] of headerEntries) {
    let newValue = value;
    if (value.includes(thisProxyServerUrlHttps)) {
      newValue = newValue.replaceAll(thisProxyServerUrlHttps, urlStr);
    }
    if (value.includes(thisProxyServerUrl_hostOnly)) {
      newValue = newValue.replaceAll(thisProxyServerUrl_hostOnly, host);
    }
    headers.set(key, newValue);
  }
  
  return headers;
}

// 优化的请求体处理 - 添加大小检查
async function processRequestBody(request, actualUrl) {
  if (!request.body) return null;
  
  try {
    // 检查内容长度，避免处理过大的请求体
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 1024 * 1024) {
      return request.body; // 大于1MB直接返回
    }
    
    const text = await request.text();
    if (text.includes(thisProxyServerUrlHttps) || text.includes(thisProxyServerUrl_hostOnly)) {
      return text
        .replaceAll(thisProxyServerUrlHttps, actualUrl.href)
        .replaceAll(thisProxyServerUrl_hostOnly, actualUrl.host);
    }
    return text;
  } catch (e) {
    return request.body;
  }
}

// 优化的 HTML 注入 - 更快的字符串操作
function injectScriptIntoHTML(text, hasProxyHintCook) {
  // 处理 BOM
  let hasBom = false;
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.substring(1);
    hasBom = true;
  }

  const scriptContent = !hasProxyHintCook ? 
    proxyHintInjection + '\n' + httpRequestInjection : 
    httpRequestInjection;

  const inject = `<!DOCTYPE html>
<script id="${injectedJsId}">
${scriptContent}
</script>`;

  return (hasBom ? "\uFEFF" : "") + inject + text;
}

// 主请求处理函数 - 保持所有原有功能
async function handleRequest(request) {
  // ======================= 前置检查 =======================
  const userAgent = request.headers.get('User-Agent');
  if (userAgent?.includes("Bytespider")) {
    return new Response("Access denied for crawlers", { status: 403 });
  }

  // ======================= 密码验证 =======================
  const siteCookie = request.headers.get('Cookie') || '';
  
  if (password !== "") {
    const pwd = getCook(passwordCookieName, siteCookie);
    if (!pwd || pwd !== password) {
      return handleWrongPwd();
    }
  }

  // ======================= URL 处理 =======================
  const url = new URL(request.url);
  
  // 快速处理特殊文件 - 使用对象查找
  const staticRoutes = {
    'favicon.ico': () => Response.redirect("https://www.baidu.com/favicon.ico", 301),
    'robots.txt': () => new Response("User-Agent: *\nDisallow: /", {
      headers: { "Content-Type": "text/plain" }
    })
  };
  
  const filename = url.pathname.split('/').pop();
  if (staticRoutes[filename]) {
    return staticRoutes[filename]();
  }

  let actualUrlStr = url.pathname.substring(url.pathname.indexOf(str) + str.length) + url.search + url.hash;
  
  if (actualUrlStr === "") {
    return getHTMLResponse(mainPage);
  }

  // URL 验证和格式化 (保持原逻辑)
  try {
    let test = actualUrlStr.startsWith("http") ? actualUrlStr : "https://" + actualUrlStr;
    const testUrl = new URL(test);
    if (!testUrl.host.includes(".")) {
      throw new Error("Invalid URL");
    }
  } catch {
    const lastVisit = getCook(lastVisitProxyCookie, siteCookie);
    if (lastVisit) {
      return Response.redirect(thisProxyServerUrlHttps + lastVisit + "/" + actualUrlStr, 301);
    }
    return getHTMLResponse("Invalid URL format");
  }

  if (!actualUrlStr.startsWith("http")) {
    return Response.redirect(thisProxyServerUrlHttps + "https://" + actualUrlStr, 301);
  }

  const actualUrl = new URL(actualUrlStr);
  
  if (actualUrlStr !== actualUrl.href) {
    return Response.redirect(thisProxyServerUrlHttps + actualUrl.href, 301);
  }

  // ======================= 请求处理 =======================
  const [headers, body] = await Promise.all([
    processRequestHeaders(request, actualUrl),
    processRequestBody(request, actualUrl)
  ]);
  
  const modifiedRequest = new Request(actualUrl, {
    headers: headers,
    method: request.method,
    body: body,
    redirect: "manual"
  });

  // ======================= 发送请求 (添加超时控制) =======================
  let response;
  try {
    // 优化：添加 8 秒超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    response = await fetch(modifiedRequest, { signal: controller.signal });
    clearTimeout(timeoutId);
  } catch (error) {
    if (error.name === 'AbortError') {
      return new Response('Request timeout', { status: 504 });
    }
    throw error;
  }

  // 处理重定向 (保持原逻辑)
  if (response.status.toString().startsWith("3") && response.headers.get("Location")) {
    try {
      const redirectUrl = new URL(response.headers.get("Location"), actualUrlStr).href;
      return Response.redirect(thisProxyServerUrlHttps + redirectUrl, 301);
    } catch {
      return getHTMLResponse(redirectError);
    }
  }

  // ======================= 响应处理 =======================
  const contentType = response.headers.get("Content-Type") || '';
  const hasProxyHintCook = getCook(proxyHintCookieName, siteCookie) !== "";
  
  // 视频流特殊处理 - 增强检测
  if (isVideoStream(contentType, actualUrl, response.headers)) {
    return await handleVideoStream(request, response, actualUrl);
  }

  let modifiedResponse;

  // 文本内容处理 - 优化大文件处理
  if (response.body && contentType.startsWith("text/")) {
    // 跳过不需要处理的文件
    if (shouldSkipProcessing(contentType, actualUrl)) {
      return new Response(response.body, response);
    }

    // 检查内容大小
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 2 * 1024 * 1024) {
      // 大于2MB的文件直接透传
      return new Response(response.body, response);
    }

    let text = await response.text();
    
    // 处理文本内容
    text = processTextContent(text, contentType);
    
    // HTML 特殊处理 - 注入脚本
    if (contentType.includes("text/html") && text.includes("<html")) {
      text = injectScriptIntoHTML(text, hasProxyHintCook);
    }

    modifiedResponse = new Response(text, response);
  } else {
    // 二进制内容直接透传
    modifiedResponse = new Response(response.body, response);
  }

  // ======================= 响应头处理 =======================
  const finalHeaders = new Headers(modifiedResponse.headers);
  
  // 处理 Cookies (保持原逻辑)
  const cookieHeaders = [];
  for (const [key, value] of finalHeaders.entries()) {
    if (key.toLowerCase() === 'set-cookie') {
      cookieHeaders.push({ headerName: key, headerValue: value });
    }
  }

  if (cookieHeaders.length > 0) {
    cookieHeaders.forEach(cookieHeader => {
      const cookies = cookieHeader.headerValue.split(',').map(cookie => cookie.trim());
      
      for (let i = 0; i < cookies.length; i++) {
        const parts = cookies[i].split(';').map(part => part.trim());
        
        // 修改 Path
        const pathIndex = parts.findIndex(part => part.toLowerCase().startsWith('path='));
        const originalPath = pathIndex !== -1 ? parts[pathIndex].substring(5) : "/";
        
        try {
          const absolutePath = "/" + new URL(originalPath, actualUrlStr).href;
          
          if (pathIndex !== -1) {
            parts[pathIndex] = `Path=${absolutePath}`;
          } else {
            parts.push(`Path=${absolutePath}`);
          }
        } catch(e) {
          // 保持原路径
        }
        
        // 修改 Domain
        const domainIndex = parts.findIndex(part => part.toLowerCase().startsWith('domain='));
        if (domainIndex !== -1) {
          parts[domainIndex] = `domain=${thisProxyServerUrl_hostOnly}`;
        } else {
          parts.push(`domain=${thisProxyServerUrl_hostOnly}`);
        }
        
        cookies[i] = parts.join('; ');
      }
      
      finalHeaders.set(cookieHeader.headerName, cookies.join(', '));
    });
  }

  // 设置访问记录和提示 Cookie (保持原逻辑)
  if (contentType.includes("text/html") && response.status === 200) {
    const visitCookie = `${lastVisitProxyCookie}=${actualUrl.origin}; Path=/; Domain=${thisProxyServerUrl_hostOnly}`;
    finalHeaders.append("Set-Cookie", visitCookie);
    
    if (!hasProxyHintCook) {
      const expiryDate = new Date();
      expiryDate.setTime(expiryDate.getTime() + 24 * 60 * 60 * 1000);
      const hintCookie = `${proxyHintCookieName}=1; expires=${expiryDate.toUTCString()}; path=/`;
      finalHeaders.append("Set-Cookie", hintCookie);
    }
  }

  // 安全和跨域头 - 针对视频优化 (保持完整功能)
  const securityHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS, POST, PUT',
    'Access-Control-Allow-Headers': 'Range, Content-Range, Content-Length, Content-Type, Authorization',
    'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
    'X-Frame-Options': 'ALLOWALL'
  };
  
  for (const [key, value] of Object.entries(securityHeaders)) {
    finalHeaders.set(key, value);
  }
  
  // 删除限制性头部
  const restrictiveHeaders = [
    "Content-Security-Policy", 
    "Permissions-Policy", 
    "Cross-Origin-Embedder-Policy", 
    "Cross-Origin-Resource-Policy"
  ];
  
  restrictiveHeaders.forEach(header => {
    finalHeaders.delete(header);
    finalHeaders.delete(header + "-Report-Only");
  });

  if (!hasProxyHintCook) {
    finalHeaders.set("Cache-Control", "max-age=0");
  }

  return new Response(modifiedResponse.body, {
    status: modifiedResponse.status,
    statusText: modifiedResponse.statusText,
    headers: finalHeaders
  });
}

// 工具函数 (保持原有)
function getCook(cookiename, cookies) {
  const cookiestring = RegExp(cookiename + "=[^;]+").exec(cookies);
  return decodeURIComponent(!!cookiestring ? cookiestring.toString().replace(/^[^=]+./, "") : "");
}

function handleWrongPwd() {
  return showPasswordPage ? getHTMLResponse(pwdPage) : 
         getHTMLResponse("<h1>403 Forbidden</h1><br>Access denied.");
}

function getHTMLResponse(html) {
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
