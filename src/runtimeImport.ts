import { Template, Compiler } from 'webpack';
import type { Chunk as ChunkType, compilation } from 'webpack';
// @ts-ignore
import Chunk from 'webpack/lib/Chunk';

const PluginName = 'RuntimeImportPlugin';

type StringType = {
  [key: string]: string;
};

export type CdnOptPublicType = {
  url: string;
  base?: string;
};
export type CssOptType = CdnOptPublicType;

export type JsOptType = {
  moduleName: string;
} & CdnOptPublicType;

export type CdnOptType = {
  base?: string;
  css?: {
    [key: string]: string | CssOptType;
  };
  js?: {
    [key: string]: JsOptType;
  };
};

export type FormattedCdnOptType = {
  base?: string;
  css?: {
    [key: string]: CssOptType;
  };
  js?: {
    [key: string]: JsOptType;
  };
};

export type PluginType = {
  assets: CdnOptType;
  getGlobalCdn: (type: 'css' | 'js', arg: StringType) => void;
};

type Module = compilation.Module & {
  content?: string;
  issuer: compilation.Module & { rawRequest: string };
  source?: any;
  module?: Module;
  dependencies?: Module[];
  userRequest?: string;
  request?: string;
  blocks?: {
    dependencies: Module[];
  }[];
  block?: {
    chunkGroup: compilation.ChunkGroup;
  };
};

export default class RuntimeImportPlugin {
  assets: FormattedCdnOptType;

  installedCss: { [key: string]: boolean } = {};
  cdnCss: { [key: string]: string[] } = {};
  cdnJs: { [key: string]: JsOptType } = {};

  getGlobalCdn: PluginType['getGlobalCdn'] = () => null;

  constructor({ assets, getGlobalCdn }: PluginType) {
    this.assets = this.formatOpt(assets);
    this.getGlobalCdn = getGlobalCdn;
  }

  formatUrl = (item: string | CssOptType | JsOptType, base?: string) => {
    if (typeof item === 'string') {
      return base ? new URL(item, base).toString() : item;
    }
    return item.base || base
      ? new URL(item.url, item.base || base).toString()
      : item.url;
  };

  formatOpt = (assets: CdnOptType): FormattedCdnOptType => {
    const cdnJs: FormattedCdnOptType['js'] = {};
    const cdnCss: FormattedCdnOptType['css'] = {};

    Object.entries(assets.js || {}).forEach(([key, item]) => {
      if (item) {
        cdnJs[key] = {
          ...item,
          url: this.formatUrl(item, assets.base),
        };
      }
    });

    Object.entries(assets.css || {}).forEach(([key, item]) => {
      if (typeof item === 'string') {
        cdnCss[key] = {
          url: this.formatUrl(item, assets.base),
        };
      } else if (item) {
        cdnCss[key] = {
          ...item,
          url: this.formatUrl(item, assets.base),
        };
      }
    });

    return { js: cdnJs, css: cdnCss };
  };

  addGlobalCdn = (type: 'js' | 'css', chunk: ChunkType) => {
    const global: StringType = {};
    Object.entries(this.assets[type] || {}).forEach(([k, v]) => {
      if (!global[k] && this.findDependencies(k, chunk.entryModule as Module)) {
        global[k] = v.url;
      }
    });

    this.getGlobalCdn(type, global);
  };

  findDependencies = (
    dep: string,
    module?: Module,
    res: { [key: string]: boolean } = {},
  ): boolean => {
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

  getDependencies = (modules: Module[]): Module[] => {
    let dependencies: Module[] = [];
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

  addJsTemplate = (
    compiler: Compiler,
    compilation: compilation.Compilation,
  ) => {
    compilation.mainTemplate.hooks.localVars.tap(PluginName, (source) =>
      source.replace(`function jsonpScriptSrc(chunkId) {`, (searchValue) =>
        Template.asString([
          `var cdnJs = typeof window !== "undefined" && window.__RUNTIME_IMPORT__JS__ || ${JSON.stringify(
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
      // webpack 5 is using output.uniqueName instead jsonpFunction
      // @ts-ignore
      const { jsonpFunction, uniqueName } = compiler.options.output || {};
      const outputName = `window["${
        uniqueName || jsonpFunction || 'webpackJsonp'
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

  addJsDependencies = (compilation: compilation.Compilation) => {
    compilation.hooks.afterOptimizeChunks.tap(PluginName, (chunks) => {
      for (const chunk of chunks) {
        if (chunk.hasRuntime()) {
          this.addGlobalCdn('js', chunk);
        }
        let dependencies = this.getDependencies(chunk.getModules() as Module[]);
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

  addCssTemplate = (compilation: compilation.Compilation) => {
    compilation.mainTemplate.hooks.localVars.tap(PluginName, (source) => {
      return Template.asString([
        source,
        '',
        '// object to store loaded cdn CSS chunks',
        `var installedCdnCssChunks = {};`,
        `var cdnCss = typeof window !== "undefined" && window.__RUNTIME_IMPORT__CSS__ || ${JSON.stringify(
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

  addCssDependencies = (compilation: compilation.Compilation) => {
    compilation.hooks.afterOptimizeDependencies.tap(PluginName, (modules) => {
      Object.entries(this.assets.css || {}).forEach(([key, val]) => {
        if (!this.installedCss[key]) {
          (modules as Module[])
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
              this.addGlobalCdn('css', chunk);
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

  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap(PluginName, (compilation) => {
      this.addJsTemplate(compiler, compilation);
      this.addJsDependencies(compilation);

      this.addCssTemplate(compilation);
      this.addCssDependencies(compilation);
    });
  }
}
