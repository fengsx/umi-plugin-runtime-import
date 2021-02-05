import { IScriptConfig } from '@umijs/types';
// ref:
// - https://umijs.org/plugins/api
import { IApi } from '@umijs/types';
import { getStyles, getScripts, IHTMLTag } from './utils';
import dynamicImportFromCDNPlugin from './dynamicImportFromCDNPlugin';

export default function (api: IApi) {
  api.describe({
    key: 'dynamicImportFromCDN',
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
    memo.plugin('dynamicImportFromCDNPlugin').use(dynamicImportFromCDNPlugin, [
      {
        assets: api.userConfig.dynamicImportFromCDN,
        getGlobalCdn: (type, addon) => {
          if (type === 'js') {
            scripts = getScripts(Object.values(addon));
          }
          if (type === 'css') {
            [links, styles] = getStyles(Object.values(addon));
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
