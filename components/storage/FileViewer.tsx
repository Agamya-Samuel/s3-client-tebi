'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, RefreshCw, Lock } from 'lucide-react';
import { StorageItem } from '@/types/storage';
import * as storageActions from '@/app/actions/storage';
import { toast } from '@/hooks/use-toast';

interface FileViewerProps {
	item: StorageItem;
	isOpen: boolean;
	onClose: () => void;
}

interface FileError {
	message: string;
	code?: string;
	status?: number;
}

export function FileViewer({ item, isOpen, onClose }: FileViewerProps) {
	const [fileUrl, setFileUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [retryCount, setRetryCount] = useState(0);
	const [retryTimeout, setRetryTimeout] = useState<NodeJS.Timeout | null>(
		null
	);
	const [hasLoadedSuccessfully, setHasLoadedSuccessfully] = useState(false);
	const [isForbidden, setIsForbidden] = useState(false);

	// Function to load or refresh the file URL
	const loadFileUrl = useCallback(
		async (isRetry = false) => {
			try {
				setLoading(true);
				const url = await storageActions.getFileUrl(item.Key);
				setFileUrl(url);
				setRetryCount(0);
				setHasLoadedSuccessfully(true);
				setIsForbidden(false);
				if (retryTimeout) {
					clearTimeout(retryTimeout);
					setRetryTimeout(null);
				}
			} catch (error: unknown) {
				console.error('Error loading file:', error);
				const fileError = error as FileError;
				const isForbiddenError =
					fileError.message?.toLowerCase().includes('forbidden') ||
					fileError.message?.toLowerCase().includes('access denied');

				if (isForbiddenError) {
					setIsForbidden(true);
					toast({
						title: 'Access Denied',
						description:
							'You do not have permission to access this file.',
						variant: 'destructive',
					});
				} else {
					const timeout = setTimeout(() => {
						setRetryCount((prev) => prev + 1);
						void loadFileUrl(true);
					}, 3000);
					setRetryTimeout(timeout);

					if (isRetry) {
						toast({
							title: 'Retrying...',
							description: `Attempt ${
								retryCount + 1
							}. Retrying in 3 seconds...`,
							duration: 2000,
						});
					}
				}
			} finally {
				setLoading(false);
			}
		},
		[item.Key, retryCount, retryTimeout]
	);

	// Handle errors for images and PDFs
	const handleError = () => {
		if (!hasLoadedSuccessfully && !isForbidden) {
			void loadFileUrl();
		}
	};

	// Load URL when dialog opens
	useEffect(() => {
		if (isOpen) {
			setHasLoadedSuccessfully(false);
			setIsForbidden(false);
			void loadFileUrl();
		} else {
			setFileUrl(null);
			setRetryCount(0);
			setHasLoadedSuccessfully(false);
			setIsForbidden(false);
			if (retryTimeout) {
				clearTimeout(retryTimeout);
				setRetryTimeout(null);
			}
		}

		return () => {
			if (retryTimeout) {
				clearTimeout(retryTimeout);
			}
		};
	}, [isOpen, loadFileUrl, retryTimeout]);

	const handleDownload = async () => {
		try {
			const url = await storageActions.getFileUrl(item.Key);
			const link = document.createElement('a');
			link.href = url;
			link.download = item.Key.split('/').pop() || item.Key;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} catch (error: unknown) {
			const fileError = error as FileError;
			toast({
				title: 'Download Failed',
				description: fileError.message || 'Failed to download file',
				variant: 'destructive',
			});
		}
	};

	const renderContent = () => {
		if (!fileUrl) return null;

		const fileName = item.Key.split('/').pop()?.toLowerCase() || '';
		const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
		const isVideo = /\.(mp4|webm|ogg)$/i.test(fileName);
		const isAudio = /\.(mp3|wav|ogg)$/i.test(fileName);
		const isPDF = /\.pdf$/i.test(fileName);

		if (isImage) {
			return (
				<div className="relative flex items-center justify-center w-full h-[70vh] bg-gray-50 rounded-lg border border-blue-200">
					{loading ? (
						<div className="flex flex-col items-center justify-center gap-2">
							<Loader2 className="h-8 w-8 animate-spin text-blue-600" />
							<p className="text-sm text-blue-600">
								Loading image...
							</p>
						</div>
					) : (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={fileUrl}
							alt={fileName}
							className="max-h-full max-w-full object-contain"
							loading="lazy"
							onError={handleError}
							onLoad={() => setHasLoadedSuccessfully(true)}
						/>
					)}
				</div>
			);
		}

		if (isVideo) {
			return (
				<video controls className="max-w-full max-h-[70vh]">
					<source
						src={fileUrl}
						type={`video/${fileName.split('.').pop()}`}
					/>
					Your browser does not support the video tag.
				</video>
			);
		}

		if (isAudio) {
			return (
				<audio controls className="w-full">
					<source
						src={fileUrl}
						type={`audio/${fileName.split('.').pop()}`}
					/>
					Your browser does not support the audio tag.
				</audio>
			);
		}

		if (isPDF) {
			return (
				<div className="flex flex-col items-center gap-4">
					<div className="w-full h-[70vh] relative">
						<object
							data={fileUrl}
							type="application/pdf"
							className="w-full h-full"
							onError={handleError}
							onLoad={() => setHasLoadedSuccessfully(true)}
						>
							<div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 rounded-lg border border-blue-200">
								<p className="text-blue-600 mb-4">
									PDF preview not available
								</p>
								<Button
									onClick={handleDownload}
									className="bg-blue-600 hover:bg-blue-700"
								>
									<Download className="h-4 w-4 mr-2" />
									Download PDF
								</Button>
							</div>
						</object>
					</div>
					{!hasLoadedSuccessfully && (
						<div className="flex gap-2">
							<Button
								onClick={() => loadFileUrl()}
								variant="outline"
								className="border-blue-200 hover:bg-blue-50 hover:text-blue-600"
							>
								<RefreshCw className="h-4 w-4 mr-2" />
								Refresh PDF
							</Button>
							<Button
								onClick={handleDownload}
								variant="outline"
								className="border-blue-200 hover:bg-blue-50 hover:text-blue-600"
							>
								<Download className="h-4 w-4 mr-2" />
								Download PDF
							</Button>
						</div>
					)}
				</div>
			);
		}

		// For other file types, show download button
		return (
			<div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border border-blue-200">
				<p className="text-lg font-medium text-blue-900 mb-4">
					Preview not available for this file type
				</p>
				<Button
					onClick={handleDownload}
					className="bg-blue-600 hover:bg-blue-700"
				>
					<Download className="h-4 w-4 mr-2" />
					Download File
				</Button>
			</div>
		);
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-[90vw] max-h-[90vh] border-blue-200">
				<DialogTitle className="text-xl font-semibold text-blue-900 flex items-center gap-2">
					{item.Key.split('/').pop() || item.Key}
					{!item.isPublic && (
						<Lock
							className="h-4 w-4 text-blue-600"
							aria-label="Private file"
						/>
					)}
				</DialogTitle>
				<div className="flex items-center justify-end mb-4 gap-2">
					{!hasLoadedSuccessfully &&
						!isForbidden &&
						retryCount > 0 && (
							<Button
								onClick={() => loadFileUrl()}
								variant="outline"
								className="border-blue-200 hover:bg-blue-50 hover:text-blue-600"
							>
								<RefreshCw className="h-4 w-4 mr-2" />
								Retry Now
							</Button>
						)}
					<Button
						onClick={handleDownload}
						variant="outline"
						className="border-blue-200 hover:bg-blue-50 hover:text-blue-600"
					>
						<Download className="h-4 w-4 mr-2" />
						Download
					</Button>
				</div>
				{loading ? (
					<div className="flex flex-col items-center justify-center p-4 gap-2">
						<Loader2 className="h-8 w-8 animate-spin text-blue-600" />
						{retryCount > 0 && !isForbidden && (
							<p className="text-sm text-blue-600">
								Retrying... Attempt {retryCount}
							</p>
						)}
					</div>
				) : isForbidden ? (
					<div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border border-red-200">
						<Lock className="h-12 w-12 text-red-600 mb-4" />
						<p className="text-lg font-medium text-red-900 mb-2">
							Access Denied
						</p>
						<p className="text-sm text-red-600 text-center">
							You do not have permission to view this file.
						</p>
					</div>
				) : (
					<div>{renderContent()}</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
