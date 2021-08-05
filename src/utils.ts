// come from https://github.com/umijs/umi/blob/master/packages/preset-built-in/src/plugins/features/html/utils.ts
import { lodash } from '@umijs/utils';
import { IScriptConfig, IStyleConfig } from '@umijs/types';

export interface IHTMLTag {
  [key: string]: string;
}

const EXP_URL = /^(http:|https:)?\/\//;

/**
 * 格式化 script => object
 * @param option Array<string | IScript>
 */
export const getScripts = (option: IScriptConfig): IScriptConfig => {
  if (Array.isArray(option) && option.length > 0) {
    return option
      .filter((script) => !lodash.isEmpty(script))
      .map((aScript) => {
        if (typeof aScript === 'string') {
          return EXP_URL.test(aScript)
            ? { src: aScript }
            : { content: aScript };
        }
        // [{ content: '', async: true, crossOrigin: true }]
        return aScript;
      });
  }
  return [];
};

/**
 * 格式化 styles => [linkObject, styleObject]
 * @param option Array<string | ILink>
 */
export const getStyles = (option: IStyleConfig): [IHTMLTag[], IHTMLTag[]] => {
  const linkArr: IHTMLTag[] = [];
  const styleObj: IHTMLTag[] = [];
  if (Array.isArray(option) && option.length > 0) {
    option.forEach((style) => {
      if (typeof style === 'string') {
        if (EXP_URL.test(style)) {
          // is <link />
          linkArr.push({
            charset: 'utf-8',
            rel: 'stylesheet',
            type: 'text/css',
            href: style,
          });
        } else {
          styleObj.push({
            content: style,
          });
        }
      }
      if (typeof style === 'object') {
        // is style object
        styleObj.push(style);
      }
    });
  }
  return [linkArr, styleObj];
};

export const formatUrl = (
  item: string | CssAssetsType | JsAssetsType,
  base?: string,
) => {
  if (typeof item === 'string') {
    return base ? new URL(item, base).toString() : item;
  }
  return item.base || base
    ? new URL(item.url, item.base || base).toString()
    : item.url;
};

export const formatOpt = (assets: AssetsType): FormattedOptType => {
  const cdnJs: FormattedOptType['js'] = {};
  const cdnCss: FormattedOptType['css'] = {};

  Object.entries(assets.js || {}).forEach(([key, item]) => {
    if (item) {
      cdnJs[key] = {
        ...item,
        url: formatUrl(item, assets.base),
      };
    }
  });

  Object.entries(assets.css || {}).forEach(([key, item]) => {
    if (typeof item === 'string') {
      cdnCss[key] = {
        url: formatUrl(item, assets.base),
      };
    } else if (item) {
      cdnCss[key] = {
        ...item,
        url: formatUrl(item, assets.base),
      };
    }
  });

  return { js: cdnJs, css: cdnCss };
};
