'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import * as storageActions from '@/app/actions/storage';

interface UploadProgress {
	fileName: string;
	progress: number;
}

export function useFileUpload() {
	const [isUploading, setIsUploading] = useState(false);
	const [uploadProgresses, setUploadProgresses] = useState<UploadProgress[]>(
		[]
	);
	const { toast } = useToast();

	const handleFileDrop = async (files: File[], targetFolder?: string) => {
		try {
			setIsUploading(true);
			setUploadProgresses(
				files.map((file) => ({ fileName: file.name, progress: 0 }))
			);

			// Group files by their folder structure
			const filesByFolder = new Map<string, File[]>();
			for (const file of files) {
				const relativePath = file.webkitRelativePath || file.name;
				const pathParts = relativePath.split('/');

				if (pathParts.length > 1) {
					// This is a file inside a folder
					const folderPath = pathParts.slice(0, -1).join('/') + '/';
					const existingFiles = filesByFolder.get(folderPath) || [];
					filesByFolder.set(folderPath, [...existingFiles, file]);
				} else {
					// This is a root file
					const existingFiles = filesByFolder.get('') || [];
					filesByFolder.set('', [...existingFiles, file]);
				}
			}

			// Create folders and upload files
			let fileIndex = 0;
			let successCount = 0;
			for (const [folderPath, folderFiles] of filesByFolder.entries()) {
				if (folderPath) {
					// Create the folder structure
					const basePath = targetFolder || '';
					const fullFolderPath = `${basePath}${folderPath}`;

					try {
						await storageActions.createFolder(fullFolderPath);
					} catch (error) {
						console.error(
							`Error creating folder ${fullFolderPath}:`,
							error
						);
						// Continue even if folder creation fails (might already exist)
					}
				}

				// Upload files in this folder
				for (const file of folderFiles) {
					try {
						const basePath = targetFolder || '';
						const key = folderPath
							? `${basePath}${folderPath}${file.name}`
							: `${basePath}${file.name}`;

						// Start with 0% progress
						setUploadProgresses((prev) =>
							prev.map((p, idx) =>
								idx === fileIndex ? { ...p, progress: 0 } : p
							)
						);

						await storageActions.uploadFile(file, key);
						successCount++;

						// Set to 100% when complete
						setUploadProgresses((prev) =>
							prev.map((p, idx) =>
								idx === fileIndex ? { ...p, progress: 100 } : p
							)
						);
					} catch (error: unknown) {
						toast({
							title: 'Error',
							description:
								error instanceof Error
									? error.message
									: `Failed to upload ${file.name}`,
							variant: 'destructive',
						});
					}
					fileIndex++;
				}
			}

			// Only show success toast if at least one file was uploaded successfully
			if (successCount > 0) {
				toast({
					title: 'Success',
					description:
						successCount === 1
							? 'File uploaded successfully'
							: `${successCount} files uploaded successfully`,
					variant: 'success',
				});
			}

			return successCount > 0;
		} catch (error: unknown) {
			toast({
				title: 'Error',
				description:
					error instanceof Error
						? error.message
						: 'Failed to upload files',
				variant: 'destructive',
			});
			return false;
		} finally {
			setIsUploading(false);
			setUploadProgresses([]);
		}
	};

	return {
		isUploading,
		uploadProgresses,
		handleFileDrop,
	};
}
