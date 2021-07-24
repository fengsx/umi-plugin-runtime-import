declare module '*.css';
declare module '*.less';
declare module '*.png';
declare module '*.svg' {
  export function ReactComponent(
    props: React.SVGProps<SVGSVGElement>,
  ): React.ReactElement;
  const url: string;
  export default url;
}

type CdnOptPublicType = {
  url: string;
  base?: string;
};
type CssOptType = CdnOptPublicType;

type JsOptType = {
  moduleName: string;
} & CdnOptPublicType;

type CdnOptType = {
  base?: string;
  css?: {
    [key: string]: string | CssOptType;
  };
  js?: {
    [key: string]: JsOptType;
  };
};

type StringType = {
  [key: string]: string;
};

type FormattedCdnOptType = {
  base?: string;
  css?: {
    [key: string]: CssOptType;
  };
  js?: {
    [key: string]: JsOptType;
  };
};

type PluginType = {
  assets: FormattedCdnOptType;
  getGlobalCdn: (type: 'css' | 'js', arg: StringType) => void;
};
