import { ExternalsPlugin, Template } from 'webpack';

const pluginName = 'RuntimeImportPlugin';

module.exports = class RuntimeImportPlugin {
  assets;

  cdnCss = {};
  cdnJs = {};

  getEntryAssets = () => null;

  constructor({ assets, getEntryAssets }) {
    this.cdnJs = assets.js;
    this.cdnCss = assets.css;
    this.getEntryAssets = getEntryAssets;
  }

  findDependencies = (chunk, compilation) => {
    let modules = Array.from(
      compilation.chunkGraph.getChunkModulesIterable(chunk),
    );

    let allKeys = [...Object.keys(this.cdnCss), ...Object.keys(this.cdnJs)];

    let dependencies = [];
    modules.forEach((module) => {
      for (let request of ['rawRequest', 'userRequest']) {
        if (allKeys.includes(module[request])) {
          dependencies.push({
            request: module[request],
            requestKey: request,
            module: module,
          });
          break;
        }
      }
    });
    return dependencies;
  };

  apply(compiler) {
    let externals = {};
    for (let key in this.cdnJs) {
      const { url, moduleName } = this.cdnJs[key];
      externals[key] = [url, moduleName];
    }
    new ExternalsPlugin('script', externals).apply(compiler);

    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      let cssChunkMap = {};
      compilation.hooks.optimizeChunks.tap(
        { name: pluginName, stage: 'STAGE_ADVANCED' },
        (chunks) => {
          for (const chunk of chunks) {
            let dependencies = this.findDependencies(chunk, compilation);
            let isEntry = chunk.canBeInitial();
            dependencies.forEach((dependency) => {
              let key = dependency.request;
              if (isEntry) {
                if (this.cdnJs[key]) {
                  let cdn = this.cdnJs[key];
                  dependency.module.externalType = 'var';
                  dependency.module.request = cdn.moduleName;
                }
                if (key.endsWith('.css')) {
                  this.getEntryAssets('css', [this.cdnCss[key].url]);
                } else {
                  this.getEntryAssets('js', [this.cdnJs[key].url]);
                }
              }
              if (this.cdnCss[key]) {
                if (!cssChunkMap[chunk.debugId]) {
                  cssChunkMap[chunk.debugId] = { isEntry, modules: [] };
                }
                cssChunkMap[chunk.debugId].modules.push(dependency);
              }
            });
          }
          for (let chunk of chunks) {
            let modules = Array.from(
              compilation.chunkGraph.getChunkModulesIterable(chunk),
            );
            Object.values(cssChunkMap)
              .reduce((a, b) => {
                return [...a, ...b.modules];
              }, [])
              .forEach((chunk) => {
                modules.forEach((module) => {
                  if (
                    module.type === 'css/mini-extract' &&
                    compilation.moduleGraph.getIssuer(module)?.debugId ==
                      chunk.module.debugId
                  ) {
                    compilation.chunkGraph.disconnectChunkAndModule(
                      chunk,
                      module,
                    );
                  }
                });
              });
          }
        },
      );

      compilation.mainTemplate.hooks.requireEnsure.tap(pluginName, (source) => {
        let chunks = Array.from(compilation.chunks);
        let cssObj = {};
        if (Object.keys(cssChunkMap).length) {
          for (let key in cssChunkMap) {
            let v = cssChunkMap[key];
            if (v.isEntry) continue;
            let match = chunks.find((ele) => ele.debugId == key);
            if (match) {
              cssObj[match.id] = [];
              v.modules.forEach((ele) => {
                cssObj[match.id].push(this.cdnCss[ele.request].url);
              });
            }
          }
        }

        return Template.asString([
          source,
          Template.indent([
            Template.indent([
              `var installedCdnCssHref = {}`,
              `var importCdnCss = function(href) {`,
              Template.indent([
                `var fullhref = href;`,
                `if (installedCdnCssHref[href]) {`,
                Template.indent([`return null`]),
                `}`,
                `return new Promise(function(resolve, reject) {`,
                Template.indent([
                  'var existingLinkTags = document.getElementsByTagName("link");',
                  'for(var i = 0; i < existingLinkTags.length; i++) {',
                  Template.indent([
                    'var tag = existingLinkTags[i];',
                    'var dataHref = tag.getAttribute("data-href") || tag.getAttribute("href");',
                    'if(tag.rel === "stylesheet" && (dataHref === href || dataHref === fullhref)) return resolve();',
                  ]),
                  '}',
                  'var existingStyleTags = document.getElementsByTagName("style");',
                  'for(var i = 0; i < existingStyleTags.length; i++) {',
                  Template.indent([
                    'var tag = existingStyleTags[i];',
                    'var dataHref = tag.getAttribute("data-href");',
                    'if(dataHref === href || dataHref === fullhref) return resolve();',
                  ]),
                  '}',
                  'var linkTag = document.createElement("link");',
                  'linkTag.rel = "stylesheet";',
                  'linkTag.type = "text/css";',
                  'linkTag.onload = function() {',
                  Template.indent([
                    `installedCdnCssHref[href] = 1`,
                    `resolve()`,
                  ]),
                  `}`,
                  'linkTag.onerror = function(event) {',
                  Template.indent([
                    'var request = event && event.target && event.target.src || fullhref;',
                    'var err = new Error("Loading CSS chunk " + href + " failed.\\n(" + request + ")");',
                    'err.code = "CDN_CSS_CHUNK_LOAD_FAILED";',
                    'err.request = request;',
                    `delete installedCdnCssHref[href]`,
                    'linkTag.parentNode.removeChild(linkTag)',
                    'reject(err);',
                  ]),
                  '};',
                  'linkTag.href = fullhref;',
                  'var head = document.getElementsByTagName("head")[0];',
                  'head.appendChild(linkTag);',
                ]),
                `});`,
              ]),
              `}`,
            ]),
            `var cdnCss = ${JSON.stringify(cssObj, null, '\t')};`,
            `cdnCss[chunkId] && cdnCss[chunkId].forEach(function(ele) {`,
            Template.indent([
              `var p = importCdnCss(ele)`,
              `if (p)`,
              Template.indent([`promises.push(p)`]),
            ]),
            `})`,
          ]),
        ]);
      });
    });
  }
};
