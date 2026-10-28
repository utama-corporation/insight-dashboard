import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  ignoreDependencies: [
    '@hookform/resolvers',
    '@radix-ui/react-avatar',
    '@radix-ui/react-checkbox',
    '@radix-ui/react-icons',
    '@radix-ui/react-popover',
    '@radix-ui/react-radio-group',
    '@radix-ui/react-scroll-area',
    '@radix-ui/react-select',
    '@radix-ui/react-switch',
  ],
  workspaces: {
    '.': {
      ignore: [
        'src/components/ui/**',
        'src/tanstack-table.d.ts',
      ],
    },
    server: {
      entry: ['src/index.ts'],
    },
  },
}

export default config
