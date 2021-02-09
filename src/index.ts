import { IScriptConfig } from '@umijs/types';
// ref:
// - https://umijs.org/plugins/api
import { IApi } from '@umijs/types';
import { uniq } from 'lodash';
import { getStyles, getScripts, IHTMLTag } from './utils';
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
    },
    enableBy: api.EnableBy.config,
  });

  let scripts: IScriptConfig = [];
  let links: IHTMLTag[] = [];
  let styles: IHTMLTag[] = [];
  api.chainWebpack((memo) => {
    memo.plugin('RuntimeImportPlugin').use(RuntimeImportPlugin, [
      {
        assets: api.userConfig.runtimeImport,
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

  api.addHTMLScripts(() => scripts);
  api.addHTMLLinks(() => links);
  api.addHTMLStyles(() => styles);
}
