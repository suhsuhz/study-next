import type { NextConfig } from 'next';
import createMDX from '@next/mdx';
import remarkGfm from 'remark-gfm';

const nextConfig: NextConfig = {
    /* config options here */
    // experimental: {
    //   typedRoutes: true,
    // },
    images: {
        remotePatterns: [
            {
                hostname: 'picsum.photos',
            },
            {
                hostname: 'images.unsplash.com',
            },
            {
                hostname: 'prod-files-secure.s3.us-west-2.amazonaws.com',
            },
        ],
    },
    pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
};

// MDX 설정 (webpack 모드에서 사용, Turbopack은 플러그인 함수를 직렬화할 수 없음)
const withMDX = createMDX({
    // 필요한 마크다운 플러그인을 여기에 추가하세요
    options: {
        remarkPlugins: [remarkGfm],
    },
});

// MDX 설정을 Next.js 설정과 병합
export default withMDX(nextConfig);
