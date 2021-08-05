import { Template } from 'webpack';
import Chunk from 'webpack/lib/Chunk';

const PluginName = 'RuntimeImportPlugin';

module.exports = class RuntimeImportPlugin {
  assets;

  installedCss = {};
  cdnCss = {};
  cdnJs = {};

  getEntryAssets = () => null;

  constructor({ assets, getEntryAssets }) {
    this.assets = assets;
    this.getEntryAssets = getEntryAssets;
  }

  addEntryAssets = (type, chunk) => {
    const global = {};
    Object.entries(this.assets[type] || {}).forEach(([k, v]) => {
      if (!global[k] && this.findDependencies(k, chunk.entryModule)) {
        global[k] = v.url;
      }
    });

    this.getEntryAssets(type, global);
  };

  findDependencies = (dep, module, res = {}) => {
    if (module?.dependencies) {
      for (let d of module.dependencies) {
        if (d.request === dep) return true;

        if (d.module && d.userRequest && !res[d.userRequest]) {
          res[d.userRequest] = true;
          if (this.findDependencies(dep, d.module, res)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  getDependencies = (modules) => {
    let dependencies = [];
    modules.forEach((module) => {
      if (typeof module.source === 'function') {
        module.blocks?.forEach((block) => {
          block.dependencies.forEach((d) => {
            let chunkGroup = d.block?.chunkGroup;
            if (!chunkGroup) return;
            dependencies.push(d);
          });
        });
      }
    });
    return dependencies;
  };

  addJsTemplate = (compiler, compilation) => {
    compilation.mainTemplate.hooks.localVars.tap(PluginName, (source) =>
      source.replace(`function jsonpScriptSrc(chunkId) {`, (searchValue) =>
        Template.asString([
          `var cdnJs = typeof window !== "undefined" && window.__RUNTIME_IMPORT_JS__ || ${JSON.stringify(
            this.cdnJs,
            null,
            '\t',
          )};`,
          searchValue,
          Template.indent([
            `if(cdnJs[chunkId]) {`,
            Template.indent([`return cdnJs[chunkId].url;`]),
            `}`,
          ]),
        ]),
      ),
    );

    compilation.mainTemplate.hooks.requireEnsure?.tap(PluginName, (source) => {
      const outputName = `window["${
        compiler.options.output?.jsonpFunction || 'webpackJsonp'
      }"]`;

      return source
        .replace(`var chunk = installedChunks[chunkId];`, (searchValue) =>
          Template.asString([
            searchValue,
            Template.indent([
              Template.indent([
                `if(cdnJs[chunkId]) {`,
                Template.indent([
                  `${outputName}.push([[chunkId], window[cdnJs[chunkId].moduleName]]);`,
                ]),
                '}',
              ]),
            ]),
          ]),
        )
        .replace(
          `var script = document.createElement('script')`,
          (searchValue) =>
            Template.asString([
              `if(cdnJs[chunkId] && cdnJs[chunkId].moduleName && window[cdnJs[chunkId].moduleName]) {`,
              Template.indent([
                `${outputName}.push([[chunkId], window[cdnJs[chunkId].moduleName]]);`,
              ]),
              `} else {`,
              Template.indent([searchValue]),
            ]),
        )
        .replace(`document.head.appendChild(script);`, (searchValue) =>
          Template.asString([
            Template.indent([Template.indent([searchValue])]),
            '}',
          ]),
        );
    });
  };

  addJsDependencies = (compilation) => {
    compilation.hooks.afterOptimizeChunks.tap(PluginName, (chunks) => {
      for (const chunk of chunks) {
        if (chunk.hasRuntime()) {
          this.addEntryAssets('js', chunk);
        }
        let dependencies = this.getDependencies(chunk.getModules());
        for (let d of dependencies) {
          let chunkGroup = d.block?.chunkGroup;
          for (let key in this.assets.js) {
            if (
              chunkGroup &&
              !chunkGroup.chunks.find((ele) => `${ele.id}` === key) &&
              this.findDependencies(key, d.module)
            ) {
              let chunk = new Chunk();
              chunk.id = key;
              chunk.chunkReason = 'cdn';
              chunkGroup.chunks?.push(chunk);
              this.cdnJs[key] = this.assets.js[key];
            }
          }
        }
      }
    });
  };

  addCssTemplate = (compilation) => {
    compilation.mainTemplate.hooks.localVars.tap(PluginName, (source) => {
      return Template.asString([
        source,
        '',
        '// object to store loaded cdn CSS chunks',
        `var installedCdnCssChunks = {};`,
        `var cdnCss = typeof window !== "undefined" && window.__RUNTIME_IMPORT_CSS__ || ${JSON.stringify(
          this.cdnCss,
          null,
          '\t',
        )};`,
      ]);
    });

    compilation.mainTemplate.hooks.requireEnsure.tap(PluginName, (source) => {
      return Template.asString([
        source,
        `if(installedCdnCssChunks[chunkId]) promises.push(installedCdnCssChunks[chunkId]);`,
        `else if(installedCdnCssChunks[chunkId] !== 0 && cdnCss[chunkId]) {`,
        Template.indent([
          `promises.push(installedCdnCssChunks[chunkId] = Promise.all(cdnCss[chunkId].map(function(href) {`,
          Template.indent([
            `var fullhref = href;`,
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
              'linkTag.onload = resolve;',
              'linkTag.onerror = function(event) {',
              Template.indent([
                'var request = event && event.target && event.target.src || fullhref;',
                'var err = new Error("Loading CSS chunk " + chunkId + " failed.\\n(" + request + ")");',
                'err.code = "Cdn_CSS_CHUNK_LOAD_FAILED";',
                'err.request = request;',
                `delete installedCdnCssChunks[chunkId]`,
                'linkTag.parentNode.removeChild(linkTag)',
                'reject(err);',
              ]),
              '};',
              'linkTag.href = fullhref;',
              'document.head.appendChild(linkTag);',
            ]),
            `});`,
          ]),
          `})).then(function() {`,
          Template.indent([`installedCdnCssChunks[chunkId] = 0;`]),
          '}));',
        ]),
        '}',
      ]);
    });
  };

  addCssDependencies = (compilation) => {
    compilation.hooks.afterOptimizeDependencies.tap(PluginName, (modules) => {
      Object.entries(this.assets.css || {}).forEach(([key, val]) => {
        if (!this.installedCss[key]) {
          modules
            .filter((m) => m.issuer?.rawRequest === key)
            .forEach((m) => {
              //i don't know how to exclude it now, so, clear the content
              m.content = `/* cdn  ${val.url} */`;
              m.buildInfo?.assets == null;
              this.installedCss[key] = true;
            });
        }
      });
    });
    compilation.hooks.afterOptimizeChunkIds.tap(PluginName, () => {
      if (this.assets.css) {
        for (const chunk of compilation.chunks) {
          ((chunk) => {
            if (chunk.hasRuntime()) {
              this.addEntryAssets('css', chunk);
            }

            //find css map
            for (let c of chunk.getAllAsyncChunks()) {
              Object.entries(this.assets.css).forEach(([key, val]) => {
                if (!this.cdnCss[c.id]?.includes(val.url)) {
                  for (let m of c.modulesIterable) {
                    if (
                      m.type === 'css/mini-extract' &&
                      m.issuer.rawRequest === key
                    ) {
                      this.cdnCss[c.id] = (this.cdnCss[c.id] || []).concat([
                        val.url,
                      ]);
                    }
                  }
                }
              });
            }
          })(chunk);
        }
      }
    });
  };

  apply(compiler) {
    compiler.hooks.compilation.tap(PluginName, (compilation) => {
      this.addJsTemplate(compiler, compilation);
      this.addJsDependencies(compilation);

      this.addCssTemplate(compilation);
      this.addCssDependencies(compilation);
    });
  }
};
