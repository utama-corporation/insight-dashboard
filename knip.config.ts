import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  workspaces: {
    '.': {
      ignore: [
        'src/components/ui/**',
        'src/components/layout/app-title.tsx',
        'src/tanstack-table.d.ts',
      ],
    },
    server: {
      entry: ['src/index.ts'],
    },
  },
}

export default config
