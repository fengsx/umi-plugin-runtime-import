export default [
  {
    target: 'node',
    cjs: { type: 'babel', lazy: true },
    esm: { type: 'babel' },
    disableTypeCheck: true,
  },
];
