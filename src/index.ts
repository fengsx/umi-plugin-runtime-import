import { lodash } from '@umijs/utils';
import { getStyles, getScripts, IHTMLTag, formatOpt } from './utils';
import type { IScriptConfig, IApi } from '@umijs/types';

export default function (api: IApi) {
  api.describe({
    key: 'runtimeImport',
    config: {
      default: {},
      schema(joi) {
        return joi.object({
          base: joi.string(),
          js: joi
            .object()
            .unknown(true)
            .pattern(
              joi.any(),
              joi.object({
                moduleName: joi.string().required(),
                url: joi.string().required(),
                base: joi.string(),
              }),
            ),
          css: joi
            .object()
            .unknown(true)
            .pattern(joi.string(), [
              joi.string(),
              joi.object({
                url: joi.string().required(),
                base: joi.string(),
              }),
            ]),
        });
      },
      onChange: api.ConfigChangeType.regenerateTmpFiles,
    },
    enableBy: api.EnableBy.config,
  });

  let scripts: IScriptConfig = [];
  let links: IHTMLTag[] = [];

  api.chainWebpack((memo, args) => {
    const assets = formatOpt(api.config?.runtimeImport || {});
    if ((args.webpack as any)?.isWebpack5) {
      memo.module
        .rule('mjs-rule')
        .test(/.m?js/)
        .resolve.set('fullySpecified', false);
      scripts = getScripts(
        lodash.uniq(Object.values(assets.js || {}).map((script) => script.url)),
      );
      [links] = getStyles(
        lodash.uniq(Object.values(assets.css || {}).map((link) => link.url)),
      );
    } else {
      memo.plugin('RuntimeImportPlugin').use(require('./runtimeImport'), [
        {
          assets,
          getGlobalCdn: ((type, addon) => {
            const set = Object.values(addon);
            if (type === 'js') {
              scripts = getScripts(set);
            }
            if (type === 'css') {
              [links] = getStyles(set);
            }
          }) as PluginType['getGlobalCdn'],
        },
      ]);
    }
    return memo;
  });

  api.modifyConfig((memo) => {
    const externals = memo.externals || {};

    let assets: CdnOptType = memo?.runtimeImport || {};

    Object.entries(assets.js || {}).forEach(([key, value]) => {
      externals[key] = `var ${value.moduleName}`;
    });

    return {
      ...memo,
      externals,
    };
  });

  api.addHTMLScripts(() =>
    lodash.uniqBy(scripts, (script) =>
      typeof script === 'string' ? script : script.src,
    ),
  );
  api.addHTMLLinks(() => lodash.uniq(links));
}
