import { lodash } from '@umijs/utils';
import { getStyles, getScripts, IHTMLTag, formatOpt } from './utils';
import type { IScriptConfig, IApi } from '@umijs/types';
import RuntimeImportPlugin from './runtimeImport';

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

  api.chainWebpack((memo) => {
    memo.plugin('RuntimeImportPlugin').use(RuntimeImportPlugin, [
      {
        assets: formatOpt(api.config?.runtimeImport || {}),
        getGlobalCdn: (type, addon) => {
          const set = lodash.uniq(Object.values(addon));
          if (type === 'js') {
            scripts = getScripts(set);
          }
          if (type === 'css') {
            [links] = getStyles(set);
          }
        },
      },
    ]);
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

  api.addHTMLScripts(() => scripts);
  api.addHTMLLinks(() => links);
}
