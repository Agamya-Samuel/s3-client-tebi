'use server';

import {
	S3Client,
	ListObjectsV2Command,
	PutObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	CopyObjectCommand,
	PutObjectAclCommand,
	GetObjectAclCommand,
	_Object,
	CommonPrefix,
	CreateMultipartUploadCommand,
	UploadPartCommand,
	CompleteMultipartUploadCommand,
	AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import SparkMD5 from 'spark-md5';
import {
	StorageItem,
	UploadResponse,
	DeleteResponse,
	ListResponse,
	PermissionResponse,
} from '@/types/storage';

const s3Client = new S3Client({
	region: process.env.TEBI_REGION || 'global',
	endpoint: process.env.TEBI_ENDPOINT || 'https://s3.tebi.io',
	credentials: {
		accessKeyId: process.env.TEBI_ACCESS_KEY || '',
		secretAccessKey: process.env.TEBI_SECRET_KEY || '',
	},
});

const BUCKET_NAME = process.env.TEBI_BUCKET_NAME || '';

// Size threshold for using multipart upload (5MB)
const MULTIPART_THRESHOLD = 5 * 1024 * 1024; // 5MB threshold for multipart upload
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunk size
const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB max file size

export async function listItems(prefix: string = ''): Promise<ListResponse> {
	try {
		const command = new ListObjectsV2Command({
			Bucket: BUCKET_NAME,
			Prefix: prefix,
			Delimiter: '/',
		});

		const response = await s3Client.send(command);

		// Process folders (CommonPrefixes)
		const folders: StorageItem[] = (response.CommonPrefixes || []).map(
			(prefix: CommonPrefix) => ({
				Key: prefix.Prefix || '',
				LastModified: new Date(),
				Size: 0,
				Type: 'folder' as const,
				isPublic: false,
			})
		);

		// Process files (Contents) and get their ACL information
		const files: StorageItem[] = await Promise.all(
			(response.Contents || [])
				.filter((item: _Object) => item.Key !== prefix)
				.map(async (item: _Object) => {
					let isPublic = false;
					try {
						const aclResponse = await getFilePermissions(
							item.Key || ''
						);
						isPublic = aclResponse.isPublic;
					} catch (error) {
						console.error(
							`Error getting ACL for ${item.Key}:`,
							error
						);
					}

					return {
						Key: item.Key || '',
						LastModified: item.LastModified || new Date(),
						Size: item.Size || 0,
						Type: 'file' as const,
						isPublic,
					};
				})
		);

		return {
			items: [...folders, ...files],
			prefix,
		};
	} catch (error) {
		console.error('Error listing objects:', error);
		throw new Error('Failed to list objects');
	}
}

// Function to get presigned URL for upload
export async function getUploadPresignedUrl(key: string): Promise<string> {
	try {
		const command = new PutObjectCommand({
			Bucket: BUCKET_NAME,
			Key: key,
		});

		const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
		return url;
	} catch (error) {
		console.error('Error generating upload URL:', error);
		throw new Error('Failed to generate upload URL');
	}
}

// Modified upload function to handle large files with multipart upload
export async function uploadFile(
	file: File,
	key: string
): Promise<UploadResponse> {
	try {
		if (file.size > MAX_FILE_SIZE) {
			throw new Error('File size exceeds maximum limit of 10GB');
		}

		if (file.size <= MULTIPART_THRESHOLD) {
			// For small files, use single presigned URL
			const presignedUrl = await getUploadPresignedUrl(key);
			const response = await fetch(presignedUrl, {
				method: 'PUT',
				body: file,
				headers: {
					'Content-Type': file.type,
				},
			});

			if (!response.ok) {
				throw new Error('Failed to upload file using presigned URL');
			}
		} else {
			// For large files, use multipart upload with presigned URLs
			const createCommand = new CreateMultipartUploadCommand({
				Bucket: BUCKET_NAME,
				Key: key,
				ContentType: file.type,
			});

			const { UploadId } = await s3Client.send(createCommand);
			if (!UploadId)
				throw new Error('Failed to initiate multipart upload');

			try {
				const parts = [];
				const chunks = Math.ceil(file.size / CHUNK_SIZE);

				for (let i = 0; i < chunks; i++) {
					const start = i * CHUNK_SIZE;
					const end = Math.min(start + CHUNK_SIZE, file.size);
					const chunk = file.slice(start, end);
					const partNumber = i + 1;

					// Calculate MD5 hash using SparkMD5
					const arrayBuffer = await chunk.arrayBuffer();
					const spark = new SparkMD5.ArrayBuffer();
					spark.append(arrayBuffer);
					const md5Hash = btoa(spark.end(true));

					// Get presigned URL for this part
					const command = new UploadPartCommand({
						Bucket: BUCKET_NAME,
						Key: key,
						UploadId,
						PartNumber: partNumber,
						ContentMD5: md5Hash,
					});

					const presignedUrl = await getSignedUrl(s3Client, command, {
						expiresIn: 3600,
					});

					// Upload the part using presigned URL
					const response = await fetch(presignedUrl, {
						method: 'PUT',
						body: chunk,
						headers: {
							'Content-MD5': md5Hash,
						},
					});

					if (!response.ok) {
						throw new Error(
							`Failed to upload part ${partNumber}: ${response.statusText}`
						);
					}

					const ETag = response.headers.get('ETag');
					if (!ETag) {
						throw new Error(
							`No ETag received for part ${partNumber}`
						);
					}

					parts.push({
						ETag: ETag.replace(/['"]/g, ''),
						PartNumber: partNumber,
					});
				}

				// Complete the multipart upload
				const completeCommand = new CompleteMultipartUploadCommand({
					Bucket: BUCKET_NAME,
					Key: key,
					UploadId,
					MultipartUpload: { Parts: parts },
				});

				await s3Client.send(completeCommand);
			} catch (error) {
				// Abort the multipart upload if something goes wrong
				const abortCommand = new AbortMultipartUploadCommand({
					Bucket: BUCKET_NAME,
					Key: key,
					UploadId,
				});
				await s3Client.send(abortCommand);
				throw error;
			}
		}

		return {
			success: true,
			message: 'File uploaded successfully',
			key,
		};
	} catch (error) {
		console.error('Error uploading file:', error);
		throw error;
	}
}

export async function deleteItem(key: string): Promise<DeleteResponse> {
	try {
		// Check if this is a folder by checking if it ends with '/'
		const isFolder = key.endsWith('/');

		if (isFolder) {
			// List all objects in the folder
			const command = new ListObjectsV2Command({
				Bucket: BUCKET_NAME,
				Prefix: key,
			});

			const response = await s3Client.send(command);
			const objects = response.Contents || [];

			// Delete all objects in the folder
			for (const object of objects) {
				if (object.Key) {
					const deleteCommand = new DeleteObjectCommand({
						Bucket: BUCKET_NAME,
						Key: object.Key,
					});
					await s3Client.send(deleteCommand);
				}
			}

			// Delete the folder marker itself
			const deleteFolderCommand = new DeleteObjectCommand({
				Bucket: BUCKET_NAME,
				Key: key,
			});
			await s3Client.send(deleteFolderCommand);
		} else {
			// For single file deletion
			const command = new DeleteObjectCommand({
				Bucket: BUCKET_NAME,
				Key: key,
			});
			await s3Client.send(command);
		}

		return {
			success: true,
			message: 'Item deleted successfully',
		};
	} catch (error) {
		console.error('Error deleting object:', error);
		throw new Error('Failed to delete object');
	}
}

export async function createFolder(path: string): Promise<UploadResponse> {
	try {
		const folderPath = path.endsWith('/') ? path : `${path}/`;

		const command = new PutObjectCommand({
			Bucket: BUCKET_NAME,
			Key: folderPath,
			Body: '',
		});

		await s3Client.send(command);

		return {
			success: true,
			message: 'Folder created successfully',
			key: folderPath,
		};
	} catch (error) {
		console.error('Error creating folder:', error);
		throw new Error('Failed to create folder');
	}
}

export async function getFileUrl(key: string): Promise<string> {
	try {
		// Check if the file is public
		const { isPublic } = await getFilePermissions(key);

		if (isPublic) {
			// For public files, return a direct URL
			return `${process.env.TEBI_ENDPOINT}/${BUCKET_NAME}/${key}`;
		}

		// For private files, generate a presigned URL that expires in 1 hour
		const command = new GetObjectCommand({
			Bucket: BUCKET_NAME,
			Key: key,
		});

		const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
		return url;
	} catch (error) {
		console.error('Error generating file URL:', error);
		throw new Error('Failed to generate file URL');
	}
}

export async function renameItem(oldPath: string, newPath: string) {
	try {
		// Copy the object to the new location
		await s3Client.send(
			new CopyObjectCommand({
				Bucket: process.env.TEBI_BUCKET_NAME!,
				CopySource: `${process.env.TEBI_BUCKET_NAME}/${oldPath}`,
				Key: newPath,
			})
		);

		// Delete the old object
		await s3Client.send(
			new DeleteObjectCommand({
				Bucket: process.env.TEBI_BUCKET_NAME!,
				Key: oldPath,
			})
		);

		return {
			success: true,
			message: 'Item renamed successfully',
		};
	} catch (error) {
		console.error('Error renaming item:', error);
		throw error;
	}
}

export async function setFilePermission(
	key: string,
	isPublic: boolean
): Promise<PermissionResponse> {
	try {
		const command = new PutObjectAclCommand({
			Bucket: BUCKET_NAME,
			Key: key,
			ACL: isPublic ? 'public-read' : 'private',
		});

		await s3Client.send(command);

		// Get the updated ACL to confirm the change
		const aclResponse = await getFilePermissions(key);

		return {
			success: true,
			message: `File is now ${isPublic ? 'public' : 'private'}`,
			isPublic: aclResponse.isPublic,
		};
	} catch (error) {
		console.error('Error setting file permission:', error);
		throw new Error('Failed to update file permission');
	}
}

export async function getFilePermissions(
	key: string
): Promise<{ isPublic: boolean }> {
	try {
		const command = new GetObjectAclCommand({
			Bucket: BUCKET_NAME,
			Key: key,
		});

		const response = await s3Client.send(command);

		// Check if there's a grant for AllUsers with READ permission
		const isPublic =
			response.Grants?.some(
				(grant) =>
					grant.Grantee?.Type === 'Group' &&
					grant.Grantee.URI ===
						'http://acs.amazonaws.com/groups/global/AllUsers' &&
					grant.Permission === 'READ'
			) || false;

		return { isPublic };
	} catch (error) {
		console.error('Error getting file permissions:', error);
		throw new Error('Failed to get file permissions');
	}
}
