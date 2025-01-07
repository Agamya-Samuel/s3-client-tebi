'use client';

import { useState, useEffect, useRef } from 'react';
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

export function FileViewer({ item, isOpen, onClose }: FileViewerProps) {
	const [fileUrl, setFileUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [retryCount, setRetryCount] = useState(0);
	const [retryTimeout, setRetryTimeout] = useState<NodeJS.Timeout | null>(
		null
	);
	const [hasLoadedSuccessfully, setHasLoadedSuccessfully] = useState(false);
	const [isForbidden, setIsForbidden] = useState(false);
	const objectRef = useRef<HTMLObjectElement>(null);

	// Function to load or refresh the file URL
	const loadFileUrl = async (isRetry = false) => {
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
		} catch (error: any) {
			console.error('Error loading file:', error);
			// Check if the error is a forbidden/access denied error
			const isForbiddenError =
				error?.message?.toLowerCase().includes('forbidden') ||
				error?.message?.toLowerCase().includes('access denied');

			if (isForbiddenError) {
				setIsForbidden(true);
				toast({
					title: 'Access Denied',
					description:
						'You do not have permission to access this file.',
					variant: 'destructive',
				});
			} else {
				// For other errors, keep retrying
				const timeout = setTimeout(() => {
					setRetryCount((prev) => prev + 1);
					loadFileUrl(true);
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
	};

	// Handle errors for images and PDFs
	const handleError = () => {
		if (!hasLoadedSuccessfully && !isForbidden) {
			loadFileUrl();
		}
	};

	// Load URL when dialog opens
	useEffect(() => {
		if (isOpen) {
			setHasLoadedSuccessfully(false);
			setIsForbidden(false);
			loadFileUrl();
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
	}, [isOpen, item.Key]);

	const handleDownload = async () => {
		try {
			const url = await storageActions.getFileUrl(item.Key);
			const link = document.createElement('a');
			link.href = url;
			link.download = item.Key.split('/').pop() || 'download';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} catch (error) {
			console.error('Error downloading file:', error);
			toast({
				title: 'Error',
				description: 'Failed to download file',
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
							ref={objectRef}
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

		return (
			<div className="text-center p-4">
				<p className="mb-4">This file type cannot be previewed.</p>
				<Button
					onClick={handleDownload}
					className="bg-blue-600 hover:bg-blue-700"
				>
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
							title="Private file"
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
