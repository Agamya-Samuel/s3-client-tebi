'use client';

import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadDropzoneProps {
	onDrop: (files: File[]) => Promise<void>;
}

export function UploadDropzone({ onDrop }: UploadDropzoneProps) {
	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		noClick: true,
		noDrag: false,
		noKeyboard: false,
		multiple: true,
		useFsAccessApi: false,
	});

	return (
		<div
			{...getRootProps()}
			className={cn(
				'border-2 border-dashed rounded-lg p-8 transition-colors',
				isDragActive
					? 'border-blue-600 bg-blue-50/50 backdrop-blur-sm'
					: 'border-blue-200 hover:border-blue-400',
				'flex flex-col items-center justify-center gap-4'
			)}
		>
			<Upload
				className={cn(
					'h-8 w-8',
					isDragActive ? 'text-blue-600' : 'text-blue-400'
				)}
			/>
			<div className="text-center">
				<p
					className={cn(
						'text-lg font-medium',
						isDragActive ? 'text-blue-600' : 'text-blue-400'
					)}
				>
					{isDragActive
						? 'Drop files here'
						: 'Drag and drop files here'}
				</p>
				<p className="text-sm text-blue-400 mt-1">
					or click the Upload Files button above
				</p>
			</div>
			<input {...getInputProps()} />
		</div>
	);
}
