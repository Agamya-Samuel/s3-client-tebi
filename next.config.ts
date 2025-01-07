import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: '*.tebi.io',
			},
		],
	},
	experimental: {
		serverActions: {
			bodySizeLimit: '5mb',
		},
	},
};

export default nextConfig;
