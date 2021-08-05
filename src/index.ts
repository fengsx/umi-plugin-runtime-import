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
    if (!!args.mfsu) {
      return memo;
    }
    const RuntimeImportPlugin = (args.webpack as any)?.isWebpack5
      ? require('./webpack5')
      : require('./webpack4');

    memo.plugin('RuntimeImportPlugin').use(RuntimeImportPlugin, [
      {
        assets,
        getEntryAssets: ((type, addon) => {
          const set = Object.values(addon);
          if (type === 'js') {
            scripts = lodash.uniqBy(scripts.concat(getScripts(set)), (script) =>
              typeof script === 'string' ? script : script.src,
            );
          }
          if (type === 'css') {
            links = lodash.uniq(links.concat(getStyles(set)[0]));
          }
        }) as PluginType['getEntryAssets'],
      },
    ]);

    return memo;
  });

  api.modifyConfig((memo) => {
    if (!!memo.mfsu) {
      return memo;
    }
    const externals = memo.externals || {};

    let assets: AssetsType = memo?.runtimeImport || {};

    Object.entries(assets.js || {}).forEach(([key, value]) => {
      externals[key] = `var ${value.moduleName}`;
    });

    return {
      ...memo,
      externals,
    };
  });

  api.addHTMLScripts(() => scripts);
  api.addHTMLLinks(() => links);
}
