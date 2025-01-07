import { NextResponse } from 'next/server';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

const s3Client = new S3Client({
	region: process.env.TEBI_REGION || 'global',
	endpoint: process.env.TEBI_ENDPOINT || 'https://s3.tebi.io',
	credentials: {
		accessKeyId: process.env.TEBI_ACCESS_KEY!,
		secretAccessKey: process.env.TEBI_SECRET_KEY!,
	},
});

// Increased size limit to 5GB
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024;

export async function POST(request: Request) {
	try {
		const { fileName, fileType, path } = await request.json();
		const key = `${path}${fileName}`;

		const { url, fields } = await createPresignedPost(s3Client, {
			Bucket: process.env.TEBI_BUCKET_NAME!,
			Key: key,
			Conditions: [
				['content-length-range', 0, MAX_FILE_SIZE], // up to 5GB
				['starts-with', '$key', path], // Ensure uploads are within the specified path
			],
			Fields: {
				'Content-Type': fileType,
				success_action_status: '201',
				key: key,
			},
			Expires: 3600, // 1 hour
		});

		return NextResponse.json({ url, fields });
	} catch (error) {
		console.error('Error generating presigned URL:', error);
		return NextResponse.json(
			{ error: 'Failed to generate presigned URL' },
			{ status: 500 }
		);
	}
}
