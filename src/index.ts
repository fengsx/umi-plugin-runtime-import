import { IScriptConfig } from '@umijs/types';
import { IApi } from '@umijs/types';
import { uniq } from 'lodash';
import { getStyles, getScripts, IHTMLTag } from './utils';
import RuntimeImportPlugin from './runtimeImport';
import type { CdnOptType } from './runtimeImport';

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
  let styles: IHTMLTag[] = [];
  let assets: CdnOptType = api.userConfig.runtimeImport;

  api.chainWebpack((memo) => {
    memo.plugin('RuntimeImportPlugin').use(RuntimeImportPlugin, [
      {
        assets,
        getGlobalCdn: (type, addon) => {
          const set = uniq(Object.values(addon));
          if (type === 'js') {
            scripts = getScripts(set);
          }
          if (type === 'css') {
            [links, styles] = getStyles(set);
          }
        },
      },
    ]);
    return memo;
  });

  api.modifyConfig((memo) => {
    const externals = memo.externals || {};

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
  api.addHTMLStyles(() => styles);
}
