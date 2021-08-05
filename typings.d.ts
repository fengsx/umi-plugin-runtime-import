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

type BaseAssetsType = {
  url: string;
  base?: string;
};
type CssAssetsType = BaseAssetsType;

type JsAssetsType = {
  moduleName: string;
} & BaseAssetsType;

type AssetsType = {
  base?: string;
  css?: {
    [key: string]: string | CssAssetsType;
  };
  js?: {
    [key: string]: JsAssetsType;
  };
};

type StringType = {
  [key: string]: string;
};

type FormattedOptType = {
  base?: string;
  css?: {
    [key: string]: CssAssetsType;
  };
  js?: {
    [key: string]: JsAssetsType;
  };
};

type PluginType = {
  assets: FormattedOptType;
  getEntryAssets: (type: 'css' | 'js', arg: StringType) => void;
};
